// Frasi delle spese (mock Fa-27): «Pagata da te · per te, Marta e Sara», «Diviso in tre», giorni «Oggi · gio 26 nov».
import { dateAddDays, daysBetween, parseYmd } from '../../lib/dates'
import { beneficiari, type SpesaVista } from '../../lib/spese'
import type { Traveler, Trip } from '../../types'

const PARTS = ['', 'da solo', 'in due', 'in tre', 'in quattro', 'in cinque', 'in sei', 'in sette', 'in otto', 'in nove', 'in dieci']
export const inQuanti = (n: number) => PARTS[n] ?? `in ${n}`
const NUM = ['', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci']

/** «Spese divise tra tutte e quattro le persone del viaggio.» */
export function tutteLePersone(n: number): string {
  return n === 2 ? 'Spese divise tra tutte e due le persone del viaggio.' : n <= 10 ? `Spese divise tra tutte e ${NUM[n]} le persone del viaggio.` : `Spese divise tra tutte le ${n} persone del viaggio.`
}

const nome = (travelers: readonly Traveler[], id: string) => travelers.find((t) => t.id === id)?.name.split(/\s+/)[0] ?? 'qualcuno'
const elenco = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`)

/** «per tutti» · «solo tua» · «per te, Marta e Sara» · «per Marta e Sara». */
export function perChi(e: Pick<SpesaVista, 'shares'>, travelers: readonly Traveler[], me: string | undefined): string {
  const who = beneficiari(e, travelers)
  if (travelers.length > 1 && travelers.every((t) => who.includes(t.id))) return 'per tutti'
  if (me && who.length === 1 && who[0] === me) return 'solo tua'
  const others = who.filter((id) => id !== me).map((id) => nome(travelers, id))
  return `per ${elenco(me && who.includes(me) ? ['te', ...others] : others)}`
}

/** «Pagata da te» / «Pagata da Marta» (vuoto se non si sa). */
export function pagataDa(e: Pick<SpesaVista, 'paidBy'>, travelers: readonly Traveler[], me: string | undefined, maiuscola = true): string {
  if (!e.paidBy) return ''
  const who = e.paidBy === me ? 'te' : nome(travelers, e.paidBy)
  return `${maiuscola ? 'Pagata' : 'pagata'} da ${who}`
}

/** Seconda riga della spesa: «3 notti · pagata da Giorgio · per tutti». */
export function rigaSpesa(e: SpesaVista, trip: Pick<Trip, 'travelers' | 'stays'>, me: string | undefined): string {
  const stay = e.source?.kind === 'stay' ? trip.stays.find((s) => s.id === e.source?.id) : undefined
  const nights = stay ? daysBetween(stay.checkIn, stay.checkOut) : 0
  const parts = [nights > 0 ? `${nights} ${nights === 1 ? 'notte' : 'notti'}` : '', pagataDa(e, trip.travelers, me, !nights), perChi(e, trip.travelers, me)].filter(Boolean)
  const s = parts.join(' · ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const wdm = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const fmt = (ymd: string) => wdm.format(parseYmd(ymd)).replace(/\./g, '')

/** «Oggi · gio 26 nov», «Ieri · mer 25 nov», «Mar 24 nov». */
export function giornoSpese(ymd: string, today: string): string {
  if (ymd === today) return `Oggi · ${fmt(ymd)}`
  if (ymd === dateAddDays(today, -1)) return `Ieri · ${fmt(ymd)}`
  const s = fmt(ymd)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** «21 nov – 9 dic». */
export function intervallo(start: string, end: string): string {
  const dm = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })
  const f = (ymd: string) => dm.format(parseYmd(ymd)).replace(/\./g, '')
  return start === end ? f(start) : `${f(start)} – ${f(end)}`
}

/** «fino al 17 nov». */
export const finoAl = (ymd: string) => `fino al ${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(parseYmd(ymd)).replace(/\./g, '')}`

/** Dove si apre una spesa nata da un'altra voce. */
export function sorgente(e: SpesaVista, trip: Pick<Trip, 'days'>): { href: string; label: string } | null {
  switch (e.source?.kind) {
    case 'stay':
      return { href: '/altro/alloggi', label: 'Modifica in Alloggi' }
    case 'flight':
    case 'transport':
      return { href: '/altro/trasporti', label: e.source.kind === 'flight' ? 'Modifica nei Voli' : 'Modifica in Trasporti' }
    case 'booking':
      return { href: '/altro/prenotazioni', label: 'Modifica in Prenotazioni' }
    case 'day_item': {
      const day = trip.days.find((d) => d.items.some((i) => i.id === e.source?.id))
      return day ? { href: `/giorni/${day.id}`, label: 'Apri la tappa' } : null
    }
    default:
      return null
  }
}
