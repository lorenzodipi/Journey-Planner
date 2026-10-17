import type { Trip } from '../types'
import { clearBookingCache } from './bookingFiles'

// Copia locale dei viaggi per aprire l'app anche senza rete (sola lettura).
// Per ora basta localStorage; nello Sprint 4 passerà a IndexedDB insieme alla
// coda delle modifiche offline. L'interfaccia resta la stessa.

const CACHE_KEY = 'jp.cache.v1'
const ACTIVE_KEY = 'jp.activeTrip'

export interface Snapshot {
  trips: Trip[]
  savedAt: number
}

export function normalizeTrip(trip: Trip): Trip {
  return { ...trip, stays: trip.stays ?? [], transports: trip.transports ?? [], flights: trip.flights ?? [], budget: trip.budget ?? [], expenses: trip.expenses ?? [], checklist: trip.checklist ?? [], bookings: trip.bookings ?? [] }
}

export function loadSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Snapshot
    if (!Array.isArray(parsed.trips)) return null
    // copie salvate da versioni precedenti: aggiungo le sezioni che non c'erano
    return { ...parsed, trips: parsed.trips.map(normalizeTrip) }
  } catch {
    return null
  }
}

export function saveSnapshot(trips: Trip[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ trips, savedAt: Date.now() } satisfies Snapshot))
  } catch {
    // quota piena o storage bloccato: l'app funziona comunque online
  }
}

export function clearSnapshot(): void {
  clearBookingCache() // anche i biglietti salvati sul telefono
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // ignorato
  }
}

export function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function saveActiveId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    // ignorato
  }
}
