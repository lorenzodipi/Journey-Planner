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

export interface StatDopo {
  id: 'pieno' | 'ore' | 'genere' | 'pasti' | 'lunga' | 'durata' | 'meta'
  l: string
  v: string
  c: string
}

const oreTesto = (min: number) => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m && h < 10 ? `${h} h ${m}` : `${Math.round(min / 60)} h`
}
const giornoBreve = (ymd: string) => {
  const s = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Statistiche per i due blocchi di «Oggi» dopo il viaggio, in ordine di preferenza. Ognuna c'è solo se ha un valore
 * che dice qualcosa (niente zeri): così c'è sempre un'alternativa. L'ultima («Durata») c'è sempre.
 */
export function statisticheDopo(trip: Pick<Trip, 'days' | 'places' | 'startDate' | 'endDate' | 'destination'>): StatDopo[] {
  const fatto = (i: { status?: string; done?: boolean }) => (i.status ?? (i.done ? 'done' : 'todo')) === 'done'
  const attive = (d: Trip['days'][number]) => d.items.filter((i) => i.status !== 'cancelled' && i.status !== 'skipped').length
  const fatte = trip.days.flatMap((d) => d.items.filter(fatto))
  const out: StatDopo[] = []
  const pieno = [...trip.days].sort((a, b) => attive(b) - attive(a) || a.date.localeCompare(b.date))[0]
  if (pieno && attive(pieno) >= 2) out.push({ id: 'pieno', l: 'Giorno più pieno', v: giornoBreve(pieno.date), c: `${attive(pieno)} tappe${pieno.city?.trim() ? ` a ${pieno.city.trim()}` : ''}` })
  const minuti = fatte.reduce((s, i) => s + (i.durationMinutes ?? 0), 0)
  if (minuti >= 60) out.push({ id: 'ore', l: 'Ore in giro', v: oreTesto(minuti), c: `in ${fatte.length} ${fatte.length === 1 ? 'tappa fatta' : 'tappe fatte'}` })
  const visti = new Set(fatte.map((i) => i.placeId).filter(Boolean))
  const conta = new Map<string, number>()
  for (const p of trip.places) if ((p.status === 'done' || visti.has(p.id)) && p.category?.trim()) conta.set(p.category.trim(), (conta.get(p.category.trim()) ?? 0) + 1)
  const genere = [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (genere && genere[1] >= 2) out.push({ id: 'genere', l: 'I più visitati', v: genere[0], c: `${genere[1]} luoghi su ${[...conta.values()].reduce((s, n) => s + n, 0)}` })
  const pasti = fatte.filter((i) => i.kind === 'meal').length
  if (pasti >= 1) out.push({ id: 'pasti', l: 'Pasti fuori', v: String(pasti), c: 'tra ristoranti e locali' })
  const lunga = [...fatte].sort((a, b) => (b.durationMinutes ?? 0) - (a.durationMinutes ?? 0))[0]
  if (lunga && (lunga.durationMinutes ?? 0) >= 60) out.push({ id: 'lunga', l: 'Tappa più lunga', v: oreTesto(lunga.durationMinutes as number), c: lunga.title })
  const giorni = trip.days.length || 1
  out.push({ id: 'durata', l: 'In viaggio', v: `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`, c: `${Math.max(0, giorni - 1)} ${giorni - 1 === 1 ? 'notte' : 'notti'} fuori casa` })
  // sempre almeno due: l'ultima riserva è la meta
  if (out.length < 2) out.push({ id: 'meta', l: 'Meta', v: trip.destination || 'Il viaggio', c: 'il posto che hai visto' })
  return out
}
