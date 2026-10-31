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

const giornoDopo = (d: string) => toYmd(new Date(parseYmd(d).getTime() + 86400000))

/**
 * Notti passate in viaggio (volo, treno, bus, nave…): una notte «D» è coperta se un mezzo la attraversa, cioè
 * parte il giorno D (o prima) e arriva il giorno D+1 (o dopo) — contando le date nel fuso del viaggio e in quelli
 * degli aeroporti — e anche se il mezzo ha solo le date, senza orario. Inoltre dopo l'ultimo volo del viaggio
 * (il ritorno) le notti restano coperte anche se atterra lo stesso giorno: si dorme a casa, non serve un alloggio.
 */
export function nottiInViaggio(trip: Pick<Trip, 'timezone' | 'flights' | 'transports'> & Partial<Pick<Trip, 'stays' | 'startDate' | 'endDate'>>): Set<string> {
  const out = new Set<string>()
  const cover = (a: string, b: string) => {
    for (let d = a, i = 0; d < b && i < 40; i++, d = giornoDopo(d)) out.add(d)
  }
  const ultimaPartenza: string[] = []
  for (const f of trip.flights) {
    const legs = f.legs.filter((l) => l.departAt && l.arriveAt)
    // un volo con scali è un unico viaggio: la notte passata in aeroporto tra due tratte è coperta
    if (legs.length > 0) {
      const first = legs[0]
      const last = legs[legs.length - 1]
      cover(dateInZone(first.departAt, trip.timezone), dateInZone(last.arriveAt, trip.timezone))
      cover(dateInZone(first.departAt, first.fromTz || trip.timezone), dateInZone(last.arriveAt, last.toTz || trip.timezone))
    }
    for (const l of legs) {
      const dep = dateInZone(l.departAt, l.fromTz || trip.timezone)
      cover(dep, dateInZone(l.arriveAt, l.toTz || trip.timezone))
      cover(dateInZone(l.departAt, trip.timezone), dateInZone(l.arriveAt, trip.timezone))
      ultimaPartenza.push(dateInZone(l.departAt, trip.timezone), dep)
    }
  }
  for (const t of trip.transports) {
    if (t.departAt && t.arriveAt) cover(dateInZone(t.departAt, trip.timezone), dateInZone(t.arriveAt, trip.timezone))
    const dep = t.departAt ? dateInZone(t.departAt, trip.timezone) : t.departDate
    const arr = t.arriveAt ? dateInZone(t.arriveAt, trip.timezone) : t.arriveDate
    if (dep && arr) cover(dep, arr)
    if (t.mode === 'plane' && dep) ultimaPartenza.push(dep)
  }
  // ritorno: dopo l'ultima partenza in aereo, senza altri alloggi più avanti, le notti fino alla fine sono fuori dal viaggio
  const last = ultimaPartenza.sort().pop()
  if (last && trip.endDate && (!trip.startDate || last > trip.startDate)) {
    const stays = trip.stays ?? []
    for (let d = last, i = 0; d < trip.endDate && i < 40; i++, d = giornoDopo(d)) {
      if (stays.every((s) => s.checkIn <= d)) out.add(d)
    }
  }
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
