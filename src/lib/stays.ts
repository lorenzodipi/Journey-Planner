import { daysBetween, parseYmd, toYmd } from './dates'

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
