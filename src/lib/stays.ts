import type { Trip } from '../types'
import { daysBetween, parseYmd, toYmd } from './dates'
import { dateInZone } from './flights'

export interface StayDates {
  checkIn: string
  checkOut: string
}

/** Numero di notti (check-out meno check-in). */
export function nightsOf(stay: StayDates): number {
  return Math.max(0, daysBetween(stay.checkIn, stay.checkOut))
}

/**
 * Notti del viaggio (dalla data di inizio a quella di fine esclusa) senza alcun alloggio.
 * Una notte "d" è coperta se un alloggio ha check-in <= d < check-out.
 * Le notti trascorse in volo compaiono qui: è corretto e il chiamante può mostrarle come promemoria.
 */
export function uncoveredNights(start: string, end: string, stays: StayDates[]): string[] {
  const out: string[] = []
  const last = daysBetween(start, end)
  for (let i = 0; i < last && i < 400; i++) {
    const d = parseYmd(start)
    d.setDate(d.getDate() + i)
    const ymd = toYmd(d)
    if (!stays.some((s) => s.checkIn <= ymd && ymd < s.checkOut)) out.push(ymd)
  }
  return out
}

/** Alloggi che si sovrappongono (la stessa notte in due posti), come coppie di indici. */
export function overlappingStays(stays: StayDates[]): [number, number][] {
  const pairs: [number, number][] = []
  for (let i = 0; i < stays.length; i++) {
    for (let j = i + 1; j < stays.length; j++) {
      if (stays[i].checkIn < stays[j].checkOut && stays[j].checkIn < stays[i].checkOut) pairs.push([i, j])
    }
  }
  return pairs
}

// ---- #57: notti scoperte, escluse quelle in viaggio ----

/** Notti passate in volo, treno o bus: partono la sera e arrivano un altro giorno (nel fuso del viaggio). */
export function nottiInViaggio(trip: Pick<Trip, 'timezone' | 'flights' | 'transports'>): Set<string> {
  const out = new Set<string>()
  const add = (dep?: string, arr?: string) => {
    if (!dep || !arr) return
    const a = dateInZone(dep, trip.timezone)
    const b = dateInZone(arr, trip.timezone)
    for (let d = a, i = 0; d < b && i < 40; i++, d = toYmd(new Date(parseYmd(d).getTime() + 86400000))) out.add(d)
  }
  for (const f of trip.flights) for (const l of f.legs) add(l.departAt, l.arriveAt)
  for (const t of trip.transports) add(t.departAt, t.arriveAt)
  return out
}

/** Notti senza nessun alloggio (check-in incluso, check-out escluso), senza quelle trascorse in viaggio. Si calcola una volta per viaggio. */
export function nottiScoperte(trip: Pick<Trip, 'startDate' | 'endDate' | 'stays' | 'timezone' | 'flights' | 'transports'>): string[] {
  if (!trip.startDate || !trip.endDate) return []
  const viaggio = nottiInViaggio(trip)
  return uncoveredNights(trip.startDate, trip.endDate, trip.stays).filter((d) => !viaggio.has(d))
}

/** Intervalli di notti consecutive: «12 → 14 mag» come primo e ultimo giorno della notte (l'ultima notte finisce il giorno dopo). */
export function intervalliNotti(notti: string[]): { from: string; to: string; count: number }[] {
  const out: { from: string; to: string; count: number }[] = []
  for (const n of [...notti].sort()) {
    const last = out[out.length - 1]
    const next = last ? toYmd(new Date(parseYmd(last.to).getTime() + 86400000)) : ''
    if (last && next === n) {
      last.to = n
      last.count++
    } else out.push({ from: n, to: n, count: 1 })
  }
  return out
}

/** Alloggi con date fuori dal viaggio (segnalate a parte). */
export function stayFuoriViaggio(trip: Pick<Trip, 'startDate' | 'endDate' | 'stays'>) {
  return trip.stays.filter((s) => (trip.startDate && s.checkOut <= trip.startDate) || (trip.endDate && s.checkIn > trip.endDate))
}
