// Pagina Viaggi (#43, mock Fa-12): stato, ordine, scena della copertina e riga finale di ogni viaggio.
import { daysBetween } from './dates'
import { formatMoney } from './money'
import { tripToday } from './today'
import type { Trip } from '../types'

export type StatoViaggio = 'prossimo' | 'incorso' | 'concluso'

export const STATO_TESTO: Record<StatoViaggio, string> = { prossimo: 'Prossimo', incorso: 'In corso', concluso: 'Concluso' }

export function statoViaggio(trip: Pick<Trip, 'startDate' | 'endDate' | 'timezone'>, now?: Date): StatoViaggio {
  const today = tripToday(trip, now)
  if (today < trip.startDate) return 'prossimo'
  if (today > trip.endDate) return 'concluso'
  return 'incorso'
}

/** In corso, poi i prossimi dal più vicino, poi i conclusi dal più recente. */
export function ordinaViaggi<T extends Pick<Trip, 'startDate' | 'endDate' | 'timezone'>>(trips: readonly T[], now?: Date): T[] {
  const rank: Record<StatoViaggio, number> = { incorso: 0, prossimo: 1, concluso: 2 }
  return [...trips].sort((a, b) => {
    const sa = statoViaggio(a, now)
    const sb = statoViaggio(b, now)
    if (sa !== sb) return rank[sa] - rank[sb]
    return sa === 'concluso' ? b.endDate.localeCompare(a.endDate) : a.startDate.localeCompare(b.startDate)
  })
}

export type Scena = 'tempio' | 'mare' | 'citta' | 'natura' | 'panorama'

/** Scena della copertina dal paese del viaggio (Giappone → tempio, mare → barca, città); ripiego generico. */
export function scenaDelViaggio(trip: Pick<Trip, 'originCountry' | 'destination' | 'title' | 'countries'>): Scena {
  const codes = (trip.countries ?? []).map((c) => c.country.toUpperCase())
  if (codes.includes('JP')) return 'tempio'
  const text = `${trip.title} ${trip.destination}`.toLowerCase()
  if (/giappone|japan|tokyo|kyoto|osaka/.test(text)) return 'tempio'
  if (/mare|isol[ae]|spiagg|crociera|maldive|bali|grecia|caraib|sardegna|sicilia|canarie|zanzibar/.test(text)) return 'mare'
  if (/new york|londra|parigi|berlino|roma|milano|barcellona|amsterdam|city|citt/.test(text)) return 'citta'
  if (/island|iceland|islanda|norvegia|alpi|dolomiti|trek|parco|patagonia/.test(text)) return 'natura'
  return 'panorama'
}

/** Riga finale: «Tra 23 giorni · Budget 5.000,00 €» · «In corso · oggi a Kyoto» · «Spesi 1.240,00 €». */
export function rigaFinale(trip: Pick<Trip, 'startDate' | 'endDate' | 'timezone' | 'days' | 'destination' | 'budgetLimit' | 'baseCurrency'>, speso: number, now?: Date): string {
  const stato = statoViaggio(trip, now)
  const today = tripToday(trip, now)
  if (stato === 'prossimo') {
    const n = daysBetween(today, trip.startDate)
    const quando = n === 1 ? 'Domani' : `Tra ${n} giorni`
    return trip.budgetLimit ? `${quando} · Budget ${formatMoney(trip.budgetLimit, trip.baseCurrency)}` : quando
  }
  if (stato === 'incorso') {
    const city = trip.days.find((d) => d.date === today)?.city || trip.destination
    return city ? `In corso · oggi a ${city}` : 'In corso'
  }
  return `Spesi ${formatMoney(speso, trip.baseCurrency)}`
}
