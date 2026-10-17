// Voli con più tratte e scali. Gli orari sono istanti ISO 8601 (con offset o Z),
// quindi durate e scali si calcolano correttamente anche tra fusi diversi.
// Per mostrare un orario nel fuso dell'aeroporto si usa `formatInZone`.

export interface Leg {
  depart: string
  arrive: string
}

const MS_PER_MIN = 60_000

export function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_MIN)
}

/** Durata del volo di una tratta, in minuti. */
export function legDuration(leg: Leg): number {
  return minutesBetween(leg.depart, leg.arrive)
}

/** Durata dello scalo tra due tratte consecutive, in minuti. */
export function layover(prev: Leg, next: Leg): number {
  return minutesBetween(prev.arrive, next.depart)
}

/** Durata totale di un viaggio in aereo (dal primo decollo all'ultimo atterraggio). */
export function totalTravelTime(legs: Leg[]): number {
  if (legs.length === 0) return 0
  return minutesBetween(legs[0].depart, legs[legs.length - 1].arrive)
}

/** 605 -> "10h 05m" */
export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? '-' : ''
  const m = Math.abs(minutes)
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return h > 0 ? `${sign}${h}h ${mm}m` : `${sign}${mm}m`
}

/** Orario "HH:MM" di un istante nel fuso IANA indicato (es. "Asia/Tokyo"). */
export function formatInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

/** Data "YYYY-MM-DD" di un istante nel fuso indicato. */
export function dateInZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
  return parts // en-CA produce già YYYY-MM-DD
}

/** Giorni di differenza tra la data di partenza e quella di arrivo, ciascuna nel proprio fuso. */
export function dayOffset(leg: Leg, fromTz: string, toTz: string): number {
  const a = Date.parse(`${dateInZone(leg.depart, fromTz)}T00:00:00Z`)
  const b = Date.parse(`${dateInZone(leg.arrive, toTz)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/** "ven 21 nov" di un istante nel fuso indicato. */
export function formatDateInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('it-IT', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso))
}
