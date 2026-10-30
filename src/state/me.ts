import { useAuth } from '../lib/auth'
import type { Traveler, Trip } from '../types'

/** Il viaggiatore collegato all'account di chi usa l'app (in demo: il primo). */
export function useMe(trip: Pick<Trip, 'travelers'> | null | undefined): Traveler | undefined {
  const auth = useAuth()
  if (!trip) return undefined
  const uid = auth.session?.user.id
  if (auth.status === 'demo') return trip.travelers[0]
  return uid ? trip.travelers.find((p) => p.userId === uid) : undefined
}

/** Iniziali per gli avatar: «Lorenzo Di Palma» → «LD», «Gaia» → «GA». */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Numero del disco dell'avatar (1…5) per posizione: mai lo stesso colore per due persone vicine. */
export const discOf = (trip: Pick<Trip, 'travelers'>, id: string | undefined): number => {
  const i = trip.travelers.findIndex((p) => p.id === id)
  return i < 0 ? 1 : (i % 5) + 1
}
