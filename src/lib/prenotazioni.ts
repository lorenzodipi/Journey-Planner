// Prenotazioni (#40): pillole per tipo, gruppi per giorno, orario e righe compatte.
import type { Booking, BookingType } from '../types'
import { dateInZone, formatInZone } from './flights'

export type FiltroPrenotazioni = 'all' | 'train' | 'restaurant' | 'rental' | 'activity'

export const FILTRI: { v: FiltroPrenotazioni; l: string }[] = [
  { v: 'all', l: 'Tutte' },
  { v: 'train', l: 'Treni' },
  { v: 'restaurant', l: 'Ristoranti' },
  { v: 'rental', l: 'Noleggi' },
  { v: 'activity', l: 'Attività' },
]

/** Treni = train · Ristoranti = restaurant · Noleggi = rental + esim · Attività = activity + ticket; gli altri solo in «Tutte». */
const DI_FILTRO: Record<Exclude<FiltroPrenotazioni, 'all'>, BookingType[]> = {
  train: ['train'],
  restaurant: ['restaurant'],
  rental: ['rental', 'esim'],
  activity: ['activity', 'ticket'],
}

export const nelFiltro = (b: Pick<Booking, 'type'>, f: FiltroPrenotazioni) => f === 'all' || DI_FILTRO[f].includes(b.type)

export interface GruppoGiorno {
  /** «YYYY-MM-DD» oppure «» per le prenotazioni senza data */
  ymd: string
  items: Booking[]
}

/** Per giorno (nel fuso del viaggio), dal più vicino; in fondo quelle senza data. Nel giorno, per orario. */
export function perGiorno(bookings: Booking[], timeZone: string): GruppoGiorno[] {
  const map = new Map<string, Booking[]>()
  for (const b of bookings) {
    const k = b.validFrom ? dateInZone(b.validFrom, timeZone) : ''
    map.set(k, [...(map.get(k) ?? []), b])
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([ymd, items]) => ({ ymd, items: items.sort((a, b) => (a.validFrom ?? '').localeCompare(b.validFrom ?? '') || a.title.localeCompare(b.title, 'it')) }))
}

/** «19:30», oppure «» se la prenotazione vale tutto il giorno (mezzanotte nel fuso del viaggio). */
export function oraPrenotazione(b: Pick<Booking, 'validFrom'>, timeZone: string): string {
  if (!b.validFrom) return ''
  const t = formatInZone(b.validFrom, timeZone)
  return t === '00:00' ? '' : t
}

const PAROLE = ['', 'da solo', 'in due', 'in tre', 'in quattro', 'in cinque', 'in sei']
export const inPersone = (n: number) => PAROLE[n] || `${n} persone`

/** «Gion · in quattro», «Stazione di Kyoto · 4 giorni»: luogo, persone, durata. */
export function sottotitolo(b: Booking, timeZone: string): string {
  const parts: string[] = []
  if (b.place) parts.push(b.place)
  if (b.partySize) parts.push(inPersone(b.partySize))
  if (b.validFrom && b.validTo) {
    const a = dateInZone(b.validFrom, timeZone)
    const z = dateInZone(b.validTo, timeZone)
    if (z > a) parts.push(`${Math.round((Date.parse(z) - Date.parse(a)) / 86400000) + 1} giorni`)
  }
  return parts.join(' · ') || ''
}

