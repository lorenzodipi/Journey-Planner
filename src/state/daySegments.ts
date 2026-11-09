import { useMemo } from 'react'
import { impostazioniViaggio, sceltoPer, spostamento, type Spostamento } from '../lib/spostamenti'
import type { Day, Trip } from '../types'
import { useDayRoute } from './dayRoute'

/**
 * Percorso del giorno e spostamento che porta a ciascuna tappa (solo tra tappe consecutive con posizione): il mezzo scelto
 * a mano o quello del viaggio, la durata scritta a mano o quella del percorso su strada, altrimenti la stima.
 */
export function useDaySegments(trip: Trip, day: Day | undefined) {
  const route = useDayRoute(trip, day ?? { id: '', date: '', city: '', items: [] })
  const stopById = useMemo(() => new Map(route.stops.map((s) => [s.id, s])), [route.stops])
  const imp = useMemo(() => impostazioniViaggio(trip), [trip])
  const segments = useMemo(() => {
    const m = new Map<string, Spostamento>()
    if (!day) return m
    const legByEnds = new Map(route.legs.map((l) => [`${l.fromId}>${l.toId}`, l]))
    for (let i = 1; i < day.items.length; i++) {
      const item = day.items[i]
      const leg = legByEnds.get(`${day.items[i - 1].id}>${item.id}`)
      if (!leg) continue
      const strada = leg.kind === 'walk' || leg.kind === 'drive' ? route.routes[leg.key] : undefined
      m.set(item.id, spostamento(leg.straightM, { scelto: sceltoPer(item), minuti: item.arriveMinutes, via: leg.via?.mode, imp, strada }))
    }
    return m
  }, [day, route.legs, route.routes, imp])
  return { route, stopById, segments, imp }
}
