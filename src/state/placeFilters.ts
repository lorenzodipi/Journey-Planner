import { useEffect, useState } from 'preact/hooks'
import { EMPTY_FILTERS, type PlaceFilters } from '../lib/placeFilter'

// I filtri valgono sia per l'elenco Luoghi sia per la Mappa e sono legati al viaggio attivo:
// cambiando viaggio ripartono da zero. Restano solo in memoria (non servono dopo una riapertura).

interface Stored {
  tripId: string
  filters: PlaceFilters
}

let current: Stored = { tripId: '', filters: EMPTY_FILTERS }
const listeners = new Set<(s: Stored) => void>()

export function usePlaceFilters(tripId: string): [PlaceFilters, (f: PlaceFilters) => void] {
  const [stored, setStored] = useState<Stored>(current)
  useEffect(() => {
    listeners.add(setStored)
    return () => void listeners.delete(setStored)
  }, [])
  const filters = stored.tripId === tripId ? stored.filters : EMPTY_FILTERS
  const set = (next: PlaceFilters) => {
    current = { tripId, filters: next }
    for (const l of listeners) l(current)
  }
  return [filters, set]
}
