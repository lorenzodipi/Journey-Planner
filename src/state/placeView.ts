import { useEffect, useState } from 'react'
import { DEFAULT_VIEW, type PlaceView } from '../lib/placeView'

// Raggruppamento e ordine dell'elenco Luoghi: legati al viaggio attivo, solo in memoria
// (come i filtri: cambiando viaggio o riaprendo l'app si riparte dal default).

interface Stored {
  tripId: string
  view: PlaceView
}

let current: Stored = { tripId: '', view: DEFAULT_VIEW }
const listeners = new Set<(s: Stored) => void>()

export function usePlaceView(tripId: string, fallback: PlaceView = DEFAULT_VIEW): [PlaceView, (v: PlaceView) => void] {
  const [stored, setStored] = useState<Stored>(current)
  useEffect(() => {
    listeners.add(setStored)
    return () => void listeners.delete(setStored)
  }, [])
  const view = stored.tripId === tripId ? stored.view : fallback
  const set = (next: PlaceView) => {
    current = { tripId, view: next }
    for (const l of listeners) l(current)
  }
  return [view, set]
}
