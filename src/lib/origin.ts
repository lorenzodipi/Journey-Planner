import type { Trip } from '../types'
import { countryByCode } from './countries'
import { isValidTimezone } from './tripForm'

/** Casa del viaggiatore: nome del paese e fuso. `null` se il viaggio non ha un paese di origine. */
export function originOf(trip: Pick<Trip, 'originCountry' | 'originTimezone'>): { name: string; timezone: string } | null {
  const country = countryByCode(trip.originCountry)
  if (!country) return null
  const tz = trip.originTimezone && isValidTimezone(trip.originTimezone) ? trip.originTimezone : country.timezone
  return { name: country.name, timezone: tz }
}

/** Fuso di partenza da proporre nei moduli di voli e trasporti (vuoto se non c'è un'origine). */
export function defaultDepartureTz(trip: Pick<Trip, 'originCountry' | 'originTimezone'>): string {
  return originOf(trip)?.timezone ?? ''
}
