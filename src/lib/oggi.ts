// Calcoli di Oggi (#28, #29): fase del viaggio, ore del meteo, alba/tramonto, pioggia.
import { gradi } from './formati'
import { daysBetween } from './dates'
import { weatherLabel, type DayWeather, type HourWeather } from './weather'
import type { DayItem, Trip } from '../types'
import { isClosed, toMin } from './tappa'
import { tzOffsetMinutes, type DaySun } from './sun'
import { t as tt } from '../i18n'

export type FaseViaggio = 'pre' | 'during' | 'post'

/** Ore prima del primo volo in cui Oggi mostra già il viaggio (una partenza all'una di notte si vede la sera prima). */
export const ORE_PRIMA_PARTENZA = 6

/** Il momento da cui il viaggio è «in corso»: la mezzanotte del giorno di partenza a casa, o 6 ore prima del primo volo se viene prima. */
export function inizioViaggio(trip: Pick<Trip, 'startDate' | 'flights'>, homeTz: string): number {
  const [y, m, d] = trip.startDate.split('-').map(Number)
  const wall = Date.UTC(y, m - 1, d)
  let mezzanotte = wall - tzOffsetMinutes(new Date(wall), homeTz) * 60_000
  mezzanotte = wall - tzOffsetMinutes(new Date(mezzanotte), homeTz) * 60_000
  // il primo volo vicino alla partenza (fino a due giorni prima: un volo di notte parte il giorno prima)
  const voli = trip.flights.flatMap((f) => f.legs.map((l) => Date.parse(l.departAt))).filter((t) => Number.isFinite(t) && t >= mezzanotte - 2 * 86_400_000)
  const primo = voli.length ? Math.min(...voli) : null
  return primo === null ? mezzanotte : Math.min(mezzanotte, primo - ORE_PRIMA_PARTENZA * 3_600_000)
}

/**
 * Prima, durante o dopo il viaggio (FRD BR-01). La fine viene dalle date nel fuso del viaggio; l'inizio dal momento di
 * partenza (`inizioViaggio`): il giorno prima, a casa, resta la Home di prima anche se alla destinazione è già il giorno dopo.
 */
export function faseViaggio(trip: Pick<Trip, 'startDate' | 'endDate' | 'flights'>, today: string, now: Date = new Date(), homeTz?: string): FaseViaggio {
  if (daysBetween(today, trip.endDate) < 0) return 'post'
  if (homeTz) return now.getTime() < inizioViaggio(trip, homeTz) ? 'pre' : 'during'
  return daysBetween(today, trip.startDate) > 0 ? 'pre' : 'during'
}

const pad = (n: number) => String(n).padStart(2, '0')
export const hhmmOf = (min: number) => `${pad(Math.floor(((min % 1440) + 1440) % 1440 / 60))}:${pad((((min % 1440) + 1440) % 1440) % 60)}`

/** Testo di una durata in minuti: «4 h 38 min», «45 min». */
export function traIl(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  return h > 0 ? tt('{h} h {v1} min', { h, v1: m % 60 }) : `${m} min`
}

/** Momento del giorno a casa: «di notte», «di mattina», «di pomeriggio», «di sera». */
export function momento(hour: number): string {
  if (hour < 6 || hour >= 22) return tt('di notte')
  if (hour < 12) return tt('di mattina')
  if (hour < 18) return tt('di pomeriggio')
  return tt('di sera')
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
  const label = night && code <= 1 ? tt('Notte limpida') : weatherLabel(code).label
  return tt('{label}, minima {v1}', { label, v1: gradi(min) })
}

/** Riga del sole: prima del tramonto «Tramonto tra», dopo «Alba tra» con la barra invertita. */
export function rigaSole(sun: DaySun, tomorrow: DaySun, nowMin: number) {
  if (sun.sunrise === null || sun.sunset === null) return undefined
  if (nowMin >= sun.sunrise && nowMin < sun.sunset) {
    return {
      first: { k: tt('Alba'), v: hhmmOf(sun.sunrise), down: false },
      second: { k: tt('Tramonto'), v: hhmmOf(sun.sunset), down: true },
      next: tt('Tramonto'),
      inText: traIl(sun.sunset - nowMin),
      pct: Math.round(((nowMin - sun.sunrise) / (sun.sunset - sun.sunrise)) * 100),
      moon: false,
    }
  }
  const nextRise = nowMin < sun.sunrise ? sun.sunrise : (tomorrow.sunrise ?? sun.sunrise) + 1440
  const lastSet = nowMin < sun.sunrise ? sun.sunset - 1440 : sun.sunset
  return {
    first: { k: tt('Tramonto'), v: hhmmOf(lastSet), down: true },
    second: { k: tt('Alba'), v: hhmmOf(nextRise), down: false },
    next: tt('Alba'),
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
    title: tt('Pioggia dalle {from}', { from }),
    text: tt('{v0} fino alle {to}. Porta l\'ombrello.', { v0: mm > 0 ? tt('Circa {mm} mm', { mm }) : tt('Probabile'), to }),
  }
}


/**
 * «Giornata finita» in Oggi: tutte le tappe chiuse (fatte, saltate…), oppure finite tutte le tappe con l'orario **e** nessuna
 * tappa senza orario ancora da fare. Una tappa con l'orario finisce all'ora di fine, se c'è; se no all'inizio più la sua durata
 * (la sua o quella del luogo: `durata`); se non ha durata, un'ora dopo l'inizio. Le tappe senza orario non hanno una fine:
 * finché ce n'è una aperta la giornata non è finita.
 */
export function giornataFinita(
  items: readonly Pick<DayItem, 'status' | 'done' | 'time' | 'endTime' | 'durationMinutes' | 'placeId'>[],
  nowMin: number,
  durata: (i: Pick<DayItem, 'durationMinutes' | 'placeId'>) => number | undefined = (i) => i.durationMinutes,
): boolean {
  if (items.length === 0) return false
  if (items.every(isClosed)) return true
  if (items.some((i) => !isClosed(i) && toMin(i.time ?? undefined) === null)) return false
  const fine = (i: (typeof items)[number]) => {
    const inizio = toMin(i.time ?? undefined)
    if (inizio === null) return 0
    const f = toMin(i.endTime ?? undefined)
    if (f !== null) return f < inizio ? f + 24 * 60 : f
    const d = durata(i)
    return inizio + (d && d > 0 ? d : 60)
  }
  const ultima = items.reduce((m, i) => Math.max(m, fine(i)), 0)
  return ultima > 0 && nowMin >= ultima
}
