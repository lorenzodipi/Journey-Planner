import type { ChecklistItem, Expense, Trip } from '../types'
import { checklistColumns, type ChecklistInput } from './planningData'
import { expenseColumns, type ExpenseInput } from './moneyData'
import type { Entry, Local, Op } from './outbox'

// Dalla coda alle viste: come appaiono i dati con le modifiche ancora da inviare,
// e come si costruiscono le voci della coda a partire dai moduli.

const patchTrip = (trips: Trip[], tripId: string | null, fn: (t: Trip) => Trip): Trip[] =>
  trips.map((t) => (tripId === null || t.id === tripId ? fn(t) : t))

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
}

function apply(trips: Trip[], l: Local): Trip[] {
  switch (l.t) {
    case 'expense.save':
      return patchTrip(trips, l.tripId, (t) => ({
        ...t,
        expenses: upsertById(t.expenses, l.expense).sort((a, b) => b.spentAt.localeCompare(a.spentAt)),
      }))
    case 'expense.deleted':
      return l.deleted ? patchTrip(trips, null, (t) => ({ ...t, expenses: t.expenses.filter((e) => e.id !== l.id) })) : trips
    case 'checklist.save':
      return patchTrip(trips, l.tripId, (t) => ({
        ...t,
        checklist: upsertById(t.checklist, l.item).sort((a, b) => a.position - b.position),
      }))
    case 'checklist.done':
      return patchTrip(trips, null, (t) => ({ ...t, checklist: t.checklist.map((c) => (c.id === l.id ? { ...c, done: l.done } : c)) }))
    case 'checklist.deleted':
      return l.deleted ? patchTrip(trips, null, (t) => ({ ...t, checklist: t.checklist.filter((c) => c.id !== l.id) })) : trips
    case 'item.done':
      return patchTrip(trips, null, (t) => ({
        ...t,
        days: t.days.map((d) => ({ ...d, items: d.items.map((i) => (i.id === l.id ? { ...i, done: l.done } : i)) })),
      }))
    case 'place.status':
      return patchTrip(trips, null, (t) => ({ ...t, places: t.places.map((p) => (p.id === l.id ? { ...p, status: l.status } : p)) }))
  }
}

/**
 * Dati del server + modifiche ancora in coda. Le voci rifiutate dal server non si applicano.
 * Applicare due volte la stessa voce (es. mentre si ricarica dopo l'invio) non cambia nulla.
 */
export function applyQueue(trips: Trip[], entries: Entry[]): Trip[] {
  return entries.filter((e) => !e.error).reduce((acc, e) => apply(acc, e.local), trips)
}

// ---------- costruzione delle voci ----------

export const newId = (): string => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

export function expenseEntry(
  trip: Pick<Trip, 'id' | 'timezone' | 'days'>,
  input: ExpenseInput,
  existing?: Expense,
): { ops: Op[]; local: Local; label: string } {
  const id = existing?.id ?? newId()
  const cols = expenseColumns(input, trip.timezone, trip.days)
  const expense: Expense = {
    id,
    label: cols.label,
    category: cols.category ?? undefined,
    amount: cols.amount,
    currency: cols.currency,
    fxRate: cols.fx_rate ?? undefined,
    paidBy: cols.paid_by ?? undefined,
    spentAt: cols.spent_at,
    dayId: cols.day_id ?? undefined,
    notes: cols.notes ?? undefined,
    shares: input.travelerIds.map((travelerId) => ({ travelerId, weight: 1 })),
  }
  const write: Op = existing
    ? { k: 'update', table: 'expenses', id, patch: cols }
    : { k: 'upsert', table: 'expenses', row: { id, trip_id: trip.id, ...cols } }
  return {
    ops: [write, { k: 'expenseShares', tripId: trip.id, expenseId: id, travelerIds: input.travelerIds }],
    local: { t: 'expense.save', tripId: trip.id, expense },
    label: `Spesa «${expense.label}»`,
  }
}

export function checklistEntry(
  tripId: string,
  input: ChecklistInput,
  position: number,
  existing?: ChecklistItem,
): { ops: Op[]; local: Local; label: string } {
  const id = existing?.id ?? newId()
  const cols = checklistColumns(input)
  const item: ChecklistItem = {
    id,
    kind: cols.kind,
    text: cols.text,
    done: existing?.done ?? false,
    travelerId: cols.traveler_id ?? undefined,
    dueDate: cols.due_date ?? undefined,
    position: existing?.position ?? position,
  }
  const write: Op = existing
    ? { k: 'update', table: 'checklist_items', id, patch: cols }
    : { k: 'upsert', table: 'checklist_items', row: { id, trip_id: tripId, position, ...cols } }
  return { ops: [write], local: { t: 'checklist.save', tripId, item }, label: `Checklist «${item.text}»` }
}

export const deletedPatch = (deleted: boolean) => ({ deleted_at: deleted ? nowIso() : null })
