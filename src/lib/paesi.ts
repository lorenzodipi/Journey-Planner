// Paesi di un viaggio (#35): ogni giorno appartiene a un paese, da lì fuso, valuta locale e centro mappa.
// Senza la tabella `trip_countries` (migrazione 0020) si usa il modello di prima: un paese solo per tutte le date.
import type { Trip, TripCountry } from '../types'
import { countryByCode, countryByName } from './countries'
import { enumerateDates } from './tripDays'

type Base = Pick<Trip, 'destination' | 'timezone' | 'localCurrency' | 'fxRate' | 'startDate' | 'endDate' | 'center'> & { countries?: TripCountry[] }

/** I paesi del viaggio: quelli salvati, oppure uno solo ricavato da destinazione, valuta locale e cambio. */
export function paesiDi(trip: Base): TripCountry[] {
  if (trip.countries && trip.countries.length > 0) return trip.countries
  const c = countryByName(trip.destination)
  return [
    {
      id: 'unico',
      country: c?.code ?? '',
      name: trip.destination || c?.name || '',
      currency: trip.localCurrency ?? c?.currency ?? '',
      timezone: trip.timezone,
      startDate: trip.startDate,
      endDate: trip.endDate,
      fxRate: trip.fxRate,
      position: 0,
    },
  ]
}

/** Il paese di un giorno: quello che lo copre (se due, il secondo: scalo); fuori dagli intervalli, il più vicino nel tempo. */
export function paeseDelGiorno(trip: Base, ymd: string): TripCountry {
  const list = paesiDi(trip)
  const covering = list.filter((c) => c.startDate <= ymd && ymd <= c.endDate)
  if (covering.length > 0) return covering.reduce((a, b) => (b.startDate >= a.startDate ? b : a))
  const dist = (c: TripCountry) => {
    const from = ymd < c.startDate ? c.startDate : c.endDate
    return Math.abs(Date.parse(`${from}T00:00:00Z`) - Date.parse(`${ymd}T00:00:00Z`))
  }
  return list.reduce((a, b) => (dist(b) < dist(a) ? b : a))
}

/** Il paese principale: quello con più giorni (a parità, il primo). */
export function paesePrincipale(trip: Base): TripCountry {
  const list = paesiDi(trip)
  const days = enumerateDates(trip.startDate, trip.endDate)
  if (list.length === 1 || days.length === 0) return list[0]
  const count = new Map<string, number>()
  for (const d of days) {
    const c = paeseDelGiorno(trip, d)
    count.set(c.id, (count.get(c.id) ?? 0) + 1)
  }
  return list.reduce((a, b) => ((count.get(b.id) ?? 0) > (count.get(a.id) ?? 0) ? b : a))
}

export const fusoDelGiorno = (trip: Base, ymd: string): string => paeseDelGiorno(trip, ymd).timezone || trip.timezone
export const valutaDelGiorno = (trip: Base, ymd: string): string => paeseDelGiorno(trip, ymd).currency || trip.localCurrency || ''

/** Centro mappa del paese (capitale), altrimenti quello del viaggio. */
export function centroDelGiorno(trip: Base, ymd: string): { lat: number; lng: number } {
  const c = countryByCode(paeseDelGiorno(trip, ymd).country)
  return c?.center ?? trip.center
}

export interface ErrorePaesi {
  /** indice del paese con il problema, o null se riguarda il viaggio */
  index: number | null
  message: string
}

/** Le date dei paesi devono stare dentro quelle del viaggio e ogni paese deve finire dopo l'inizio. */
export function validaPaesi(list: Pick<TripCountry, 'name' | 'startDate' | 'endDate'>[], start: string, end: string): ErrorePaesi | null {
  if (list.length === 0) return { index: null, message: 'Aggiungi almeno un paese.' }
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (!c.name) return { index: i, message: 'Scegli il paese.' }
    if (c.endDate < c.startDate) return { index: i, message: `Le date di ${c.name} non tornano: la fine è prima dell'inizio.` }
    if (c.startDate < start || c.endDate > end) return { index: i, message: `Le date di ${c.name} devono stare dentro quelle del viaggio.` }
  }
  return null
}

/** Il viaggio «visto» da un giorno: fuso, valuta locale, cambio e centro mappa sono quelli del paese di quel giorno. */
export function vistaDelGiorno<T extends Base>(trip: T, ymd: string): T {
  if (!trip.countries || trip.countries.length < 2) return trip
  const c = paeseDelGiorno(trip, ymd)
  const home = (trip as unknown as { baseCurrency?: string }).baseCurrency
  const own = countryByCode(c.country)
  return {
    ...trip,
    timezone: c.timezone || trip.timezone,
    localCurrency: c.currency && c.currency !== home ? c.currency : undefined,
    ...(c.fxRate ? { fxRate: c.fxRate } : {}),
    center: own?.center ?? trip.center,
  }
}

/** Il giorno di oggi per il viaggio: si parte dal fuso del paese principale e si riallinea a quello del paese di quel giorno. */
export function oggiNelViaggio<T extends Base>(trip: T, now: Date = new Date()): { today: string; trip: T } {
  const ymd = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  let today = ymd(trip.timezone)
  let view = vistaDelGiorno(trip, today)
  if (view.timezone !== trip.timezone) {
    today = ymd(view.timezone)
    view = vistaDelGiorno(trip, today)
  }
  return { today, trip: view }
}
