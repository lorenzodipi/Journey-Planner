// Luoghi (#61): possibili doppioni, visite e prenotazioni collegate, categorie senza nomi doppi.
import type { Booking, Place, Trip } from '../types'
import { tappeDi } from './prenotazioni'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** Distanza in metri (haversine). */
export function distanzaM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = (x: number) => (x * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)))
}

const simili = (a: string, b: string) => {
  const x = norm(a)
  const y = norm(b)
  return x.length > 2 && y.length > 2 && (x === y || x.includes(y) || y.includes(x))
}

export interface Doppione {
  place: Place
  /** metri, se entrambi hanno una posizione */
  metri?: number
}

/** Luoghi con nome simile (e, se c'è la posizione, entro 300 m) a quello che si sta salvando. */
export function possibiliDoppioni(places: Place[], c: { id?: string; name: string; lat: number | null; lng: number | null }): Doppione[] {
  const out: Doppione[] = []
  for (const p of places) {
    if (p.id === c.id || !simili(p.name, c.name)) continue
    const metri = p.lat != null && p.lng != null && c.lat != null && c.lng != null ? distanzaM({ lat: p.lat, lng: p.lng }, { lat: c.lat, lng: c.lng }) : undefined
    if (metri === undefined || metri <= 300) out.push({ place: p, ...(metri !== undefined ? { metri } : {}) })
  }
  return out.sort((a, b) => (a.metri ?? 1e9) - (b.metri ?? 1e9))
}

export const testoDoppione = (nome: string, d: Doppione) => `«${nome}» somiglia a «${d.place.name}»${d.metri !== undefined ? `, a ${d.metri} m` : ''}`

/** Visite: le tappe collegate al luogo, nei diversi giorni (anche più volte lo stesso giorno). */
export function visiteDelLuogo(trip: Pick<Trip, 'days'>, placeId: string): { dayId: string; date: string; city: string; itemId: string; title: string; time?: string }[] {
  return trip.days.flatMap((d) => d.items.filter((i) => i.placeId === placeId).map((i) => ({ dayId: d.id, date: d.date, city: d.city, itemId: i.id, title: i.title, time: i.time })))
}

/** Prenotazioni collegate al luogo: tramite le sue tappe, o con lo stesso nome nel campo «Luogo». */
export function prenotazioniDelLuogo(trip: Trip, place: Pick<Place, 'id' | 'name'>): Booking[] {
  const tappe = new Set(visiteDelLuogo(trip, place.id).map((v) => v.itemId))
  return trip.bookings.filter((b) => tappeDi(trip, b.id).some((t) => tappe.has(t)) || (b.place && norm(b.place) === norm(place.name)))
}

/** Categorie da proporre: quelle del viaggio e del mio account, senza doppioni di maiuscole o spazi. */
export function categorieUnite(...liste: string[][]): string[] {
  const visti = new Set<string>()
  const out: string[] = []
  for (const l of liste) for (const c of l) {
    const k = norm(c)
    if (k && !visti.has(k)) {
      visti.add(k)
      out.push(c.trim())
    }
  }
  return out
}

