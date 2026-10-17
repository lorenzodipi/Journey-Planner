import type { BudgetItem, Day, Expense, Scope } from '../types'
import { zonedToInstant } from './zoned'

// Budget e spese: righe del database <-> tipi dell'app, e colonne da salvare dai moduli.

export interface BudgetItemRow {
  id: string
  trip_id: string
  label: string
  category: string | null
  amount: number | string
  currency: string
  scope: Scope
  due_date: string | null
  notes: string | null
}

export interface BudgetShareRow {
  id: string
  trip_id: string
  budget_item_id: string
  traveler_id: string
  paid: boolean
}

export interface ExpenseRow {
  id: string
  trip_id: string
  day_id: string | null
  label: string
  category: string | null
  amount: number | string
  currency: string
  fx_rate: number | string | null
  paid_by: string | null
  spent_at: string
  notes: string | null
}

export interface ExpenseShareRow {
  id: string
  trip_id: string
  expense_id: string
  traveler_id: string
  weight: number | string
}

export function mapBudget(items: BudgetItemRow[], shares: BudgetShareRow[], tripId: string): BudgetItem[] {
  return items
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      label: r.label,
      category: r.category ?? undefined,
      amount: Number(r.amount),
      currency: r.currency.trim(),
      scope: r.scope,
      dueDate: r.due_date ?? undefined,
      notes: r.notes ?? undefined,
      shares: shares
        .filter((s) => s.budget_item_id === r.id)
        .map((s) => ({ id: s.id, travelerId: s.traveler_id, paid: s.paid })),
    }))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.label.localeCompare(b.label, 'it'))
}

export function mapExpenses(rows: ExpenseRow[], shares: ExpenseShareRow[], tripId: string): Expense[] {
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      label: r.label,
      category: r.category ?? undefined,
      amount: Number(r.amount),
      currency: r.currency.trim(),
      fxRate: r.fx_rate == null ? undefined : Number(r.fx_rate),
      paidBy: r.paid_by ?? undefined,
      spentAt: r.spent_at,
      dayId: r.day_id ?? undefined,
      notes: r.notes ?? undefined,
      shares: shares.filter((s) => s.expense_id === r.id).map((s) => ({ travelerId: s.traveler_id, weight: Number(s.weight) })),
    }))
    .sort((a, b) => b.spentAt.localeCompare(a.spentAt)) // le più recenti in alto
}

// ---------- moduli -> colonne ----------

const orNull = (s: string) => s.trim() || null

export interface BudgetInput {
  label: string
  category: string
  amount: number
  currency: string
  scope: Scope
  dueDate: string
  notes: string
  /** chi paga la voce */
  travelerIds: string[]
  /** tra questi, chi ha già pagato */
  paidIds: string[]
}

export function budgetColumns(i: BudgetInput) {
  return {
    label: i.label.trim(),
    category: orNull(i.category),
    amount: i.amount,
    currency: i.currency.trim().toUpperCase() || 'EUR',
    scope: i.scope,
    due_date: i.dueDate || null,
    notes: orNull(i.notes),
  }
}

export interface ExpenseInput {
  label: string
  category: string
  amount: number
  currency: string
  fxRate: number | null
  paidBy: string | null
  /** giorno della spesa, YYYY-MM-DD, nel fuso del viaggio */
  spentDate: string
  notes: string
  /** tra chi si divide (almeno uno) */
  travelerIds: string[]
}

/** La spesa vale a mezzogiorno del giorno scelto, nel fuso del viaggio; il giorno del viaggio si ricava dalla data. */
export function expenseColumns(i: ExpenseInput, timeZone: string, days: Pick<Day, 'id' | 'date'>[]) {
  return {
    label: i.label.trim(),
    category: orNull(i.category),
    amount: i.amount,
    currency: i.currency.trim().toUpperCase() || 'EUR',
    fx_rate: i.fxRate,
    paid_by: i.paidBy,
    spent_at: zonedToInstant(i.spentDate, '12:00', timeZone),
    day_id: days.find((d) => d.date === i.spentDate)?.id ?? null,
    notes: orNull(i.notes),
  }
}
