// Carta d'imbarco per persona (card dei voli aperta): scelte e testi che non dipendono dal disegno.
import type { Flight, FlightLeg, Traveler } from '../types'
import { airportCity } from './airports'
import { formatInZone, layover } from './flights'
import { LOCALE, t } from '../i18n'

/** Chi viaggia con un volo: i passeggeri scelti; per i voli vecchi (non scelti) «Diviso tra»; vuoto = tutti. */
export function passeggeriVolo(flight: Pick<Flight, 'passengerIds' | 'forTravelers'>, travelers: readonly Pick<Traveler, 'id'>[]): string[] {
  const scelti = flight.passengerIds ?? flight.forTravelers
  const validi = scelti?.filter((id) => travelers.some((p) => p.id === id))
  return validi?.length ? validi : travelers.map((p) => p.id)
}

/** Come si mostrano le persone nel selettore: nome intero fino a due, tre con nomi corti in piccolo, oltre solo le iniziali. */
export type ModoPersone = 'due' | 'tre' | 'iniziali'

export function modoPersone(nomi: readonly string[]): ModoPersone {
  if (nomi.length <= 2) return 'due'
  const lunghezza = nomi.reduce((s, n) => s + n.length, 0)
  return nomi.length === 3 && lunghezza <= 18 ? 'tre' : 'iniziali'
}

/** Nome da mostrare nel selettore: il primo nome, o il nome intero se due persone hanno lo stesso primo nome. */
export function nomiCorti(persone: readonly Pick<Traveler, 'id' | 'name'>[]): Record<string, string> {
  const primo = (n: string) => n.trim().split(/\s+/)[0] ?? n
  const quanti = new Map<string, number>()
  for (const p of persone) quanti.set(primo(p.name), (quanti.get(primo(p.name)) ?? 0) + 1)
  return Object.fromEntries(persone.map((p) => [p.id, (quanti.get(primo(p.name)) ?? 0) > 1 ? p.name.trim() : primo(p.name)]))
}

export type TipoCheckin = 'atterrato' | 'involo' | 'fatto' | 'aprira' | 'dafare'

export interface StatoCheckin {
  tipo: TipoCheckin
  /** testo della pillola */
  testo: string
  /** «apre alle 11:30» (solo se il check-in non è ancora aperto) */
  apre?: string
}

/**
 * Stato del check-in di una persona per una tratta. Dopo l'arrivo «Atterrato», in volo «In volo»;
 * con la carta d'imbarco salvata «Check-in fatto»; con l'apertura del check-in ancora da venire «Check-in da ven 20»;
 * altrimenti «Check-in da fare».
 */
export function statoCheckin(leg: Pick<FlightLeg, 'departAt' | 'arriveAt' | 'fromTz'>, haCodice: boolean, checkinAt: string | undefined, ora: Date = new Date()): StatoCheckin {
  const now = ora.getTime()
  if (now >= new Date(leg.arriveAt).getTime()) return { tipo: 'atterrato', testo: t('Atterrato') }
  if (now >= new Date(leg.departAt).getTime()) return { tipo: 'involo', testo: t('In volo') }
  if (haCodice) return { tipo: 'fatto', testo: t('Check-in fatto') }
  const apre = checkinAt ? new Date(checkinAt) : null
  if (apre && !Number.isNaN(apre.getTime()) && now < apre.getTime()) {
    const giorno = new Intl.DateTimeFormat(LOCALE, { timeZone: leg.fromTz, weekday: 'short', day: 'numeric' }).format(apre).replace(/\./g, '')
    return { tipo: 'aprira', testo: t('Check-in da {giorno}', { giorno }), apre: t('apre alle {ora}', { ora: formatInZone(checkinAt as string, leg.fromTz) }) }
  }
  return { tipo: 'dafare', testo: t('Check-in da fare') }
}

/** Posto di una persona in una tratta: il suo, altrimenti quello scritto per tutti (se nessuno ha un posto suo). */
export function postoPersona(leg: Pick<FlightLeg, 'seats' | 'seatsBy'>, who: string | undefined): string | undefined {
  const suo = who ? leg.seatsBy?.[who]?.trim() : undefined
  if (suo) return suo
  if (leg.seatsBy && Object.values(leg.seatsBy).some((v) => v?.trim())) return undefined
  return leg.seats?.trim() || undefined
}

/** Costo del biglietto di una persona: il costo «a persona» così com'è, quello «in tutto» diviso per i passeggeri. */
export function bigliettoPersona(f: Pick<Flight, 'cost' | 'scope'>, passeggeri: number): number | undefined {
  if (f.cost == null || !(f.cost > 0)) return undefined
  return f.scope === 'per_person' ? f.cost : Math.round((f.cost / Math.max(1, passeggeri)) * 100) / 100
}

export interface ScaloDopo {
  titolo: string
  testo: string
}

/** Riquadro dello scalo dopo la tratta `i` (solo se ne segue un'altra): «Poi scalo a Istanbul: 2 h 15», «Atterri alle 15:20 e riparti alle 17:35.» */
export function scaloDopo(f: Pick<Flight, 'legs'>, i: number, durata: (min: number) => string): ScaloDopo | null {
  const a = f.legs[i]
  const b = f.legs[i + 1]
  if (!a || !b) return null
  const min = layover({ depart: a.departAt, arrive: a.arriveAt }, { depart: b.departAt, arrive: b.arriveAt })
  return {
    titolo: t('Poi scalo a {city}: {v0}', { city: airportCity(a.to), v0: durata(min) }),
    testo: t('Atterri alle {arrivo} e riparti alle {partenza}.', { arrivo: formatInZone(a.arriveAt, a.toTz), partenza: formatInZone(b.departAt, b.fromTz) }),
  }
}

/** Pagina del volo su Flightradar24 («CA 950» → …/data/flights/ca950); senza un numero di volo valido, niente. */
export function linkFlightradar(numero: string | undefined): string | undefined {
  const n = (numero ?? '').replace(/[\s-]+/g, '').toLowerCase()
  return /^[a-z0-9]{2,3}\d{1,4}[a-z]?$/.test(n) ? `https://www.flightradar24.com/data/flights/${n}` : undefined
}
