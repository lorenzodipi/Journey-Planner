import { useEffect, useState } from 'preact/hooks'
import { EMPTY_FILTERS, type PlaceFilters } from '../lib/placeFilter'

// Ogni pagina ha i suoi filtri: quelli messi in Luoghi non valgono per la Mappa e viceversa.
// Sono legati al viaggio attivo (cambiando viaggio ripartono da zero) e restano solo in memoria.

export type FilterScope = 'luoghi' | 'mappa'

interface Stored {
  tripId: string
  filters: PlaceFilters
}

const current: Record<FilterScope, Stored> = {
  luoghi: { tripId: '', filters: EMPTY_FILTERS },
  mappa: { tripId: '', filters: EMPTY_FILTERS },
}
const listeners: Record<FilterScope, Set<(s: Stored) => void>> = { luoghi: new Set(), mappa: new Set() }

export function usePlaceFilters(scope: FilterScope, tripId: string): [PlaceFilters, (f: PlaceFilters) => void] {
  const [stored, setStored] = useState<Stored>(current[scope])
  useEffect(() => {
    listeners[scope].add(setStored)
    return () => void listeners[scope].delete(setStored)
  }, [scope])
  const filters = stored.tripId === tripId ? stored.filters : EMPTY_FILTERS
  const set = (next: PlaceFilters) => {
    current[scope] = { tripId, filters: next }
    for (const l of listeners[scope]) l(current[scope])
  }
  return [filters, set]
}
