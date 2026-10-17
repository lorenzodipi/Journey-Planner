import type { BudgetItem, Expense, Scope, Trip, Traveler } from '../types'
import { round2 } from './money'

// Calcoli di budget e spese. Tutto è derivato dai dati: nessun totale si digita a mano.
// Le valute: la valuta base del viaggio (es. EUR), la valuta locale (es. JPY) con un tasso
// condiviso, e il tasso scritto sulla singola spesa (ha la precedenza).

export interface FxContext {
  base: string
  local?: string
  /** unità di valuta base per 1 unità della valuta locale */
  rate?: number
}

export function fxOf(trip: Pick<Trip, 'baseCurrency' | 'localCurrency' | 'fxRate'>): FxContext {
  return { base: trip.baseCurrency, local: trip.localCurrency, rate: trip.fxRate }
}

/** Importo nella valuta base, oppure `null` se manca il tasso per convertirlo. */
export function toBase(amount: number, currency: string, fx: FxContext): number | null {
  if (currency === fx.base) return round2(amount)
  if (fx.local && currency === fx.local && fx.rate) return round2(amount * fx.rate)
  return null
}

/** Divide un importo in parti, distribuendo i centesimi di resto alle prime (la somma torna sempre). */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return []
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / parts)
  const rest = cents - base * parts
  return Array.from({ length: parts }, (_, i) => (base + (i < rest ? 1 : 0)) / 100)
}

// ---------- budget ----------

/** Una voce di budget "piatta": vale per le voci inserite a mano e per quelle ricavate da voli, alloggi e trasporti. */
export interface Line {
  key: string
  label: string
  category: string
  amount: number
  currency: string
  scope: Scope
  /** Chi paga e se ha già pagato. Vuoto = tutti i viaggiatori, nessuno ha pagato. */
  shares: { travelerId: string; paid: boolean }[]
  source: 'budget' | 'flight' | 'stay' | 'transport'
}

export function budgetLines(items: BudgetItem[]): Line[] {
  return items.map((i) => ({
    key: i.id,
    label: i.label,
    category: i.category?.trim() || 'Altro',
    amount: i.amount,
    currency: i.currency,
    scope: i.scope,
    shares: i.shares.map((s) => ({ travelerId: s.travelerId, paid: s.paid })),
    source: 'budget' as const,
  }))
}

/** Costi già inseriti in voli, alloggi e trasporti, come voci di budget (sola lettura). */
export function logisticsLines(trip: Pick<Trip, 'flights' | 'stays' | 'transports' | 'travelers'>): Line[] {
  const everyone = (paid: boolean) => trip.travelers.map((t) => ({ travelerId: t.id, paid }))
  const lines: Line[] = []
  for (const f of trip.flights)
    if (f.cost != null)
      lines.push({ key: `flight:${f.id}`, label: f.title, category: 'Voli', amount: f.cost, currency: f.currency, scope: f.scope, shares: everyone(f.paid), source: 'flight' })
  for (const s of trip.stays)
    if (s.totalCost != null)
      lines.push({ key: `stay:${s.id}`, label: s.name, category: 'Alloggi', amount: s.totalCost, currency: s.currency, scope: 'total', shares: everyone(s.paid), source: 'stay' })
  for (const t of trip.transports)
    if (t.cost != null)
      lines.push({ key: `transport:${t.id}`, label: `${t.from} → ${t.to}`, category: 'Trasporti', amount: t.cost, currency: t.currency, scope: t.scope, shares: everyone(t.bought), source: 'transport' })
  return lines
}

/** Quanto paga ciascuna quota di una voce, nello stesso ordine di `shares`. */
export function shareAmounts(line: Pick<Line, 'amount' | 'scope'>, shareCount: number): number[] {
  return line.scope === 'per_person' ? Array.from({ length: shareCount }, () => round2(line.amount)) : splitEvenly(line.amount, shareCount)
}

export interface PersonTotals {
  travelerId: string
  planned: number
  paid: number
  outstanding: number
}

export interface BudgetSummary {
  planned: number
  paid: number
  outstanding: number
  perTraveler: PersonTotals[]
  /** valute senza tasso: le voci in queste valute non sono nei totali */
  unconverted: string[]
}

export function summarizeLines(lines: Line[], travelers: Pick<Traveler, 'id'>[], fx: FxContext): BudgetSummary {
  const per = new Map<string, PersonTotals>(travelers.map((t) => [t.id, { travelerId: t.id, planned: 0, paid: 0, outstanding: 0 }]))
  const unconverted = new Set<string>()
  for (const line of lines) {
    const shares = line.shares.length > 0 ? line.shares : travelers.map((t) => ({ travelerId: t.id, paid: false }))
    const amounts = shareAmounts(line, shares.length)
    shares.forEach((share, i) => {
      const mine = toBase(amounts[i], line.currency, fx)
      if (mine === null) {
        unconverted.add(line.currency)
        return
      }
      const row = per.get(share.travelerId)
      if (!row) return // viaggiatore rimosso
      row.planned += mine
      if (share.paid) row.paid += mine
      else row.outstanding += mine
    })
  }
  const perTraveler = Array.from(per.values()).map((p) => ({
    travelerId: p.travelerId,
    planned: round2(p.planned),
    paid: round2(p.paid),
    outstanding: round2(p.outstanding),
  }))
  const sum = (k: 'planned' | 'paid' | 'outstanding') => round2(perTraveler.reduce((n, p) => n + p[k], 0))
  return { planned: sum('planned'), paid: sum('paid'), outstanding: sum('outstanding'), perTraveler, unconverted: Array.from(unconverted).sort() }
}

/** Voci raggruppate per categoria, categorie in ordine alfabetico e "Altro" per ultima. */
export function groupByCategory<T extends { category: string }>(lines: T[]): { category: string; lines: T[] }[] {
  const map = new Map<string, T[]>()
  for (const l of lines) map.set(l.category, [...(map.get(l.category) ?? []), l])
  return Array.from(map, ([category, ls]) => ({ category, lines: ls })).sort((a, b) =>
    a.category === 'Altro' ? 1 : b.category === 'Altro' ? -1 : a.category.localeCompare(b.category, 'it'),
  )
}

// ---------- spese ----------

/** Importo della spesa nella valuta base: vale il tasso scritto sulla spesa, poi quello del viaggio. */
export function expenseBase(e: Pick<Expense, 'amount' | 'currency' | 'fxRate'>, fx: FxContext): number | null {
  if (e.currency === fx.base) return round2(e.amount)
  if (e.fxRate) return round2(e.amount * e.fxRate)
  return toBase(e.amount, e.currency, fx)
}

/** Quota di ciascun viaggiatore nella valuta base, in proporzione ai pesi (senza quote: parti uguali tra tutti). */
export function expenseOwed(
  e: Pick<Expense, 'amount' | 'currency' | 'fxRate' | 'shares'>,
  travelers: Pick<Traveler, 'id'>[],
  fx: FxContext,
): { travelerId: string; amount: number }[] | null {
  const total = expenseBase(e, fx)
  if (total === null) return null
  const shares = e.shares.length > 0 ? e.shares : travelers.map((t) => ({ travelerId: t.id, weight: 1 }))
  const weights = shares.map((s) => (s.weight > 0 ? s.weight : 0))
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum === 0) return []
  // arrotondo ogni quota e assegno il resto all'ultima, così la somma è esatta
  let given = 0
  return shares.map((s, i) => {
    const amount = i === shares.length - 1 ? round2(total - given) : round2((total * weights[i]) / sum)
    given = round2(given + amount)
    return { travelerId: s.travelerId, amount }
  })
}

export interface Balance {
  travelerId: string
  paid: number
  owed: number
  net: number // > 0: deve ricevere; < 0: deve dare
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

export interface ExpenseSummary {
  total: number
  /** quanto "consuma" ciascuno (la sua parte di tutte le spese) */
  spentBy: { travelerId: string; amount: number }[]
  balances: Balance[]
  transfers: Transfer[]
  unconverted: string[]
}

/** Chi deve a chi, con il minor numero di bonifici (le spese senza pagante non contano). */
export function settle(balances: Pick<Balance, 'travelerId' | 'net'>[]): Transfer[] {
  const creditors = balances.filter((b) => b.net > 0.004).map((b) => ({ id: b.travelerId, left: b.net }))
  const debtors = balances.filter((b) => b.net < -0.004).map((b) => ({ id: b.travelerId, left: -b.net }))
  creditors.sort((a, b) => b.left - a.left)
  debtors.sort((a, b) => b.left - a.left)
  const out: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].left, creditors[j].left))
    if (amount > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount })
    debtors[i].left = round2(debtors[i].left - amount)
    creditors[j].left = round2(creditors[j].left - amount)
    if (debtors[i].left <= 0.004) i++
    if (creditors[j].left <= 0.004) j++
  }
  return out
}

export function summarizeExpenses(expenses: Expense[], travelers: Pick<Traveler, 'id'>[], fx: FxContext): ExpenseSummary {
  const spent = new Map<string, number>(travelers.map((t) => [t.id, 0]))
  const paid = new Map<string, number>(travelers.map((t) => [t.id, 0]))
  const owedForBalance = new Map<string, number>(travelers.map((t) => [t.id, 0]))
  const unconverted = new Set<string>()
  let total = 0
  for (const e of expenses) {
    const owed = expenseOwed(e, travelers, fx)
    const base = expenseBase(e, fx)
    if (owed === null || base === null) {
      unconverted.add(e.currency)
      continue
    }
    total += base
    for (const o of owed) {
      spent.set(o.travelerId, round2((spent.get(o.travelerId) ?? 0) + o.amount))
      if (e.paidBy) owedForBalance.set(o.travelerId, round2((owedForBalance.get(o.travelerId) ?? 0) + o.amount))
    }
    if (e.paidBy) paid.set(e.paidBy, round2((paid.get(e.paidBy) ?? 0) + base))
  }
  const balances = travelers.map((t) => {
    const p = paid.get(t.id) ?? 0
    const o = owedForBalance.get(t.id) ?? 0
    return { travelerId: t.id, paid: p, owed: o, net: round2(p - o) }
  })
  return {
    total: round2(total),
    spentBy: travelers.map((t) => ({ travelerId: t.id, amount: spent.get(t.id) ?? 0 })),
    balances,
    transfers: settle(balances),
    unconverted: Array.from(unconverted).sort(),
  }
}

// ---------- vista per persona (tab in Spese) ----------

/** La spesa riguarda questa persona: l'ha pagata o ne ha una quota (senza quote = tutti). */
export function involvesTraveler(e: Pick<Expense, 'paidBy' | 'shares'>, travelerId: string): boolean {
  if (e.paidBy === travelerId) return true
  if (e.shares.length === 0) return true
  return e.shares.some((s) => s.travelerId === travelerId && s.weight > 0)
}

export function expensesOf(expenses: Expense[], travelerId: 'all' | string): Expense[] {
  return travelerId === 'all' ? expenses : expenses.filter((e) => involvesTraveler(e, travelerId))
}

/** Quota di una spesa a carico di una persona (nella valuta base), o null se manca il cambio. */
export function shareOf(
  e: Pick<Expense, 'amount' | 'currency' | 'fxRate' | 'shares'>,
  travelers: Pick<Traveler, 'id'>[],
  travelerId: string,
  fx: FxContext,
): number | null {
  const owed = expenseOwed(e, travelers, fx)
  if (owed === null) return null
  return round2(owed.filter((o) => o.travelerId === travelerId).reduce((n, o) => n + o.amount, 0))
}

export interface PersonSummary {
  /** quanto ha anticipato */
  paid: number
  /** la sua parte di tutte le spese */
  share: number
  /** > 0: deve ricevere; < 0: deve dare */
  net: number
  /** a chi deve dare, e quanto */
  gives: Transfer[]
  /** da chi deve ricevere, e quanto */
  receives: Transfer[]
}

export function personSummary(summary: ExpenseSummary, travelerId: string): PersonSummary {
  const balance = summary.balances.find((b) => b.travelerId === travelerId)
  return {
    paid: balance?.paid ?? 0,
    share: summary.spentBy.find((s) => s.travelerId === travelerId)?.amount ?? 0,
    net: balance?.net ?? 0,
    gives: summary.transfers.filter((t) => t.from === travelerId),
    receives: summary.transfers.filter((t) => t.to === travelerId),
  }
}
