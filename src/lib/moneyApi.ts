import type { SupabaseClient } from '@supabase/supabase-js'
import type { BudgetItem, Day, Expense } from '../types'
import { client } from './db'
import { budgetColumns, expenseColumns, type BudgetInput, type ExpenseInput } from './moneyData'

// Scritture e letture per budget, spese e tasso di cambio.

export function queryMoney(db: SupabaseClient) {
  return Promise.all([
    db.from('budget_items').select('*').is('deleted_at', null),
    db.from('budget_item_shares').select('*').is('deleted_at', null),
    db.from('expenses').select('*').is('deleted_at', null),
    db.from('expense_shares').select('*').is('deleted_at', null),
  ])
}

const now = () => new Date().toISOString()

/** Allinea le quote di una voce a quelle scelte nel modulo: aggiunge/aggiorna le scelte, toglie le altre. */
async function syncBudgetShares(tripId: string, itemId: string, input: BudgetInput) {
  const db = client()
  if (input.travelerIds.length > 0) {
    const rows = input.travelerIds.map((id) => {
      const paid = input.paidIds.includes(id)
      return { trip_id: tripId, budget_item_id: itemId, traveler_id: id, paid, paid_at: paid ? now() : null, deleted_at: null }
    })
    const up = await db.from('budget_item_shares').upsert(rows, { onConflict: 'budget_item_id,traveler_id' })
    if (up.error) throw up.error
  }
  let del = db.from('budget_item_shares').delete().eq('budget_item_id', itemId)
  if (input.travelerIds.length > 0) del = del.not('traveler_id', 'in', `(${input.travelerIds.join(',')})`)
  const res = await del
  if (res.error) throw res.error
}

async function syncExpenseShares(tripId: string, expenseId: string, travelerIds: string[]) {
  const db = client()
  if (travelerIds.length > 0) {
    const rows = travelerIds.map((id) => ({ trip_id: tripId, expense_id: expenseId, traveler_id: id, weight: 1, deleted_at: null }))
    const up = await db.from('expense_shares').upsert(rows, { onConflict: 'expense_id,traveler_id' })
    if (up.error) throw up.error
  }
  let del = db.from('expense_shares').delete().eq('expense_id', expenseId)
  if (travelerIds.length > 0) del = del.not('traveler_id', 'in', `(${travelerIds.join(',')})`)
  const res = await del
  if (res.error) throw res.error
}

// ---------- budget ----------

export async function createBudgetItem(tripId: string, input: BudgetInput): Promise<void> {
  const db = client()
  const { data, error } = await db.from('budget_items').insert({ trip_id: tripId, ...budgetColumns(input) }).select('id').single()
  if (error) throw error
  const id = (data as { id: string }).id
  try {
    await syncBudgetShares(tripId, id, input)
  } catch (e) {
    await db.from('budget_items').update({ deleted_at: now() }).eq('id', id) // niente voci a metà
    throw e
  }
}

export async function updateBudgetItem(item: BudgetItem, tripId: string, input: BudgetInput): Promise<void> {
  const db = client()
  const { error } = await db.from('budget_items').update(budgetColumns(input)).eq('id', item.id)
  if (error) throw error
  await syncBudgetShares(tripId, item.id, input)
}

export async function setBudgetSharePaid(shareId: string, paid: boolean): Promise<void> {
  const { error } = await client().from('budget_item_shares').update({ paid, paid_at: paid ? now() : null }).eq('id', shareId)
  if (error) throw error
}

export async function setBudgetItemDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await client().from('budget_items').update({ deleted_at: deleted ? now() : null }).eq('id', id)
  if (error) throw error
}

// ---------- spese ----------

export async function createExpense(tripId: string, input: ExpenseInput, timeZone: string, days: Pick<Day, 'id' | 'date'>[]): Promise<void> {
  const db = client()
  const { data, error } = await db.from('expenses').insert({ trip_id: tripId, ...expenseColumns(input, timeZone, days) }).select('id').single()
  if (error) throw error
  const id = (data as { id: string }).id
  try {
    await syncExpenseShares(tripId, id, input.travelerIds)
  } catch (e) {
    await db.from('expenses').update({ deleted_at: now() }).eq('id', id)
    throw e
  }
}

export async function updateExpense(expense: Expense, tripId: string, input: ExpenseInput, timeZone: string, days: Pick<Day, 'id' | 'date'>[]): Promise<void> {
  const { error } = await client().from('expenses').update(expenseColumns(input, timeZone, days)).eq('id', expense.id)
  if (error) throw error
  await syncExpenseShares(tripId, expense.id, input.travelerIds)
}

export async function setExpenseDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await client().from('expenses').update({ deleted_at: deleted ? now() : null }).eq('id', id)
  if (error) throw error
}

// ---------- cambio ----------

/** Salva il tasso del viaggio (richiede la migrazione 0002). `null` lo cancella. */
export async function setTripFxRate(tripId: string, rate: number | null): Promise<void> {
  const { error } = await client().from('trips').update({ fx_rate: rate }).eq('id', tripId)
  if (error) {
    if (/fx_rate/i.test(error.message)) {
      throw new Error('Manca la migrazione 0002 sul database: eseguila nell\'SQL Editor di Supabase (file supabase/migrations/0002_trip_fx.sql).')
    }
    throw error
  }
}

/** Tasso del giorno dalla BCE (Frankfurter): quante unità di `base` valgono 1 unità di `local`. */
export async function fetchFxRate(local: string, base: string): Promise<number> {
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(local)}&symbols=${encodeURIComponent(base)}`)
  if (!res.ok) throw new Error('Servizio dei cambi non raggiungibile. Scrivi il tasso a mano.')
  const json = (await res.json()) as { rates?: Record<string, number> }
  const rate = json.rates?.[base]
  if (!rate || !(rate > 0)) throw new Error(`Nessun tasso ${local}→${base} disponibile. Scrivilo a mano.`)
  return rate
}
