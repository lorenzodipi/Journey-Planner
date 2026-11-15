// Gestione del viaggio (#59): impatto di un cambio di date, città previste, spostamento delle date per il modello.
import type { Trip } from '../types'
import { daysBetween, parseYmd, toYmd } from './dates'
import { dateInZone } from './flights'
import { t as tt } from '../i18n'

const plur = (n: number, uno: string, molti: string) => `${n} ${n === 1 ? uno : molti}`

/** Cosa cambia se le date diventano `start`–`end` (TRIP-007): righe da mostrare prima di salvare. Vuoto = nessun impatto. */
export function impattoDate(trip: Pick<Trip, 'days' | 'stays' | 'flights' | 'transports' | 'bookings' | 'timezone'>, start: string, end: string): string[] {
  const fuori = (ymd: string) => ymd < start || ymd > end
  const out: string[] = []
  const conTappe = trip.days.filter((d) => fuori(d.date) && d.items.length > 0)
  const vuoti = trip.days.filter((d) => fuori(d.date) && d.items.length === 0)
  if (conTappe.length) out.push(tt('{v0} ({v1}): tornano se rimetti le date', { v0: plur(conTappe.length, tt('giorno con tappe verrà tolto'), tt('giorni con tappe verranno tolti')), v1: plur(conTappe.reduce((n, d) => n + d.items.length, 0), tt('tappa'), tt('tappe')) }))
  if (vuoti.length) out.push(`${plur(vuoti.length, tt('giorno vuoto verrà tolto'), tt('giorni vuoti verranno tolti'))}`)
  const stays = trip.stays.filter((s) => s.checkIn < start || s.checkOut > end)
  if (stays.length) out.push(tt('{v0} fuori dalle nuove date', { v0: plur(stays.length, tt('alloggio'), tt('alloggi')) }))
  const voli = trip.flights.filter((f) => f.legs.some((l) => fuori(dateInZone(l.departAt, l.fromTz)) || fuori(dateInZone(l.arriveAt, l.toTz))))
  if (voli.length) out.push(tt('{v0} fuori dalle nuove date', { v0: plur(voli.length, tt('volo'), tt('voli')) }))
  const trasp = trip.transports.filter((t) => (t.departAt && fuori(dateInZone(t.departAt, trip.timezone))) || (t.departDate && fuori(t.departDate)))
  if (trasp.length) out.push(tt('{v0} fuori dalle nuove date', { v0: plur(trasp.length, tt('trasporto'), tt('trasporti')) }))
  const pren = trip.bookings.filter((b) => b.validFrom && fuori(dateInZone(b.validFrom, trip.timezone)))
  if (pren.length) out.push(tt('{v0} fuori dalle nuove date', { v0: plur(pren.length, tt('prenotazione'), tt('prenotazioni')) }))
  return out
}

/** Città previste in ordine cronologico, senza ripetere due volte di fila la stessa (HOME-004). */
export function cittaPreviste(trip: Pick<Trip, 'days'>): string[] {
  const out: string[] = []
  for (const d of [...trip.days].sort((a, b) => a.date.localeCompare(b.date))) {
    const c = d.city.trim()
    if (c && out[out.length - 1] !== c) out.push(c)
  }
  return out
}

/** Sposta una data «YYYY-MM-DD» di `giorni` giorni. */
export function spostaData(ymd: string, giorni: number): string {
  const d = parseYmd(ymd)
  d.setDate(d.getDate() + giorni)
  return toYmd(d)
}

/** Giorni di scarto tra l'inizio del viaggio originale e quello del nuovo. */
export const scartoDate = (vecchioInizio: string, nuovoInizio: string) => daysBetween(vecchioInizio, nuovoInizio)

/** Nomi o email doppi tra i partecipanti (TRIP-005). */
export function doppi(valori: string[]): string[] {
  const visti = new Set<string>()
  const out: string[] = []
  for (const v of valori.map((x) => x.trim().toLowerCase()).filter(Boolean)) {
    if (visti.has(v) && !out.includes(v)) out.push(v)
    visti.add(v)
  }
  return out
}
