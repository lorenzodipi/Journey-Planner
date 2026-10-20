import type { SupabaseClient } from '@supabase/supabase-js'
import type { BudgetItem, Category } from '../types'
import { client } from './db'
import { budgetColumns, type BudgetInput } from './moneyData'
import { cleanRates } from './money'

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

// ---------- categorie di spesa ----------

const MIGRATION_0008 = 'Manca la migrazione 0008 sul database: eseguila nell\'SQL Editor di Supabase (file supabase/migrations/0008_expense_categories.sql).'
const needs0008 = (error: { message: string }) => (/expense_categories|category_id/i.test(error.message) ? new Error(MIGRATION_0008) : error)

/** Trova la categoria per nome (senza badare alle maiuscole) o la crea. Nome vuoto = nessuna categoria. */
export async function resolveExpenseCategory(tripId: string, label: string, known: Category[]): Promise<string | null> {
  const clean = label.trim()
  if (!clean) return null
  const hit = known.find((c) => c.label.toLowerCase() === clean.toLowerCase())
  if (hit) return hit.id
  const db = client()
  const { data, error } = await db
    .from('expense_categories')
    .insert({ trip_id: tripId, label: clean, position: (known.length + 1) * 1000 })
    .select('id')
    .single()
  if (!error) return (data as { id: string }).id
  // creata nel frattempo da un altro telefono: la recupero
  const found = await db.from('expense_categories').select('id').eq('trip_id', tripId).is('deleted_at', null).ilike('label', clean).limit(1)
  if (found.error || !found.data?.length) throw needs0008(error)
  return (found.data[0] as { id: string }).id
}

export async function createExpenseCategory(tripId: string, label: string, known: Category[]): Promise<void> {
  const clean = label.trim()
  if (!clean) throw new Error('Scrivi il nome della categoria.')
  if (known.some((c) => c.label.toLowerCase() === clean.toLowerCase())) throw new Error(`La categoria «${clean}» esiste già.`)
  await resolveExpenseCategory(tripId, clean, known)
}

export async function renameExpenseCategory(id: string, label: string, known: Category[]): Promise<void> {
  const clean = label.trim()
  if (!clean) throw new Error('Scrivi il nome della categoria.')
  if (known.some((c) => c.id !== id && c.label.toLowerCase() === clean.toLowerCase())) throw new Error(`Esiste già una categoria «${clean}».`)
  const { error } = await client().from('expense_categories').update({ label: clean }).eq('id', id)
  if (error) throw needs0008(error)
}

export async function setExpenseCategoryDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await client().from('expense_categories').update({ deleted_at: deleted ? now() : null }).eq('id', id)
  if (error) throw needs0008(error)
}

// ---------- budget ----------

export async function createBudgetItem(tripId: string, input: BudgetInput, known: Category[]): Promise<void> {
  const db = client()
  const categoryId = await resolveExpenseCategory(tripId, input.category, known)
  const { data, error } = await db.from('budget_items').insert({ trip_id: tripId, ...budgetColumns(input, categoryId) }).select('id').single()
  if (error) throw error
  const id = (data as { id: string }).id
  try {
    await syncBudgetShares(tripId, id, input)
  } catch (e) {
    await db.from('budget_items').update({ deleted_at: now() }).eq('id', id) // niente voci a metà
    throw e
  }
}

export async function updateBudgetItem(item: BudgetItem, tripId: string, input: BudgetInput, known: Category[]): Promise<void> {
  const db = client()
  const categoryId = await resolveExpenseCategory(tripId, input.category, known)
  const { error } = await db.from('budget_items').update(budgetColumns(input, categoryId)).eq('id', item.id)
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
// Creare e modificare una spesa passa dalla coda offline (lib/outboxLocal); qui resta solo l'eliminazione.

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

/**
 * Salva i cambi del viaggio: quello della valuta locale e quelli delle valute extra (richiede la migrazione 0012
 * solo se ci sono valute extra). Le valute tolte non compaiono in `extra`.
 */
export async function setTripFxRates(tripId: string, rate: number | null, extra: Record<string, number>): Promise<void> {
  const clean = cleanRates(extra)
  const { error } = await client().from('trips').update({ fx_rate: rate, fx_rates: clean }).eq('id', tripId)
  if (error) {
    if (/fx_rates/i.test(error.message)) {
      throw new Error("Manca la migrazione 0012 sul database: eseguila nell'SQL Editor di Supabase (file supabase/migrations/0012_trip_fx_rates.sql).")
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
