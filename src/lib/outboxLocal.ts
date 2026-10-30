import type { Category, ChecklistItem, Expense, ExpenseShare, Trip } from '../types'
import { doneCount } from './checklist'
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
        expenseCategories: l.category ? upsertById(t.expenseCategories, l.category) : t.expenseCategories,
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
    case 'checklist.count':
      return patchTrip(trips, null, (t) => ({
        ...t,
        checklist: t.checklist.map((c) => (c.id === l.id ? { ...c, done: l.done, quantityDone: l.count > 0 && l.count < (c.quantity ?? 1) ? l.count : undefined } : c)),
      }))
    case 'checklist.deleted':
      return l.deleted ? patchTrip(trips, null, (t) => ({ ...t, checklist: t.checklist.filter((c) => c.id !== l.id) })) : trips
    case 'checklist.deletedMany': {
      if (!l.deleted) return trips
      const gone = new Set(l.ids)
      return patchTrip(trips, null, (t) => ({ ...t, checklist: t.checklist.filter((c) => !gone.has(c.id)) }))
    }
    case 'item.done':
      return patchTrip(trips, null, (t) => ({
        ...t,
        days: t.days.map((d) => ({ ...d, items: d.items.map((i) => (i.id === l.id ? { ...i, done: l.done } : i)) })),
      }))
    case 'item.status':
      return patchTrip(trips, null, (t) => ({
        ...t,
        days: t.days.map((d) => ({ ...d, items: d.items.map((i) => (i.id === l.id ? { ...i, status: l.status, done: l.status === 'done', statusChangedAt: l.at } : i)) })),
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

/** La categoria scelta nel modulo: una già esistente (per nome, senza badare alle maiuscole) oppure una nuova da creare. */
export function pickExpenseCategory(known: Category[], label: string): { category?: Category; isNew: boolean } {
  const clean = label.trim()
  if (!clean) return { isNew: false }
  const hit = known.find((c) => c.label.toLowerCase() === clean.toLowerCase())
  return hit ? { category: hit, isNew: false } : { category: { id: newId(), label: clean }, isNew: true }
}

export function expenseEntry(
  trip: Pick<Trip, 'id' | 'timezone' | 'days' | 'expenseCategories'>,
  input: ExpenseInput,
  existing?: Expense,
): { ops: Op[]; local: Local; label: string } {
  const id = existing?.id ?? input.id ?? newId()
  const { category, isNew } = pickExpenseCategory(trip.expenseCategories, input.category)
  // le colonne della 0028 si scrivono se servono o se il database le ha già (la spesa letta le porta)
  const hasNew = existing?.splitMode !== undefined || existing?.fxManual !== undefined
  const cols = expenseColumns(input, trip.timezone, trip.days, category?.id ?? null, hasNew)
  const mode = input.splitMode ?? 'equal'
  const shareList: ExpenseShare[] = input.shares && input.shares.length > 0 ? input.shares : input.travelerIds.map((travelerId) => ({ travelerId, weight: 1 }))
  const payers = (input.payers ?? []).filter((p) => p.amount > 0)
  const expense: Expense = {
    id,
    label: cols.label,
    category: category?.label,
    categoryId: category?.id,
    amount: cols.amount,
    currency: cols.currency,
    fxRate: cols.fx_rate ?? undefined,
    paidBy: cols.paid_by ?? undefined,
    spentAt: cols.spent_at,
    dayId: cols.day_id ?? undefined,
    notes: cols.notes ?? undefined,
    shares: shareList.map((s) => ({ travelerId: s.travelerId, weight: 1, ...(mode === 'percent' ? { percent: s.percent } : {}), ...(mode === 'fixed' ? { amount: s.amount } : {}) })),
    ...(payers.length > 1 ? { payers } : {}),
    ...('split_mode' in cols ? { splitMode: mode } : existing?.splitMode ? { splitMode: mode } : {}),
    ...(existing?.createdBy ? { createdBy: existing.createdBy } : {}),
    ...((existing?.files?.length ?? 0) + (input.newFiles?.length ?? 0) > 0 ? { files: [...(existing?.files ?? []), ...(input.newFiles ?? [])] } : {}),
    ...(input.fxSource ? { fxSource: input.fxSource } : {}),
    ...(input.fxAt ? { fxAt: input.fxAt } : {}),
    ...(input.fxManual !== undefined ? { fxManual: input.fxManual } : {}),
    ...(input.fxSetBy ? { fxSetBy: input.fxSetBy } : {}),
    ...(input.source ? { source: input.source } : {}),
  }
  const write: Op = existing
    ? { k: 'update', table: 'expenses', id, patch: cols }
    : { k: 'upsert', table: 'expenses', row: { id, trip_id: trip.id, ...cols } }
  // una categoria nuova va creata prima della spesa che la usa (la spesa ci punta con una chiave esterna)
  const createCategory: Op[] =
    isNew && category
      ? [{ k: 'upsert', table: 'expense_categories', row: { id: category.id, trip_id: trip.id, label: category.label, position: (trip.expenseCategories.length + 1) * 1000 } }]
      : []
  return {
    ops: [
      ...createCategory,
      // una categoria archiviata che si torna a usare si riattiva
      ...(category?.archived ? [{ k: 'update', table: 'expense_categories', id: category.id, patch: { archived_at: null } } as Op] : []),
      write,
      { k: 'expenseShares', tripId: trip.id, expenseId: id, travelerIds: shareList.map((s) => s.travelerId), ...(mode !== 'equal' ? { detail: shareList.map((s) => ({ travelerId: s.travelerId, weight: 1, ...(mode === 'percent' ? { percent: s.percent ?? 0 } : { amount: s.amount ?? 0 }) })) } : {}) },
      ...(input.newFiles ?? []).map((f): Op => ({ k: 'upsert', table: 'expense_files', row: { id: f.id, trip_id: trip.id, expense_id: id, file_path: f.path, file_name: f.name ?? null, mime_type: f.mimeType ?? null } })),
      // più paganti: una riga per pagante; con uno solo si cancellano le righe rimaste (solo se ce n'erano)
      ...(payers.length > 1 || existing?.payers?.length ? [{ k: 'expensePayers', tripId: trip.id, expenseId: id, payers: payers.length > 1 ? payers.map((x) => ({ travelerId: x.travelerId, amount: x.amount })) : [] } as Op] : []),
    ],
    local: { t: 'expense.save', tripId: trip.id, expense, ...(isNew && category ? { category } : category?.archived ? { category: { ...category, archived: false } } : {}) },
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
  const hadQuantity = (existing?.quantity ?? 1) > 1
  const cols = checklistColumns(input, hadQuantity, !!existing?.url)
  const quantity = cols.quantity && cols.quantity > 1 ? cols.quantity : undefined
  // i pezzi già a posto restano, ma non possono superare la nuova quantità
  const count = Math.min(existing ? doneCount(existing) : 0, quantity ?? 1)
  const done = quantity ? count >= quantity : hadQuantity ? count >= 1 : (existing?.done ?? false)
  const item: ChecklistItem = {
    id,
    kind: cols.kind,
    text: cols.text,
    done,
    travelerId: cols.traveler_id ?? undefined,
    dueDate: cols.due_date ?? undefined,
    quantity,
    quantityDone: quantity && count > 0 && count < quantity ? count : undefined,
    url: cols.url ?? undefined,
    position: existing?.position ?? position,
    ...(input.v2
      ? {
          description: input.description?.trim() || undefined,
          unit: input.unit?.trim() || undefined,
          category: input.category?.trim() || undefined,
          ...(input.ownerId ? { private: true } : { others: existing?.others ?? [] }),
        }
      : {}),
  }
  // la colonna dei pezzi si scrive solo per le voci con quantità (o per azzerarla)
  const extra = quantity ? { quantity_done: count, done } : hadQuantity ? { quantity_done: null, done: item.done } : {}
  const full = { ...cols, ...extra }
  const write: Op = existing
    ? { k: 'update', table: 'checklist_items', id, patch: full }
    : { k: 'upsert', table: 'checklist_items', row: { id, trip_id: tripId, position, ...full } }
  return { ops: [write], local: { t: 'checklist.save', tripId, item }, label: `Checklist «${item.text}»` }
}

export const deletedPatch = (deleted: boolean) => ({ deleted_at: deleted ? nowIso() : null })
