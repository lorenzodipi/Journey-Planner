// Riepiloghi calcolati per la pagina Altro (#42, mock Fa-36).
import { budgetTotale } from './budgetPersona'
import { formatShort } from './dates'
import { mioAvanzamento } from './checklist'
import { currencySymbol, formatMoney, round2, tripCurrencies } from './money'
import type { Trip } from '../types'
import { t as tt } from '../i18n'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Città del viaggio, nell'ordine dei giorni, senza ripetizioni: «Kyoto · Osaka · Kanazawa». */
export function cittaDelViaggio(trip: Pick<Trip, 'days'>): string {
  return [...new Set(trip.days.map((d) => d.city.trim()).filter(Boolean))].join(' · ')
}

/** «21 nov – 9 dic 2026 · 19 giorni». */
export function periodo(trip: Pick<Trip, 'startDate' | 'endDate' | 'days'>): string {
  return `${formatShort(trip.startDate)} – ${formatShort(trip.endDate)} · ${plural(trip.days.length, tt('giorno'), tt('giorni'))}`
}

/** «Budget 5.000,00 € · valuta di casa EUR, viaggio in JPY» (con più paesi: tutte le valute del viaggio). */
export function rigaBudgetValute(trip: Pick<Trip, 'budgetLimit' | 'budgets' | 'baseCurrency' | 'localCurrency' | 'fxRates' | 'countries'>): string {
  const base = trip.baseCurrency
  const altre = tripCurrencies(trip).filter((c) => c !== base)
  const valute = altre.length ? tt('valuta di casa {base}, viaggio in {v1}', { base, v1: altre.join(', ') }) : tt('valuta {base}', { base })
  const budget = budgetTotale(trip).importo
  return budget ? tt('Budget {v0} · {valute}', { v0: formatMoney(budget, base), valute }) : tt('Nessun budget · {valute}', { valute })
}

export function riepilogoAlloggi(trip: Pick<Trip, 'stays'>): string {
  const s = [...trip.stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  if (s.length === 0) return tt('Hotel, check-in e check-out, costi')
  return s.length === 1 ? s[0].name : tt('{name} e altri {v1}', { name: s[0].name, v1: s.length - 1 })
}

export function riepilogoVoli(trip: Pick<Trip, 'flights'>): string {
  const n = trip.flights.length
  if (n === 0) return tt('Carte d\'imbarco, scali e fusi orari')
  return `${plural(n, tt('volo'), tt('voli'))} · ${plural(trip.flights.reduce((s, f) => s + f.legs.length, 0), tt('tratta'), tt('tratte'))}`
}

export function riepilogoTrasportiAltro(trip: Pick<Trip, 'transports' | 'myRole'>): string {
  const n = trip.transports.length
  if (n === 0) return tt('Treni, pass, bus e taxi')
  // il visualizzatore (0049) non sa cosa è pagato
  const da = trip.myRole === 'viewer' ? 0 : trip.transports.filter((t) => !t.bought).length
  return `${plural(n, tt('trasporto'), tt('trasporti'))}${da > 0 ? tt(' · {da} da acquistare', { da }) : ''}`
}

export function riepilogoPrenotazioni(trip: Pick<Trip, 'bookings'>): string {
  const n = trip.bookings.length
  return n ? plural(n, tt('prenotazione'), tt('prenotazioni')) : tt('Biglietti, codici e file, anche offline')
}

export function riepilogoChecklist(trip: Pick<Trip, 'checklist'>): string {
  const p = mioAvanzamento(trip.checklist)
  return p.total ? tt('{done} di {total} fatte', { done: p.done, total: p.total }) : tt('Cose da fare e da portare')
}

/** «66% di 5.000,00 €», oppure quanto speso se non c'è un budget. */
export function riepilogoBudget(speso: number, limit: number | undefined, base: string): string {
  if (!limit) return speso > 0 ? tt('Speso {v0} · nessun limite', { v0: formatMoney(speso, base) }) : tt('Imposta un limite di spesa')
  return tt('{v0}% di {v1}', { v0: Math.round((speso / limit) * 100), v1: formatMoney(limit, base) })
}

/** «1 € = 164 ¥»: quanta valuta locale vale 1 unità di quella di casa. */
export function riepilogoCambio(trip: Pick<Trip, 'baseCurrency' | 'localCurrency' | 'fxRate' | 'countries'>): string {
  const local = trip.localCurrency
  const rate = trip.fxRate
  if (!local || local === trip.baseCurrency || !rate || !(rate > 0)) return tt('Imposta il cambio della valuta del viaggio')
  const n = round2(1 / rate)
  return `1 ${currencySymbol(trip.baseCurrency)} = ${n >= 100 ? Math.round(n) : String(n).replace('.', ',')} ${currencySymbol(local)}`
}

export const personeText = (n: number) => plural(n, tt('persona'), tt('persone'))
export const viaggiText = (n: number) => plural(n, tt('viaggio'), tt('viaggi'))

export function riepilogoDocumenti(trip: Pick<Trip, 'documents'>): string {
  if (!trip.documents) return tt('Con visibilità per persona')
  const n = trip.documents.filter((d) => d.links.length === 0).length
  return n === 0 ? tt('Nessun documento') : n === 1 ? '1 documento' : tt('{n} documenti', { n })
}
