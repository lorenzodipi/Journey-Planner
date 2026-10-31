// Prenotazioni (#40): pillole per tipo, gruppi per giorno, orario e righe compatte.
import type { Booking, BookingStatus, BookingType, Trip } from '../types'
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


// ---- #53: prenotazioni = tappe con file ----

export const STATO_LABEL: Record<BookingStatus, string> = { to_confirm: 'Da confermare', confirmed: 'Confermata', cancelled: 'Cancellata' }
export const statoDi = (b: Pick<Booking, 'status'>): BookingStatus => b.status ?? 'confirmed'

export interface TappaScelta {
  itemId: string
  title: string
  date: string
  city: string
  time?: string
  /** stesso giorno della prenotazione */
  stessoGiorno: boolean
  /** stesso luogo (nome) della prenotazione */
  stessoLuogo: boolean
}

/** Tappe tra cui scegliere: prima quelle dello stesso giorno e dello stesso luogo, poi le altre per data. */
export function tappePerScelta(trip: Trip, dataPrenotazione: string, luogo: string): TappaScelta[] {
  const l = luogo.trim().toLowerCase()
  const out: TappaScelta[] = []
  for (const d of trip.days)
    for (const it of d.items) {
      const nome = (trip.places.find((p) => p.id === it.placeId)?.name ?? '').toLowerCase()
      out.push({
        itemId: it.id, title: it.title, date: d.date, city: d.city, time: it.time,
        stessoGiorno: !!dataPrenotazione && d.date === dataPrenotazione,
        stessoLuogo: !!l && (nome.includes(l) || it.title.toLowerCase().includes(l) || d.city.toLowerCase() === l),
      })
    }
  const rank = (t: TappaScelta) => (t.stessoGiorno && t.stessoLuogo ? 0 : t.stessoGiorno ? 1 : t.stessoLuogo ? 2 : 3)
  return out.sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date) || (a.time ?? '99').localeCompare(b.time ?? '99'))
}

export const tappeDi = (trip: Trip, bookingId: string): string[] => (trip.bookingLinks ?? []).filter((l) => l.bookingId === bookingId).map((l) => l.itemId)

/** Giorno (data) di una tappa. */
export function giornoDellaTappa(trip: Trip, itemId: string): { date: string; title: string } | undefined {
  for (const d of trip.days) {
    const it = d.items.find((x) => x.id === itemId)
    if (it) return { date: d.date, title: it.title }
  }
  return undefined
}

/** Tappe collegate che stanno in un giorno diverso dalla data della prenotazione (BOOK-025). */
export function tappeInAltroGiorno(trip: Trip, bookingId: string, nuovaData: string): { itemId: string; title: string; date: string }[] {
  if (!nuovaData) return []
  return tappeDi(trip, bookingId)
    .map((id) => ({ itemId: id, ...(giornoDellaTappa(trip, id) ?? { date: '', title: '' }) }))
    .filter((t) => t.date && t.date !== nuovaData)
}

export type QuandoPrenotazione = 'ok' | 'da-pianificare' | 'fuori-periodo'
export function quando(b: Pick<Booking, 'validFrom'>, trip: Pick<Trip, 'startDate' | 'endDate' | 'timezone'>): QuandoPrenotazione {
  if (!b.validFrom) return 'da-pianificare'
  const d = dateInZone(b.validFrom, trip.timezone)
  return (trip.startDate && d < trip.startDate) || (trip.endDate && d > trip.endDate) ? 'fuori-periodo' : 'ok'
}

export interface FiltriArchivio {
  q: string
  stato: BookingStatus | 'all'
  allegati: 'all' | 'con' | 'senza'
}
export const FILTRI_VUOTI: FiltriArchivio = { q: '', stato: 'all', allegati: 'all' }

export function filtraArchivio(bookings: Booking[], f: FiltriArchivio): Booking[] {
  const q = f.q.trim().toLowerCase()
  return bookings.filter(
    (b) =>
      (f.stato === 'all' || statoDi(b) === f.stato) &&
      (f.allegati === 'all' || (f.allegati === 'con') === !!b.filePath) &&
      (!q || [b.title, b.place, b.provider, b.code, b.detail, b.notes].some((x) => x?.toLowerCase().includes(q))),
  )
}

/** Dati mancanti da segnalare (BOOK-012): senza data, senza tappa, senza file. */
export function mancanti(trip: Trip, b: Booking): string[] {
  const out: string[] = []
  if (!b.validFrom) out.push('Senza data')
  if (trip.bookingLinks && tappeDi(trip, b.id).length === 0) out.push('Senza tappa')
  if (!b.filePath) out.push('Senza file')
  return out
}

export interface PrenotazioneDelGiorno {
  booking: Booking
  /** tappa del giorno a cui è collegata, se c'è */
  tappa?: { id: string; title: string }
}

/** Prenotazioni di un giorno (BOOK-021): quelle con la data del giorno e quelle collegate a una sua tappa, senza doppioni. */
export function prenotazioniDelGiorno(trip: Trip, day: { date: string; items: { id: string; title: string }[] }): PrenotazioneDelGiorno[] {
  const out: PrenotazioneDelGiorno[] = []
  for (const b of trip.bookings) {
    const via = day.items.find((it) => tappeDi(trip, b.id).includes(it.id))
    const dellaData = !!b.validFrom && dateInZone(b.validFrom, trip.timezone) === day.date
    if (via) out.push({ booking: b, tappa: { id: via.id, title: via.title } })
    else if (dellaData) out.push({ booking: b })
  }
  return out.sort((a, b) => (a.booking.validFrom ?? '').localeCompare(b.booking.validFrom ?? ''))
}
