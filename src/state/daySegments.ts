import { useMemo } from 'react'
import { stimaSpostamento, type Spostamento } from '../lib/tappa'
import type { Day, Trip } from '../types'
import { useDayRoute } from './dayRoute'

/** Percorso del giorno e spostamento stimato che porta a ciascuna tappa (solo tra tappe con posizione). */
export function useDaySegments(trip: Trip, day: Day | undefined) {
  const route = useDayRoute(trip, day ?? { id: '', date: '', city: '', items: [] })
  const stopById = useMemo(() => new Map(route.stops.map((s) => [s.id, s])), [route.stops])
  const segments = useMemo(() => {
    const m = new Map<string, Spostamento>()
    if (!day) return m
    for (let i = 1; i < day.items.length; i++) {
      const a = stopById.get(day.items[i - 1].id)
      const b = stopById.get(day.items[i].id)
      if (a && b) m.set(day.items[i].id, stimaSpostamento(a, b, route.transports))
    }
    return m
  }, [day, stopById, route.transports])
  return { route, stopById, segments }
}
