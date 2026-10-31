import type { BudgetItem, Day, Expense, ExpenseFile, Rimborso, RimborsoConfermato, ExpensePayer, ExpenseShare, Scope, ExpenseSourceKind, SplitMode } from '../types'
import { zonedToInstant } from './zoned'

// Budget e spese: righe del database <-> tipi dell'app, e colonne da salvare dai moduli.

export interface BudgetItemRow {
  id: string
  trip_id: string
  label: string
  /** testo libero di prima della migrazione 0008 */
  category: string | null
  category_id?: string | null
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
  /** testo libero di prima della migrazione 0008 */
  category: string | null
  category_id?: string | null
  amount: number | string
  currency: string
  fx_rate: number | string | null
  paid_by: string | null
  spent_at: string
  notes: string | null
  source_kind?: ExpenseSourceKind | null
  source_id?: string | null
  /** 0028 */
  split_mode?: SplitMode | null
  created_by?: string | null
  fx_source?: string | null
  fx_at?: string | null
  fx_manual?: boolean | null
  fx_set_by?: string | null
}

export interface ExpenseShareRow {
  id: string
  trip_id: string
  expense_id: string
  traveler_id: string
  weight: number | string
  percent?: number | string | null
  amount?: number | string | null
}

export interface ExpensePayerRow {
  expense_id: string
  trip_id: string
  traveler_id: string
  amount: number | string
}

export interface SettlementRow {
  id: string
  trip_id: string
  from_traveler: string
  to_traveler: string
  amount: number | string
  currency: string
  paid_on: string
  status: Rimborso['status']
  created_by: string | null
  created_at: string
  decided_by: string | null
  decided_at: string | null
  corrects: string | null
}

export interface ConfirmedSettlementRow {
  id: string
  trip_id: string
  from_traveler: string
  to_traveler: string
  amount: number | string
}

export function mapSettlements(rows: SettlementRow[], tripId: string): Rimborso[] {
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      fromId: r.from_traveler,
      toId: r.to_traveler,
      amount: Number(r.amount),
      currency: r.currency.trim(),
      paidOn: r.paid_on,
      status: r.status,
      createdAt: r.created_at,
      ...(r.created_by ? { createdBy: r.created_by } : {}),
      ...(r.decided_by ? { decidedBy: r.decided_by } : {}),
      ...(r.decided_at ? { decidedAt: r.decided_at } : {}),
      ...(r.corrects ? { corrects: r.corrects } : {}),
    }))
}

export function mapConfirmed(rows: ConfirmedSettlementRow[], tripId: string): RimborsoConfermato[] {
  return rows.filter((r) => r.trip_id === tripId).map((r) => ({ id: r.id, fromId: r.from_traveler, toId: r.to_traveler, amount: Number(r.amount) }))
}

export interface ExpenseFileRow {
  id: string
  trip_id: string
  expense_id: string
  file_path: string
  file_name: string | null
  mime_type: string | null
}

/** Nome della categoria di una riga: quella collegata, altrimenti il vecchio testo libero (se la migrazione 0008 non è ancora stata eseguita). */
function categoryOf(r: { category: string | null; category_id?: string | null }, labels: ReadonlyMap<string, string>): { category?: string; categoryId?: string } {
  if (r.category_id && labels.has(r.category_id)) return { category: labels.get(r.category_id), categoryId: r.category_id }
  const legacy = r.category?.trim()
  return legacy ? { category: legacy } : {}
}

export function mapBudget(items: BudgetItemRow[], shares: BudgetShareRow[], tripId: string, labels: ReadonlyMap<string, string> = new Map()): BudgetItem[] {
  return items
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      label: r.label,
      ...categoryOf(r, labels),
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

export function mapExpenses(
  rows: ExpenseRow[],
  shares: ExpenseShareRow[],
  tripId: string,
  labels: ReadonlyMap<string, string> = new Map(),
  payers: ExpensePayerRow[] = [],
  files: ExpenseFileRow[] = [],
): Expense[] {
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      label: r.label,
      ...categoryOf(r, labels),
      amount: Number(r.amount),
      currency: r.currency.trim(),
      fxRate: r.fx_rate == null ? undefined : Number(r.fx_rate),
      paidBy: r.paid_by ?? undefined,
      spentAt: r.spent_at,
      dayId: r.day_id ?? undefined,
      notes: r.notes ?? undefined,
      shares: shares
        .filter((s) => s.expense_id === r.id)
        .map((s) => ({
          travelerId: s.traveler_id,
          weight: Number(s.weight),
          ...(s.percent != null ? { percent: Number(s.percent) } : {}),
          ...(s.amount != null ? { amount: Number(s.amount) } : {}),
        })),
      ...(payers.some((p) => p.expense_id === r.id)
        ? { payers: payers.filter((p) => p.expense_id === r.id).map((p) => ({ travelerId: p.traveler_id, amount: Number(p.amount) })) }
        : {}),
      // le colonne della 0028 compaiono solo se il database le ha: serve a sapere se si possono scrivere
      ...(r.split_mode ? { splitMode: r.split_mode } : {}),
      ...(r.created_by ? { createdBy: r.created_by } : {}),
      ...(r.fx_source ? { fxSource: r.fx_source } : {}),
      ...(r.fx_at ? { fxAt: r.fx_at } : {}),
      ...(r.fx_manual != null ? { fxManual: r.fx_manual } : {}),
      ...(r.fx_set_by ? { fxSetBy: r.fx_set_by } : {}),
      ...(files.some((f) => f.expense_id === r.id)
        ? {
            files: files
              .filter((f) => f.expense_id === r.id)
              .map((f) => ({ id: f.id, path: f.file_path, ...(f.file_name ? { name: f.file_name } : {}), ...(f.mime_type ? { mimeType: f.mime_type } : {}) })),
          }
        : {}),
      ...(r.source_kind && r.source_id ? { source: { kind: r.source_kind, id: r.source_id } } : {}),
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

/** `categoryId`: la categoria scelta (già creata). Il vecchio testo libero si azzera: da ora vale solo il collegamento. */
export function budgetColumns(i: BudgetInput, categoryId: string | null) {
  return {
    label: i.label.trim(),
    category: null,
    category_id: categoryId,
    amount: i.amount,
    currency: i.currency.trim().toUpperCase() || 'EUR',
    scope: i.scope,
    due_date: i.dueDate || null,
    notes: orNull(i.notes),
  }
}

export interface ExpenseInput {
  /** Id scelto da chi crea (per «Annulla» subito dopo); di solito lo genera l'app. */
  id?: string
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
  /** Divisione dettagliata (0028): percentuali o importi fissi per persona. Senza, parti uguali tra `travelerIds`. */
  splitMode?: SplitMode
  shares?: ExpenseShare[]
  /** Più paganti (0028); con uno solo vale `paidBy`. */
  payers?: ExpensePayer[]
  /** Ricevute appena caricate nel bucket: si collegano alla spesa insieme al resto. */
  newFiles?: ExpenseFile[]
  /** Da dove viene il cambio e se è stato scritto a mano (0028). */
  fxSource?: string
  fxAt?: string
  fxManual?: boolean
  /** Account di chi scrive il cambio a mano. */
  fxSetBy?: string
  /** La voce da cui nasce la spesa (tappa con costo, alloggio, volo…): una sola spesa per voce. */
  source?: { kind: ExpenseSourceKind; id: string }
}

/** La spesa vale a mezzogiorno del giorno scelto, nel fuso del viaggio; il giorno del viaggio si ricava dalla data. */
export function expenseColumns(i: ExpenseInput, timeZone: string, days: Pick<Day, 'id' | 'date'>[], categoryId: string | null, withNew = false) {
  // colonne della 0028: si scrivono solo se servono (o se il database le ha già), così senza migrazione tutto funziona come prima
  const first = i.payers && i.payers.length > 0 ? i.payers[0].travelerId : i.paidBy
  const extra = {
    ...(withNew || (i.splitMode && i.splitMode !== 'equal') ? { split_mode: i.splitMode ?? 'equal' } : {}),
    ...(withNew || i.fxSource || i.fxManual ? { fx_source: i.fxSource ?? null, fx_at: i.fxAt ?? null, fx_manual: !!i.fxManual, fx_set_by: i.fxManual ? (i.fxSetBy ?? null) : null } : {}),
  }
  return {
    ...extra,
    label: i.label.trim(),
    category: null,
    category_id: categoryId,
    amount: i.amount,
    currency: i.currency.trim().toUpperCase() || 'EUR',
    fx_rate: i.fxRate,
    paid_by: first ?? null,
    spent_at: zonedToInstant(i.spentDate, '12:00', timeZone),
    day_id: days.find((d) => d.date === i.spentDate)?.id ?? null,
    notes: orNull(i.notes),
    ...(i.source ? { source_kind: i.source.kind, source_id: i.source.id } : {}),
  }
}
