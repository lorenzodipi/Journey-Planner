// Spese del viaggio come le vede l'app (#34, decisione di Lorenzo del 30/10): ogni voce con un importo e
// segnata pagata — alloggi, voli, trasporti, prenotazioni — è una spesa, nei totali e nel Dettaglio spese.
// Le spese registrate a mano (o nate da una tappa con costo) restano quelle del database; le voci pagate
// senza una spesa collegata diventano spese «derivate» (una sola per voce, nessun doppione).
import { expenseBase, expenseOwed, fxOf, summarizeExpenses, type ExpenseSummary, type FxContext } from './budget'
import { BOOKING_BUDGET_CATEGORY } from './bookingMeta'
import { daysBetween } from './dates'
import { round2 } from './money'
import { zonedToInstant } from './zoned'
import type { Expense, ExpenseSourceKind, Traveler, Trip } from '../types'

export interface SpesaVista extends Expense {
  /** Nata da una voce pagata (alloggio, volo…) senza una spesa registrata: si modifica dalla voce. */
  derived?: boolean
}

const midday = (ymd: string, tz: string) => zonedToInstant(ymd, '12:00', tz)

/** Tutte le spese del viaggio: registrate + derivate dalle voci pagate con un importo. */
export function tutteLeSpese(trip: Pick<Trip, 'expenses' | 'stays' | 'flights' | 'transports' | 'bookings' | 'travelers' | 'timezone' | 'startDate'>): SpesaVista[] {
  const linked = new Set(trip.expenses.filter((e) => e.source).map((e) => `${e.source!.kind}:${e.source!.id}`))
  const out: SpesaVista[] = [...trip.expenses]
  const everyone = trip.travelers.map((t) => t.id)
  const add = (kind: ExpenseSourceKind, id: string, e: Omit<SpesaVista, 'id' | 'source' | 'derived'>) => {
    if (linked.has(`${kind}:${id}`)) return
    out.push({ ...e, id: `${kind}:${id}`, source: { kind, id }, derived: true })
  }
  const total = (amount: number, scope: 'per_person' | 'total', people: number) => (scope === 'per_person' ? round2(amount * Math.max(1, people)) : amount)
  for (const s of trip.stays) {
    if (s.totalCost == null || !s.paid) continue
    const who = s.forTravelers?.length ? s.forTravelers : everyone
    add('stay', s.id, { label: s.name, category: 'Alloggi', amount: s.totalCost, currency: s.currency, paidBy: s.paidBy, spentAt: midday(s.checkIn, trip.timezone), shares: who.map((travelerId) => ({ travelerId, weight: 1 })) })
  }
  for (const f of trip.flights) {
    if (f.cost == null || !f.paid) continue
    const who = f.forTravelers?.length ? f.forTravelers : everyone
    const at = f.legs[0]?.departAt ?? midday(trip.startDate, trip.timezone)
    add('flight', f.id, { label: f.title, category: 'Voli', amount: total(f.cost, f.scope, who.length), currency: f.currency, paidBy: f.paidBy, spentAt: at, shares: who.map((travelerId) => ({ travelerId, weight: 1 })) })
  }
  for (const t of trip.transports) {
    if (t.cost == null || !t.bought) continue
    const who = t.forTravelers?.length ? t.forTravelers : everyone
    const at = t.departAt ?? (t.departDate ? midday(t.departDate, trip.timezone) : midday(trip.startDate, trip.timezone))
    add('transport', t.id, { label: `${t.from} → ${t.to}`, category: 'Trasporti', amount: total(t.cost, t.scope, who.length), currency: t.currency, paidBy: t.paidBy, spentAt: at, shares: who.map((travelerId) => ({ travelerId, weight: 1 })) })
  }
  for (const b of trip.bookings) {
    if (b.cost == null) continue
    const who = b.forTravelers?.length ? b.forTravelers : everyone
    const at = b.validFrom ?? midday(trip.startDate, trip.timezone)
    const payer = b.paidBy ?? (b.payerIds?.length === 1 ? b.payerIds[0] : undefined)
    add('booking', b.id, { label: b.title, category: BOOKING_BUDGET_CATEGORY[b.type], amount: total(b.cost, b.scope ?? 'per_person', who.length), currency: b.currency ?? 'EUR', paidBy: payer, spentAt: at, shares: who.map((travelerId) => ({ travelerId, weight: 1 })) })
  }
  return out.sort((a, b) => b.spentAt.localeCompare(a.spentAt))
}

/** Per chi è la spesa: le persone della divisione (vuoto = tutti). */
export function beneficiari(e: Pick<Expense, 'shares'>, travelers: readonly Pick<Traveler, 'id'>[]): string[] {
  return e.shares.length > 0 ? e.shares.filter((s) => s.weight > 0).map((s) => s.travelerId) : travelers.map((t) => t.id)
}

/**
 * Sezione del Dettaglio spese (decisione di Lorenzo): «tutti» = divisa tra tutti i partecipanti;
 * «mie» = pagata da me o divisa con alcune persone tra cui io; `null` = non mi riguarda (non si vede).
 */
export function sezioneSpesa(e: Pick<Expense, 'shares' | 'paidBy' | 'payers'>, travelers: readonly Pick<Traveler, 'id'>[], me: string | undefined): 'tutti' | 'mie' | null {
  const who = beneficiari(e, travelers)
  const all = travelers.length > 0 && travelers.every((t) => who.includes(t.id))
  if (all) return 'tutti'
  if (!me) return null
  if (who.includes(me) || e.paidBy === me || e.payers?.some((p) => p.travelerId === me)) return 'mie'
  return null
}

export interface Riassunto {
  fx: FxContext
  spese: SpesaVista[]
  summary: ExpenseSummary
  /** Speso totale nella valuta di casa (tutte le spese, anche quelle che non mi riguardano). */
  speso: number
  limit?: number
  /** saldo della persona collegata all'account (> 0 da incassare) */
  mioSaldo: number | null
  inPari: boolean
  solo: boolean
}

export function riassunto(trip: Trip, me: string | undefined): Riassunto {
  const fx = fxOf(trip)
  const spese = tutteLeSpese(trip)
  const summary = summarizeExpenses(spese, trip.travelers, fx)
  const mine = me ? summary.balances.find((b) => b.travelerId === me) : undefined
  return {
    fx,
    spese,
    summary,
    speso: summary.total,
    limit: trip.budgetLimit,
    mioSaldo: mine ? mine.net : null,
    inPari: summary.transfers.length === 0,
    solo: trip.travelers.length <= 1,
  }
}

/** Speso al giorno (sui giorni passati del viaggio, almeno uno) e giorni contati. */
export function alGiorno(speso: number, trip: Pick<Trip, 'startDate' | 'endDate'>, today: string): { perDay: number; days: number } {
  const end = today > trip.endDate ? trip.endDate : today
  const days = Math.max(1, daysBetween(trip.startDate, end) + 1)
  return { perDay: round2(speso / days), days }
}

/** Quota di una spesa a carico di una persona, nella valuta di casa. */
export function quotaDi(e: Expense, trip: Pick<Trip, 'travelers'>, fx: FxContext, id: string): number | null {
  const owed = expenseOwed(e, trip.travelers, fx)
  return owed ? round2(owed.filter((o) => o.travelerId === id).reduce((s, o) => s + o.amount, 0)) : null
}

export { expenseBase }
