// Riepiloghi calcolati per la pagina Altro (#42, mock Fa-36).
import { formatShort } from './dates'
import { mioAvanzamento } from './checklist'
import { currencySymbol, formatMoney, round2, tripCurrencies } from './money'
import type { Trip } from '../types'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Città del viaggio, nell'ordine dei giorni, senza ripetizioni: «Kyoto · Osaka · Kanazawa». */
export function cittaDelViaggio(trip: Pick<Trip, 'days'>): string {
  return [...new Set(trip.days.map((d) => d.city.trim()).filter(Boolean))].join(' · ')
}

/** «21 nov – 9 dic 2026 · 19 giorni». */
export function periodo(trip: Pick<Trip, 'startDate' | 'endDate' | 'days'>): string {
  return `${formatShort(trip.startDate)} – ${formatShort(trip.endDate)} · ${plural(trip.days.length, 'giorno', 'giorni')}`
}

/** «Budget 5.000,00 € · valuta di casa EUR, viaggio in JPY» (con più paesi: tutte le valute del viaggio). */
export function rigaBudgetValute(trip: Pick<Trip, 'budgetLimit' | 'baseCurrency' | 'localCurrency' | 'fxRates' | 'countries'>): string {
  const base = trip.baseCurrency
  const altre = tripCurrencies(trip).filter((c) => c !== base)
  const valute = altre.length ? `valuta di casa ${base}, viaggio in ${altre.join(', ')}` : `valuta ${base}`
  return trip.budgetLimit ? `Budget ${formatMoney(trip.budgetLimit, base)} · ${valute}` : `Nessun budget · ${valute}`
}

export function riepilogoAlloggi(trip: Pick<Trip, 'stays'>): string {
  const s = [...trip.stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  if (s.length === 0) return 'Hotel, check-in e check-out, costi'
  return s.length === 1 ? s[0].name : `${s[0].name} e altri ${s.length - 1}`
}

export function riepilogoVoli(trip: Pick<Trip, 'flights'>): string {
  const n = trip.flights.length
  if (n === 0) return "Carte d'imbarco, scali e fusi orari"
  return `${plural(n, 'volo', 'voli')} · ${plural(trip.flights.reduce((s, f) => s + f.legs.length, 0), 'tratta', 'tratte')}`
}

export function riepilogoTrasportiAltro(trip: Pick<Trip, 'transports'>): string {
  const n = trip.transports.length
  if (n === 0) return 'Treni, pass, bus e taxi'
  const da = trip.transports.filter((t) => !t.bought).length
  return `${plural(n, 'trasporto', 'trasporti')}${da > 0 ? ` · ${da} da acquistare` : ''}`
}

export function riepilogoPrenotazioni(trip: Pick<Trip, 'bookings'>): string {
  const n = trip.bookings.length
  return n ? plural(n, 'prenotazione', 'prenotazioni') : 'Biglietti, codici e file, anche offline'
}

export function riepilogoChecklist(trip: Pick<Trip, 'checklist'>): string {
  const p = mioAvanzamento(trip.checklist)
  return p.total ? `${p.done} di ${p.total} fatte` : 'Cose da fare e da portare'
}

/** «66% di 5.000,00 €», oppure quanto speso se non c'è un budget. */
export function riepilogoBudget(speso: number, limit: number | undefined, base: string): string {
  if (!limit) return speso > 0 ? `Speso ${formatMoney(speso, base)} · nessun limite` : 'Imposta un limite di spesa'
  return `${Math.round((speso / limit) * 100)}% di ${formatMoney(limit, base)}`
}

/** «1 € = 164 ¥»: quanta valuta locale vale 1 unità di quella di casa. */
export function riepilogoCambio(trip: Pick<Trip, 'baseCurrency' | 'localCurrency' | 'fxRate' | 'countries'>): string {
  const local = trip.localCurrency
  const rate = trip.fxRate
  if (!local || local === trip.baseCurrency || !rate || !(rate > 0)) return 'Imposta il cambio della valuta del viaggio'
  const n = round2(1 / rate)
  return `1 ${currencySymbol(trip.baseCurrency)} = ${n >= 100 ? Math.round(n) : String(n).replace('.', ',')} ${currencySymbol(local)}`
}

export const personeText = (n: number) => plural(n, 'persona', 'persone')
export const viaggiText = (n: number) => plural(n, 'viaggio', 'viaggi')

export function riepilogoDocumenti(trip: Pick<Trip, 'documents'>): string {
  if (!trip.documents) return 'Con visibilità per persona'
  const n = trip.documents.filter((d) => d.links.length === 0).length
  return n === 0 ? 'Nessun documento' : n === 1 ? '1 documento' : `${n} documenti`
}
