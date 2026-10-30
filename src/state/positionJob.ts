// Lavoro in background: cerca la posizione dei luoghi senza coordinate. Vive fuori dalle pagine, così
// continua se si cambia schermata (si ferma solo chiudendo l'app) e più schermate ne mostrano lo stato.

import { useEffect, useState } from 'react'
import { findPositions, type Searchable, type Searcher } from '../lib/findPositions'
import { searchPlaces } from '../lib/geocode'
import type { Trip } from '../types'
import { showToast } from './toast'

export interface PositionJob {
  tripId: string
  running: boolean
  total: number
  done: number
  found: number
  current: string
  notFound: { id: string; name: string }[]
  error?: string
}

/** Quello che serve dello stato dei viaggi (così il lavoro non dipende dai componenti). */
export interface JobHost {
  getTrip: (id: string) => Trip | undefined
  setPlacePositions: (tripId: string, updates: { id: string; name: string; lat: number; lng: number }[]) => Promise<string | null>
}

let job: PositionJob | null = null
let stopRequested = false
const listeners = new Set<() => void>()

function set(next: PositionJob | null) {
  job = next
  for (const l of listeners) l()
}

export function usePositionJob(): PositionJob | null {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  return job
}

export function stopPositionJob() {
  stopRequested = true
}

export const missingPosition = <T extends { lat: number | null; lng: number | null }>(places: T[]): T[] => places.filter((p) => p.lat == null || p.lng == null)

/** Avvia la ricerca per i luoghi del viaggio che non hanno posizione. Non fa nulla se un altro lavoro è in corso. */
export async function startPositionJob(host: JobHost, tripId: string, search: Searcher = searchPlaces): Promise<void> {
  if (job?.running) return
  const trip = host.getTrip(tripId)
  if (!trip) return
  const todo: Searchable[] = missingPosition(trip.places).map((p) => ({ id: p.id, name: p.name, city: p.city, address: p.address, lat: null, lng: null }))
  if (todo.length === 0) return

  stopRequested = false
  set({ tripId, running: true, total: todo.length, done: 0, found: 0, current: '', notFound: [] })
  const result = await findPositions({
    places: todo,
    known: trip.places.filter((p) => p.lat != null && p.lng != null),
    tripCenter: trip.center,
    search,
    shouldStop: () => stopRequested,
    onProgress: (p) => set({ ...(job as PositionJob), total: p.total, done: p.done, found: p.found, current: p.current }),
    save: (batch) => host.setPlacePositions(tripId, batch),
  })
  set({ tripId, running: false, total: todo.length, done: result.found + result.notFound.length, found: result.found, current: '', notFound: result.notFound, error: result.error })
  if (result.error) showToast('Ricerca delle posizioni interrotta')
  else if (!result.stopped) {
    showToast(result.notFound.length === 0 ? `Trovata la posizione di tutti i ${result.found} luoghi` : `Posizione trovata per ${result.found} luoghi su ${todo.length}`)
  }
}

export function clearPositionJob() {
  if (!job?.running) set(null)
}
