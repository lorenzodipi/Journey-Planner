// Calcoli di Oggi (#28, #29, #30): fase del viaggio, ore del meteo, alba/tramonto, pioggia, numeri del recap.
import { gradi } from './formati'
import { airportCity } from './airports'
import { daysBetween, dateAddDays } from './dates'
import { weatherLabel, type DayWeather, type HourWeather } from './weather'
import { nightsOf } from './stays'
import type { Trip } from '../types'
import type { DaySun } from './sun'

export type FaseViaggio = 'pre' | 'during' | 'post'

/** Prima, durante o dopo il viaggio, dalle date nel fuso del viaggio (FRD BR-01). */
export function faseViaggio(trip: Pick<Trip, 'startDate' | 'endDate'>, today: string): FaseViaggio {
  if (daysBetween(today, trip.startDate) > 0) return 'pre'
  if (daysBetween(today, trip.endDate) < 0) return 'post'
  return 'during'
}

const pad = (n: number) => String(n).padStart(2, '0')
export const hhmmOf = (min: number) => `${pad(Math.floor(((min % 1440) + 1440) % 1440 / 60))}:${pad((((min % 1440) + 1440) % 1440) % 60)}`

/** Testo di una durata in minuti: «4 h 38 min», «45 min». */
export function traIl(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  return h > 0 ? `${h} h ${m % 60} min` : `${m} min`
}

/** Momento del giorno a casa: «di notte», «di mattina», «di pomeriggio», «di sera». */
export function momento(hour: number): string {
  if (hour < 6 || hour >= 22) return 'di notte'
  if (hour < 12) return 'di mattina'
  if (hour < 18) return 'di pomeriggio'
  return 'di sera'
}

export interface OraPrevista extends HourWeather {
  date: string
}

/** Le prossime `n` ore a partire dall'ora attuale (oggi e domani). */
export function prossimeOre(days: DayWeather[] | undefined, today: string, hour: number, n = 24): OraPrevista[] {
  if (!days) return []
  const out: OraPrevista[] = []
  for (const d of days) {
    if (d.date < today) continue
    for (const h of d.hours ?? []) {
      if (d.date === today && h.h < hour) continue
      out.push({ ...h, date: d.date })
      if (out.length >= n) return out
    }
  }
  return out
}

const isNight = (h: number, sun: DaySun) => (sun.sunrise !== null && sun.sunset !== null ? h * 60 < sun.sunrise - 30 || h * 60 >= sun.sunset : false)
export const notteAlle = isNight

/** Descrizione: «Nuvoloso, minima 5°» (di notte «Notte limpida» col cielo sereno). */
export function descrizione(code: number, min: number, night: boolean): string {
  const label = night && code <= 1 ? 'Notte limpida' : weatherLabel(code).label
  return `${label}, minima ${gradi(min)}`
}

/** Riga del sole: prima del tramonto «Tramonto tra», dopo «Alba tra» con la barra invertita. */
export function rigaSole(sun: DaySun, tomorrow: DaySun, nowMin: number) {
  if (sun.sunrise === null || sun.sunset === null) return undefined
  if (nowMin >= sun.sunrise && nowMin < sun.sunset) {
    return {
      first: { k: 'Alba', v: hhmmOf(sun.sunrise), down: false },
      second: { k: 'Tramonto', v: hhmmOf(sun.sunset), down: true },
      next: 'Tramonto',
      inText: traIl(sun.sunset - nowMin),
      pct: Math.round(((nowMin - sun.sunrise) / (sun.sunset - sun.sunrise)) * 100),
      moon: false,
    }
  }
  const nextRise = nowMin < sun.sunrise ? sun.sunrise : (tomorrow.sunrise ?? sun.sunrise) + 1440
  const lastSet = nowMin < sun.sunrise ? sun.sunset - 1440 : sun.sunset
  return {
    first: { k: 'Tramonto', v: hhmmOf(lastSet), down: true },
    second: { k: 'Alba', v: hhmmOf(nextRise), down: false },
    next: 'Alba',
    inText: traIl(nextRise - nowMin),
    pct: Math.round(((nowMin - lastSet) / (nextRise - lastSet)) * 100),
    moon: true,
  }
}

/** Avviso di pioggia (soglia proposta in #29: probabilità ≥ 50% o almeno 0,5 mm/h) nelle prossime ore. */
export function avvisoPioggia(hours: OraPrevista[]): { title: string; text: string } | null {
  const wet = (h: OraPrevista) => (h.rain ?? 0) >= 50 || (h.mm ?? 0) >= 0.5
  const i = hours.findIndex(wet)
  if (i < 0) return null
  let j = i
  while (j + 1 < hours.length && wet(hours[j + 1])) j++
  const mm = Math.round(hours.slice(i, j + 1).reduce((s, h) => s + (h.mm ?? 0), 0))
  const from = `${pad(hours[i].h)}:00`
  const to = `${pad((hours[j].h + 1) % 24)}:00`
  return {
    title: `Pioggia dalle ${from}`,
    text: `${mm > 0 ? `Circa ${mm} mm` : 'Probabile'} fino alle ${to}. Porta l'ombrello.`,
  }
}

/** Numeri del recap «Il viaggio in numeri» (#30). */
export function numeriViaggio(trip: Trip) {
  const items = trip.days.flatMap((d) => d.items)
  const st = (s: string | undefined, done?: boolean) => s ?? (done ? 'done' : 'todo')
  const tappeFatte = items.filter((i) => st(i.status, i.done) === 'done').length
  const tappePianificate = items.filter((i) => st(i.status, i.done) !== 'cancelled').length
  const doneIds = new Set(items.filter((i) => st(i.status, i.done) === 'done' && i.placeId).map((i) => i.placeId as string))
  const luoghiVisitati = trip.places.filter((p) => p.status === 'done' || doneIds.has(p.id)).length
  const luoghiSalvati = trip.places.filter((p) => p.status !== 'skipped').length
  const notti = trip.stays.reduce((s, x) => s + nightsOf(x), 0)
  const legs = trip.flights.flatMap((f) => f.legs).sort((a, b) => a.departAt.localeCompare(b.departAt))
  const cities: string[] = []
  for (const l of legs) for (const c of [airportCity(l.from), airportCity(l.to)]) if (cities[cities.length - 1] !== c && !cities.includes(c)) cities.push(c)
  const treni = trip.transports.filter((t) => t.mode === 'train').length
  const metroBus = trip.transports.filter((t) => t.mode === 'metro' || t.mode === 'bus').length
  return { tappeFatte, tappePianificate, luoghiVisitati, luoghiSalvati, notti, alloggi: trip.stays.length, voli: legs.length, cittaVoli: cities, treni, metroBus, spostamenti: legs.length + treni + metroBus }
}

export const domani = (today: string) => dateAddDays(today, 1)
