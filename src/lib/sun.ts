// Alba e tramonto calcolati in locale (nessuna API, funziona offline).
// A fine novembre in Giappone il sole tramonta verso le 16:30: molti templi chiudono prima.
import { getTimes } from 'suncalc'

/** Scarto dall'UTC in minuti del fuso IANA indicato, nell'istante dato. */
export function tzOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const asUtc = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second)
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** Minuti trascorsi dalla mezzanotte, nell'ora locale del fuso indicato. */
export function minutesOfDay(d: Date, timeZone: string): number {
  const off = tzOffsetMinutes(d, timeZone)
  const local = new Date(d.getTime() + off * 60_000)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export interface DaySun {
  /** Minuti dalla mezzanotte locale, o null se il sole non sorge/tramonta (alte latitudini). */
  sunrise: number | null
  sunset: number | null
  alwaysUp: boolean
  alwaysDown: boolean
}

/** Alba e tramonto del giorno di calendario `ymd` ("YYYY-MM-DD") alle coordinate date. */
export function sunForDay(ymd: string, lat: number, lng: number, timeZone: string): DaySun {
  const approx = new Date(`${ymd}T12:00:00Z`)
  const offset = tzOffsetMinutes(approx, timeZone)
  const localNoon = new Date(approx.getTime() - offset * 60_000)
  const t = getTimes(localNoon, lat, lng, 0, offset)
  const sunrise = t.sunrise ? minutesOfDay(t.sunrise, timeZone) : null
  const sunset = t.sunset ? minutesOfDay(t.sunset, timeZone) : null
  // un tramonto prima dell'alba vuol dire che posizione e fuso non combaciano: meglio nessun orario che uno sbagliato
  if (sunrise !== null && sunset !== null && sunset <= sunrise && !t.alwaysUp && !t.alwaysDown) {
    return { sunrise: null, sunset: null, alwaysUp: false, alwaysDown: false }
  }
  return {
    sunrise,
    sunset,
    alwaysUp: Boolean(t.alwaysUp),
    alwaysDown: Boolean(t.alwaysDown),
  }
}
