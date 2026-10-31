// Gestione del viaggio (#59): impatto di un cambio di date, città previste, spostamento delle date per il modello.
import type { Trip } from '../types'
import { daysBetween, parseYmd, toYmd } from './dates'
import { dateInZone } from './flights'

const plur = (n: number, uno: string, molti: string) => `${n} ${n === 1 ? uno : molti}`

/** Cosa cambia se le date diventano `start`–`end` (TRIP-007): righe da mostrare prima di salvare. Vuoto = nessun impatto. */
export function impattoDate(trip: Pick<Trip, 'days' | 'stays' | 'flights' | 'transports' | 'bookings' | 'timezone'>, start: string, end: string): string[] {
  const fuori = (ymd: string) => ymd < start || ymd > end
  const out: string[] = []
  const conTappe = trip.days.filter((d) => fuori(d.date) && d.items.length > 0)
  const vuoti = trip.days.filter((d) => fuori(d.date) && d.items.length === 0)
  if (conTappe.length) out.push(`${plur(conTappe.length, 'giorno con tappe verrà tolto', 'giorni con tappe verranno tolti')} (${plur(conTappe.reduce((n, d) => n + d.items.length, 0), 'tappa', 'tappe')}): tornano se rimetti le date`)
  if (vuoti.length) out.push(`${plur(vuoti.length, 'giorno vuoto verrà tolto', 'giorni vuoti verranno tolti')}`)
  const stays = trip.stays.filter((s) => s.checkIn < start || s.checkOut > end)
  if (stays.length) out.push(`${plur(stays.length, 'alloggio', 'alloggi')} fuori dalle nuove date`)
  const voli = trip.flights.filter((f) => f.legs.some((l) => fuori(dateInZone(l.departAt, l.fromTz)) || fuori(dateInZone(l.arriveAt, l.toTz))))
  if (voli.length) out.push(`${plur(voli.length, 'volo', 'voli')} fuori dalle nuove date`)
  const trasp = trip.transports.filter((t) => (t.departAt && fuori(dateInZone(t.departAt, trip.timezone))) || (t.departDate && fuori(t.departDate)))
  if (trasp.length) out.push(`${plur(trasp.length, 'trasporto', 'trasporti')} fuori dalle nuove date`)
  const pren = trip.bookings.filter((b) => b.validFrom && fuori(dateInZone(b.validFrom, trip.timezone)))
  if (pren.length) out.push(`${plur(pren.length, 'prenotazione', 'prenotazioni')} fuori dalle nuove date`)
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
