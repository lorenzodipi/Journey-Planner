// Programma del giorno verificabile (#55): margini, alloggio come partenza/arrivo, sovrapposizioni e conflitti.
// Non modifica nulla da sola e non inventa mai una durata (BR-60).
import type { Day, Flight, Stay, Transport, Trip } from '../types'
import { dateInZone, formatInZone } from './flights'
import { dayStays } from './dayView'
import { endMin, toMin } from './tappa'

export const MARGINI_RAPIDI = [10, 15, 30]

/** Margine del giorno: quello del giorno, altrimenti quello del viaggio, altrimenti 0. */
export const margineDelGiorno = (trip: Pick<Trip, 'defaultMarginMin'>, day: Pick<Day, 'marginMin'>): number => day.marginMin ?? trip.defaultMarginMin ?? 0

export interface Mezzo {
  label: string
  start: number
  end: number
}

/** Voli e trasporti che toccano il giorno, in minuti dalla mezzanotte (fuso del viaggio, ritagliati al giorno). */
export function mezziDelGiorno(trip: Pick<Trip, 'timezone' | 'flights' | 'transports'>, date: string): Mezzo[] {
  const out: Mezzo[] = []
  const add = (label: string, dep?: string, arr?: string) => {
    if (!dep || !arr) return
    const d0 = dateInZone(dep, trip.timezone)
    const d1 = dateInZone(arr, trip.timezone)
    if (date < d0 || date > d1) return
    const start = d0 === date ? (toMin(formatInZone(dep, trip.timezone)) ?? 0) : 0
    const end = d1 === date ? (toMin(formatInZone(arr, trip.timezone)) ?? 24 * 60) : 24 * 60
    if (end > start) out.push({ label, start, end })
  }
  for (const f of trip.flights as Flight[]) for (const l of f.legs) add(`Volo ${l.from} → ${l.to}`, l.departAt, l.arriveAt)
  for (const t of trip.transports as Transport[]) add(`${t.from} → ${t.to}`, t.departAt, t.arriveAt)
  return out
}

export interface VoceGiorno {
  id: string
  title: string
  start: number | null
  /** fine prevista: solo se c'è un'ora di fine o una durata inserita dall'utente */
  end: number | null
}

export interface EsitoGiorno {
  /** «Si sovrappone a Volo MXP → KIX» per tappa */
  sovrapposizioni: { id: string; testo: string }[]
  /** «Tra A e B servono 35 min, ne hai 15» */
  conflitti: { daId: string; aId: string; testo: string }[]
  /** «Fattibilità non verificata: manca la durata di X» */
  nonVerificate: { id: string; testo: string }[]
}

export function verificaGiorno(o: { voci: VoceGiorno[]; spostamento: (aId: string, bId: string) => number | null; margine: number; mezzi: Mezzo[] }): EsitoGiorno {
  const out: EsitoGiorno = { sovrapposizioni: [], conflitti: [], nonVerificate: [] }
  const conOra = o.voci.filter((v) => v.start !== null).sort((a, b) => (a.start as number) - (b.start as number))
  for (const v of conOra) {
    if (v.end === null) continue
    for (const m of o.mezzi) if ((v.start as number) < m.end && m.start < v.end) out.sovrapposizioni.push({ id: v.id, testo: `${v.title}: si sovrappone a ${m.label}` })
  }
  for (let i = 0; i < conOra.length - 1; i++) {
    const a = conOra[i]
    const b = conOra[i + 1]
    if (a.end === null) {
      out.nonVerificate.push({ id: a.id, testo: `Fattibilità non verificata: manca la durata di ${a.title}` })
      continue
    }
    const hai = (b.start as number) - a.end
    if (hai < 0) {
      out.sovrapposizioni.push({ id: b.id, testo: `${b.title}: si sovrappone a ${a.title}` })
      continue
    }
    const serve = (o.spostamento(a.id, b.id) ?? 0) + o.margine
    if (serve > hai) out.conflitti.push({ daId: a.id, aId: b.id, testo: `Tra ${a.title} e ${b.title} servono ${serve} min, ne hai ${hai}` })
  }
  return out
}

/** Voci del giorno per il controllo (la fine usa l'ora di fine o la durata della tappa o del luogo). */
export function vociDelGiorno(trip: Pick<Trip, 'places'>, day: Pick<Day, 'items'>): VoceGiorno[] {
  return day.items.map((i) => ({ id: i.id, title: i.title, start: toMin(i.time), end: endMin(i, trip.places.find((p) => p.id === i.placeId)) }))
}

export interface AlloggiGiorno {
  partenza?: Stay
  arrivo?: Stay
  escluso: boolean
}

/** Alloggio come partenza e arrivo (DAY-047): proposto in automatico, modificabile o escludibile. */
export function alloggiDelGiorno(trip: Pick<Trip, 'stays'>, day: Pick<Day, 'date' | 'startStayId' | 'endStayId' | 'excludeStay'>): AlloggiGiorno {
  if (day.excludeStay) return { escluso: true }
  const prima = new Date(Date.parse(day.date) - 86400000).toISOString().slice(0, 10)
  const per = (id: string | undefined, auto: Stay | undefined) => (id ? (trip.stays.find((s) => s.id === id) ?? auto) : auto)
  return {
    escluso: false,
    partenza: per(day.startStayId, dayStays(trip.stays, prima).night),
    arrivo: per(day.endStayId, dayStays(trip.stays, day.date).night),
  }
}
