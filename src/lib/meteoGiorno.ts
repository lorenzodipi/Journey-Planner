// Meteo del giorno per città (#65, DAY-003, DAY-048, HOME-007).
// Il meteo principale segue dove sei secondo il programma: la città cambia all'orario della prima tappa nella nuova città.
import type { Day, DayItem, Trip } from '../types'
import { gradi } from './formati'
import { ora } from './formati'
import { toMin } from './tappa'
import { weatherLabel, type DayWeather, type HourWeather } from './weather'

/** Città di una tappa: quella del luogo collegato, altrimenti quella del giorno. */
export function cittaTappa(trip: Pick<Trip, 'places' | 'destination'>, day: Pick<Day, 'city'>, item: Pick<DayItem, 'placeId'>): string {
  const p = item.placeId ? trip.places.find((x) => x.id === item.placeId) : undefined
  return p?.city?.trim() || day.city?.trim() || trip.destination
}

export interface TrattoCitta {
  city: string
  /** minuti dalla mezzanotte da cui vale (null = dopo la città precedente, senza orario) */
  da: number | null
}

/** Le città del giorno nell'ordine del programma, ciascuna con l'ora da cui vale. */
export function cittaDelGiorno(trip: Pick<Trip, 'places' | 'destination'>, day: Pick<Day, 'city' | 'items'>): TrattoCitta[] {
  const items = [...day.items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const out: TrattoCitta[] = []
  for (const it of items) {
    const city = cittaTappa(trip, day, it)
    if (out.length && out[out.length - 1].city.toLowerCase() === city.toLowerCase()) continue
    if (out.some((t) => t.city.toLowerCase() === city.toLowerCase())) continue // torna in una città già vista: resta lì
    out.push({ city, da: out.length === 0 ? 0 : toMin(it.time) })
  }
  if (out.length === 0) out.push({ city: day.city?.trim() || trip.destination, da: 0 })
  return out
}

/** Indice della città «adesso» (null = non è oggi: la prima). */
export function indiceCittaAdesso(tratti: TrattoCitta[], nowMin: number | null): number {
  if (nowMin === null) return 0
  let idx = 0
  tratti.forEach((t, i) => {
    if (t.da !== null && t.da <= nowMin) idx = i
  })
  return idx
}

export function oraDelMeteo(day: DayWeather | undefined, hour: number): HourWeather | undefined {
  return day?.hours?.find((h) => h.h === hour) ?? day?.hours?.find((h) => h.h > hour) ?? day?.hours?.[day.hours.length - 1]
}

/** «14° · nuvoloso alle 15:30» per una tappa, dalla previsione della sua città. */
export function meteoDellaTappa(giorniCitta: DayWeather[] | undefined, date: string, time: string | undefined): string | null {
  const m = toMin(time)
  if (m === null) return null
  const h = oraDelMeteo(giorniCitta?.find((d) => d.date === date), Math.floor(m / 60))
  if (!h) return null
  return `${gradi(h.t)} · ${weatherLabel(h.code).label.toLowerCase()} alle ${ora(time)}`
}

/** Precipitazione totale prevista nel giorno (mm). */
export const mmDelGiorno = (d: DayWeather | undefined): number => Math.round((d?.hours ?? []).reduce((s, h) => s + (h.mm ?? 0), 0) * 10) / 10
