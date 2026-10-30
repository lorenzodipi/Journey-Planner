// Voli raggruppati e riassunti per la carta d'imbarco (#36).
import type { Flight, FlightLeg, Trip } from '../types'
import { airportCity } from './airports'
import { zonesOf } from './countries'
import { dateInZone, dayOffset, formatDateInZone, formatInZone, layover, minutesBetween, totalTravelTime } from './flights'

export interface GruppoVoli {
  key: string
  /** «Andata · sab 21 nov», «Ritorno · mer 9 dic», «Volo · gio 3 dic» */
  title: string
  flights: Flight[]
}

const primo = (f: Flight) => f.legs[0]
const ultimo = (f: Flight) => f.legs[f.legs.length - 1]

/** Andata = primo volo che parte dal paese di casa; Ritorno = ultimo che ci arriva (se c'è il paese di casa; altrimenti primo e ultimo). */
export function raggruppaVoli(flights: Flight[], trip: Pick<Trip, 'originCountry' | 'originTimezone'>): GruppoVoli[] {
  const ordered = flights.filter((f) => f.legs.length > 0).sort((a, b) => primo(a).departAt.localeCompare(primo(b).departAt))
  const casa = new Set([...(trip.originCountry ? zonesOf(trip.originCountry) : []), ...(trip.originTimezone ? [trip.originTimezone] : [])])
  const daCasa = (f: Flight) => (casa.size > 0 ? casa.has(primo(f).fromTz) : true)
  const aCasa = (f: Flight) => (casa.size > 0 ? casa.has(ultimo(f).toTz) : true)
  const andata = ordered.find(daCasa)
  const ritorno = [...ordered].reverse().find((f) => aCasa(f) && f !== andata)
  const data = (f: Flight) => formatDateInZone(primo(f).departAt, primo(f).fromTz).replace(/\./g, '')
  return ordered.map((f) => ({
    key: f.id,
    title: `${f === andata ? 'Andata' : f === ritorno ? 'Ritorno' : 'Volo'} · ${data(f)}`,
    flights: [f],
  }))
}

/** 1000 min → «16 h 40». */
export function durataLunga(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const mm = m % 60
  return h > 0 ? `${h} h ${String(mm).padStart(2, '0')}` : `${mm} min`
}

export interface Scalo {
  city: string
  minutes: number
}

export interface RiepilogoVolo {
  from: string
  to: string
  fromCity: string
  toCity: string
  departTime: string
  arriveTime: string
  /** giorni in più all'arrivo («+1») */
  plus: number
  duration: string
  numeri: string[]
  scali: Scalo[]
  /** data di partenza breve («sab 21 nov») */
  date: string
}

export function riepilogoVolo(f: Flight): RiepilogoVolo {
  const a: FlightLeg = primo(f)
  const z: FlightLeg = ultimo(f)
  const scali: Scalo[] = f.legs.slice(1).map((l, i) => ({ city: airportCity(f.legs[i].to), minutes: layover({ depart: f.legs[i].departAt, arrive: f.legs[i].arriveAt }, { depart: l.departAt, arrive: l.arriveAt }) }))
  return {
    from: a.from,
    to: z.to,
    fromCity: airportCity(a.from),
    toCity: airportCity(z.to),
    departTime: formatInZone(a.departAt, a.fromTz),
    arriveTime: formatInZone(z.arriveAt, z.toTz),
    plus: Math.max(0, dayOffset({ depart: a.departAt, arrive: z.arriveAt }, a.fromTz, z.toTz)),
    duration: durataLunga(totalTravelTime(f.legs.map((l) => ({ depart: l.departAt, arrive: l.arriveAt })))),
    numeri: f.legs.map((l) => l.flightNumber?.trim()).filter((n): n is string => Boolean(n)),
    scali,
    date: formatDateInZone(a.departAt, a.fromTz).replace(/\./g, ''),
  }
}

/** «1 scalo a Dubai · 1 h 50 di attesa» / «2 scali · 3 h 10 di attesa in tutto». */
export function fasciaScali(scali: Scalo[]): { titolo: string; resto: string } | null {
  if (scali.length === 0) return null
  const tot = scali.reduce((s, x) => s + x.minutes, 0)
  return scali.length === 1
    ? { titolo: `1 scalo a ${scali[0].city}`, resto: `${durataLunga(tot)} di attesa` }
    : { titolo: `${scali.length} scali`, resto: `${durataLunga(tot)} di attesa in tutto` }
}

/** «sab 21 nov» → data di partenza in formato testo; usata anche dal promemoria del check-in. */
export const giornoPartenza = (f: Flight) => dateInZone(primo(f).departAt, primo(f).fromTz)
export { minutesBetween }
