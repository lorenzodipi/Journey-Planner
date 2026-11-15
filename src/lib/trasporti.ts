// Trasporti per il biglietto orizzontale (#37): raggruppati per data, riassunto di durata, fermate e prezzo.
import type { Day, Transport, Trip } from '../types'
import { dateInZone } from './flights'
import { earliestFirst, formatWhen, transportWhen, whenKey, type When } from './logistics'
import { durataLunga } from './voli'
import { LOCALE, t as tt } from '../i18n'

export const MODE_NOME: Record<Transport['mode'], string> = {
  train: tt('Treno'), metro: tt('Metro'), bus: tt('Autobus'), taxi: tt('Taxi'), walk: tt('A piedi'), car: tt('Auto'), plane: tt('Aereo'), ferry: tt('Traghetto'), other: tt('Trasporto'),
}

/** «Haruka 33» se c'è il nome, altrimenti «Treno · Kyoto → Osaka». */
export function nomeTrasporto(t: Transport): string {
  return t.title?.trim() || `${MODE_NOME[t.mode]} ${t.from} → ${t.to}`
}

/** «diretto», «una fermata», «2 cambi»: solo se si sa (fermate impostate). */
export function fermate(t: Transport): string {
  if (t.stops === undefined) return ''
  if (t.stops === 0) return 'diretto'
  return t.stops === 1 ? tt('una fermata') : tt('{stops} fermate', { stops: t.stops })
}

export function oraDi(w: When | null): string {
  return w?.time ?? ''
}

export interface Giorno {
  key: string
  title: string
  items: Transport[]
}

const giornoLungo = (ymd: string) => {
  const s = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Raggruppati per data di partenza («Dom 22 nov»); chi non ha la data sta in fondo, «Senza data». */
export function perData(trip: Pick<Trip, 'transports' | 'timezone' | 'days'>): Giorno[] {
  const sorted = earliestFirst(trip.transports, (x) => whenKey(transportWhen(x, trip.timezone, trip.days).depart))
  const groups = new Map<string, Transport[]>()
  for (const x of sorted) {
    const w = transportWhen(x, trip.timezone, trip.days).depart
    const key = w?.date ?? ''
    groups.set(key, [...(groups.get(key) ?? []), x])
  }
  return [...groups.entries()].map(([key, items]) => ({ key: key || 'senza-data', title: key ? giornoLungo(key) : tt('Senza data'), items }))
}

/** Durata «1 h 20» / «45 min» se partenza e arrivo hanno l'ora. */
export function durataTrasporto(t: Transport): string {
  if (!t.departAt || !t.arriveAt) return ''
  const m = Math.round((Date.parse(t.arriveAt) - Date.parse(t.departAt)) / 60000)
  return m > 0 ? durataLunga(m) : ''
}

export interface Prezzo {
  totale: number | null
  aTesta: number | null
  persone: number
}

/** Prezzo totale e a testa: «a persona» = costo × passeggeri, «totale» = costo diviso passeggeri. */
export function prezzoDi(t: Transport, viaggiatori: number): Prezzo {
  const persone = t.forTravelers?.length ? t.forTravelers.length : viaggiatori
  if (t.cost == null) return { totale: null, aTesta: null, persone }
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
  return t.scope === 'per_person' ? { totale: round(t.cost * persone), aTesta: t.cost, persone } : { totale: t.cost, aTesta: persone > 0 ? round(t.cost / persone) : null, persone }
}

/** Per «Altro»: «7 treni e autobus · 2 da pagare». */
export function riepilogoTrasporti(list: Transport[]): string {
  const n = list.length
  const da = list.filter((t) => !t.bought).length
  return `${n} ${n === 1 ? tt('trasporto') : tt('trasporti')}${da > 0 ? tt(' · {da} da pagare', { da }) : ''}`
}

export { formatWhen, dateInZone }
export type { Day }
