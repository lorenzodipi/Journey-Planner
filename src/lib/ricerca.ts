// Ricerca in tutto il viaggio (#63, SET-008) ed esportazione del riepilogo (SET-010).
// I dati del viaggio sono già quelli che l'utente può vedere (RLS): niente da filtrare in più,
// ma i documenti e i codici restano fuori dalla ricerca.
import { categoryIcon } from './categoryIcon'
import { cercaPerRilevanza, corrisponde } from './cerca'
import type { Trip } from '../types'
import { expenseBase } from './budget'
import { riassunto } from './spese'
import { LOCALE, t } from '../i18n'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export type GruppoRicerca = 'Luoghi' | 'Tappe' | 'Prenotazioni' | 'Alloggi' | 'Trasporti' | 'Voli'
export interface RisultatoRicerca {
  gruppo: GruppoRicerca
  id: string
  titolo: string
  sotto?: string
  to: string
  /** disco dello sprite accanto al risultato (come nelle card: la categoria del luogo, un letto, un aereo…) */
  icona: string
}

/** Il disco di una categoria di luogo, come nella card del luogo. */
const discoCategoria = (c: string | undefined) => `i-cat-${categoryIcon(c ?? '')}`

export function cercaNelViaggio(trip: Trip, q: string, max = 8): RisultatoRicerca[] {
  const k = norm(q.trim())
  if (k.length < 2) return []
  // ogni parola in uno dei campi, in qualsiasi ordine (la regola di tutta l'app)
  const hit = (...campi: (string | undefined)[]) => corrisponde(k, ...campi)
  const out: RisultatoRicerca[] = []
  const add = (_g: GruppoRicerca, list: RisultatoRicerca[]) => out.push(...list.slice(0, max))

  const categoriaLuogo = (id: string | undefined) => (id ? trip.places.find((p) => p.id === id)?.category : undefined)
  // in ogni gruppo prima chi ha le parole nel nome (all'inizio meglio), poi chi le ha negli altri campi
  add('Luoghi', cercaPerRilevanza(trip.places, k, (p) => p.name, (p) => [p.nameLocal, p.city, p.category, p.address, p.note]).map((p) => ({ gruppo: 'Luoghi' as const, id: p.id, titolo: p.name, sotto: [p.city, p.category].filter(Boolean).join(' · '), to: '/luoghi', icona: discoCategoria(p.category) })))
  add('Tappe', cercaPerRilevanza(trip.days.flatMap((d, i) => d.items.map((it) => ({ d, i, it }))), k, (x) => x.it.title, (x) => [x.it.note]).map(({ d, i, it }) => ({ gruppo: 'Tappe' as const, id: it.id, titolo: it.title, sotto: t('Giorno {v0} · {city}', { v0: i + 1, city: d.city }), to: `/giorni/${d.id}`, icona: discoCategoria(categoriaLuogo(it.placeId) ?? it.title) })))
  add('Prenotazioni', cercaPerRilevanza(trip.bookings, k, (b) => b.title, (b) => [b.place, b.provider, b.notes]).map((b) => ({ gruppo: 'Prenotazioni' as const, id: b.id, titolo: b.title, to: '/altro/prenotazioni', icona: 'i-sez-ticket' })))
  add('Alloggi', cercaPerRilevanza(trip.stays, k, (s) => s.name, (s) => [s.city, s.address]).map((s) => ({ gruppo: 'Alloggi' as const, id: s.id, titolo: s.name, sotto: s.city, to: '/altro/alloggi', icona: 'i-cat-stay' })))
  add('Trasporti', trip.transports.filter((x) => hit(x.from, x.to, x.operator, x.notes)).map((x) => ({ gruppo: 'Trasporti' as const, id: x.id, titolo: `${x.from} → ${x.to}`, to: '/altro/trasporti', icona: 'i-cat-train' })))
  add('Voli', cercaPerRilevanza(trip.flights, k, (f) => f.title, (f) => [f.airline]).map((f) => ({ gruppo: 'Voli' as const, id: f.id, titolo: f.title, sotto: f.airline, to: '/altro/voli', icona: 'i-cat-airport' })))
  return out
}

export interface Riepilogo {
  titolo: string
  periodo: string
  giorni: number
  citta: string[]
  tappe: number
  speso: number
  valuta: string
  perCategoria: { nome: string; importo: number }[]
  mioSaldo: number | null
}

/** Solo statistiche comuni e il MIO bilancio: niente saldi degli altri, niente foto. */
export function riepilogoViaggio(trip: Trip): Riepilogo {
  const r = riassunto(trip, trip.myTravelerId)
  const per = new Map<string, number>()
  for (const e of r.spese) {
    const v = expenseBase(e, r.fx)
    if (v !== null) per.set(e.category || 'Altro', (per.get(e.category || 'Altro') ?? 0) + v)
  }
  return {
    titolo: trip.title,
    periodo: `${trip.startDate} – ${trip.endDate}`,
    giorni: trip.days.length,
    citta: [...new Set(trip.days.map((d) => d.city).filter(Boolean))],
    tappe: trip.days.reduce((n, d) => n + d.items.length, 0),
    speso: r.speso,
    valuta: trip.baseCurrency,
    perCategoria: [...per].map(([nome, importo]) => ({ nome, importo: Math.round(importo * 100) / 100 })).sort((a, b) => b.importo - a.importo),
    mioSaldo: r.mioSaldo,
  }
}

export function riepilogoTesto(r: Riepilogo): string[] {
  const m = (n: number) => `${n.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${r.valuta}`
  return [
    r.titolo,
    r.periodo,
    '',
    t('{giorni} giorni · {length} città · {tappe} tappe', { giorni: r.giorni, length: r.citta.length, tappe: r.tappe }),
    r.citta.join(', '),
    '',
    t('Speso in totale: {v0}', { v0: m(r.speso) }),
    ...r.perCategoria.map((c) => `  ${c.nome}: ${m(c.importo)}`),
    ...(r.mioSaldo === null ? [] : ['', t('Il mio bilancio: {v0} {v1}', { v0: r.mioSaldo >= 0 ? t('da incassare') : t('da dare'), v1: m(Math.abs(r.mioSaldo)) })]),
  ]
}
