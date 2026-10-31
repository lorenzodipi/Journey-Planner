// Ricerca in tutto il viaggio (#63, SET-008) ed esportazione del riepilogo (SET-010).
// I dati del viaggio sono già quelli che l'utente può vedere (RLS): niente da filtrare in più,
// ma i documenti e i codici restano fuori dalla ricerca.
import type { Trip } from '../types'
import { expenseBase } from './budget'
import { riassunto } from './spese'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export type GruppoRicerca = 'Luoghi' | 'Tappe' | 'Prenotazioni' | 'Alloggi' | 'Trasporti' | 'Voli'
export interface RisultatoRicerca {
  gruppo: GruppoRicerca
  id: string
  titolo: string
  sotto?: string
  to: string
}

export function cercaNelViaggio(trip: Trip, q: string, max = 8): RisultatoRicerca[] {
  const k = norm(q.trim())
  if (k.length < 2) return []
  const hit = (...campi: (string | undefined)[]) => campi.some((c) => c && norm(c).includes(k))
  const out: RisultatoRicerca[] = []
  const add = (_g: GruppoRicerca, list: RisultatoRicerca[]) => out.push(...list.slice(0, max))

  add('Luoghi', trip.places.filter((p) => hit(p.name, p.nameLocal, p.city, p.category, p.address)).map((p) => ({ gruppo: 'Luoghi', id: p.id, titolo: p.name, sotto: [p.city, p.category].filter(Boolean).join(' · '), to: '/luoghi' })))
  add('Tappe', trip.days.flatMap((d, i) => d.items.filter((it) => hit(it.title, it.note)).map((it) => ({ gruppo: 'Tappe' as const, id: it.id, titolo: it.title, sotto: `Giorno ${i + 1} · ${d.city}`, to: `/giorni/${d.id}` }))))
  add('Prenotazioni', trip.bookings.filter((b) => hit(b.title, b.place, b.provider, b.notes)).map((b) => ({ gruppo: 'Prenotazioni', id: b.id, titolo: b.title, to: '/altro/prenotazioni' })))
  add('Alloggi', trip.stays.filter((s) => hit(s.name, s.city, s.address)).map((s) => ({ gruppo: 'Alloggi', id: s.id, titolo: s.name, sotto: s.city, to: '/altro/alloggi' })))
  add('Trasporti', trip.transports.filter((x) => hit(x.from, x.to, x.operator, x.notes)).map((x) => ({ gruppo: 'Trasporti', id: x.id, titolo: `${x.from} → ${x.to}`, to: '/altro/trasporti' })))
  add('Voli', trip.flights.filter((f) => hit(f.title, f.airline)).map((f) => ({ gruppo: 'Voli', id: f.id, titolo: f.title, sotto: f.airline, to: '/altro/voli' })))
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
  const m = (n: number) => `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${r.valuta}`
  return [
    r.titolo,
    r.periodo,
    '',
    `${r.giorni} giorni · ${r.citta.length} città · ${r.tappe} tappe`,
    r.citta.join(', '),
    '',
    `Speso in totale: ${m(r.speso)}`,
    ...r.perCategoria.map((c) => `  ${c.nome}: ${m(c.importo)}`),
    ...(r.mioSaldo === null ? [] : ['', `Il mio bilancio: ${r.mioSaldo >= 0 ? 'da incassare' : 'da dare'} ${m(Math.abs(r.mioSaldo))}`]),
  ]
}
