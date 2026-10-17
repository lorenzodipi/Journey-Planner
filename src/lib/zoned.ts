import { tzOffsetMinutes } from './sun'

// Data e ora "da orologio" in un fuso IANA <-> istante assoluto (ISO UTC).
// Servono ai voli e ai trasporti: l'utente scrive l'orario locale dell'aeroporto o della
// stazione, il database conserva l'istante, e durate e scali si calcolano senza errori.

export interface Zoned {
  date: string // YYYY-MM-DD
  time: string // HH:MM
}

/** Istante ISO (UTC) corrispondente a una data e un'ora locali del fuso indicato. */
export function zonedToInstant(date: string, time: string, timeZone: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  // Due passaggi: il primo stima lo scarto, il secondo lo corregge vicino ai cambi d'ora.
  const first = wall - tzOffsetMinutes(new Date(wall), timeZone) * 60_000
  const second = wall - tzOffsetMinutes(new Date(first), timeZone) * 60_000
  return new Date(second).toISOString()
}

/** Data e ora locali del fuso indicato per un istante. */
export function instantToZoned(iso: string, timeZone: string): Zoned {
  const at = new Date(iso)
  const local = new Date(at.getTime() + tzOffsetMinutes(at, timeZone) * 60_000)
  const date = local.toISOString().slice(0, 10)
  const time = local.toISOString().slice(11, 16)
  return { date, time }
}

/** Vale se la stringa è una data+ora completa e valida. */
export function isCompleteZoned(date: string, time: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)
}
