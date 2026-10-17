import type { Trip } from '../types'

// Copia locale dei viaggi per aprire l'app anche senza rete (sola lettura).
// Per ora basta localStorage; nello Sprint 4 passerà a IndexedDB insieme alla
// coda delle modifiche offline. L'interfaccia resta la stessa.

const CACHE_KEY = 'jp.cache.v1'
const ACTIVE_KEY = 'jp.activeTrip'

export interface Snapshot {
  trips: Trip[]
  savedAt: number
}

export function loadSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Snapshot
    return Array.isArray(parsed.trips) ? parsed : null
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
