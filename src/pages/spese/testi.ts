// Frasi delle spese (mock Fa-27): «Pagata da te · per te, Marta e Sara», «Diviso in tre», giorni «Oggi · gio 26 nov».
import { dateAddDays, daysBetween, parseYmd } from '../../lib/dates'
import { beneficiari, type SpesaVista } from '../../lib/spese'
import type { Traveler, Trip } from '../../types'
import { elenco, LOCALE, t as tt } from '../../i18n'

const PARTS = ['', tt('da solo'), tt('in due'), tt('in tre'), tt('in quattro'), tt('in cinque'), tt('in sei'), tt('in sette'), tt('in otto'), tt('in nove'), tt('in dieci')]
export const inQuanti = (n: number) => PARTS[n] ?? tt('in {n}', { n })

const nome = (travelers: readonly Traveler[], id: string) => travelers.find((t) => t.id === id)?.name.split(/\s+/)[0] ?? 'qualcuno'

/** «per tutti» · «solo tua» · «per te, Marta e Sara» · «per Marta e Sara». */
export function perChi(e: Pick<SpesaVista, 'shares'>, travelers: readonly Traveler[], me: string | undefined): string {
  const who = beneficiari(e, travelers)
  if (travelers.length > 1 && travelers.every((t) => who.includes(t.id))) return tt('per tutti')
  if (me && who.length === 1 && who[0] === me) return tt('solo tua')
  const others = who.filter((id) => id !== me).map((id) => nome(travelers, id))
  return tt('per {v0}', { v0: elenco(me && who.includes(me) ? ['te', ...others] : others) })
}

/** «Pagata da te» / «Pagata da Marta» (vuoto se non si sa). */
export function pagataDa(e: Pick<SpesaVista, 'paidBy' | 'payers'>, travelers: readonly Traveler[], me: string | undefined, maiuscola = true): string {
  const many = e.payers && e.payers.length > 1 ? e.payers.map((p) => p.travelerId) : null
  if (!many && !e.paidBy) return ''
  const who = many ? elenco(many.map((id) => (id === me ? tt('te') : nome(travelers, id)))) : e.paidBy === me ? tt('te') : nome(travelers, e.paidBy as string)
  return tt('{v0} da {who}', { v0: maiuscola ? tt('Pagata') : tt('pagata'), who })
}

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Righe sotto il nome della spesa, sempre su due linee fisse (se c'è scritto qualcosa):
 *  «Pagata da Giorgio e da te» / «Per tutti»; per un alloggio «3 notti · pagata da Giorgio» / «Per tutti». */
export function righeSpesa(e: SpesaVista, trip: Pick<Trip, 'travelers' | 'stays'>, me: string | undefined): string[] {
  const stay = e.source?.kind === 'stay' ? trip.stays.find((s) => s.id === e.source?.id) : undefined
  const nights = stay ? daysBetween(stay.checkIn, stay.checkOut) : 0
  const prima = [nights > 0 ? `${nights} ${nights === 1 ? tt('notte') : tt('notti')}` : '', pagataDa(e, trip.travelers, me, !nights)].filter(Boolean).join(' · ')
  return [prima, perChi(e, trip.travelers, me)].filter(Boolean).map(maiuscola)
}

const wdm = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
const fmt = (ymd: string) => wdm.format(parseYmd(ymd)).replace(/\./g, '')

/** «Oggi · gio 26 nov», «Ieri · mer 25 nov», «Mar 24 nov». */
export function giornoSpese(ymd: string, today: string): string {
  if (ymd === today) return tt('Oggi · {v0}', { v0: fmt(ymd) })
  if (ymd === dateAddDays(today, -1)) return tt('Ieri · {v0}', { v0: fmt(ymd) })
  const s = fmt(ymd)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** «21 nov – 9 dic». */
export function intervallo(start: string, end: string): string {
  const dm = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
  const f = (ymd: string) => dm.format(parseYmd(ymd)).replace(/\./g, '')
  return start === end ? f(start) : `${f(start)} – ${f(end)}`
}

/** «fino al 17 nov». */
export const finoAl = (ymd: string) => tt('fino al {v0}', { v0: new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' }).format(parseYmd(ymd)).replace(/\./g, '') })

/** Dove si apre una spesa nata da un'altra voce. */
export function sorgente(e: SpesaVista, trip: Pick<Trip, 'days'>): { href: string; label: string } | null {
  switch (e.source?.kind) {
    case 'stay':
      return { href: '/altro/alloggi', label: tt('Modifica in Alloggi') }
    case 'flight':
    case 'transport':
      return { href: '/altro/trasporti', label: e.source.kind === 'flight' ? tt('Modifica nei Voli') : tt('Modifica in Trasporti') }
    case 'booking':
      return { href: '/altro/prenotazioni', label: tt('Modifica in Prenotazioni') }
    case 'day_item': {
      const day = trip.days.find((d) => d.items.some((i) => i.id === e.source?.id))
      return day ? { href: `/giorni/${day.id}`, label: tt('Apri la tappa') } : null
    }
    default:
      return null
  }
}

/** «Da dare a Gaia» / «Da ricevere da Gaia»; a conti chiusi «Dati a Gaia» / «Ricevuti da Gaia». */
export function testoVerso(d: { verso: 'devo' | 'devono'; stato: string }, chi: string): string {
  if (d.stato === 'pagato') return d.verso === 'devo' ? tt('Dati a {chi}', { chi }) : tt('Ricevuti da {chi}', { chi })
  return d.verso === 'devo' ? tt('Da dare a {chi}', { chi }) : tt('Da ricevere da {chi}', { chi })
}
