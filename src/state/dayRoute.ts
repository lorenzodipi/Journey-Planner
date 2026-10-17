import { useEffect, useMemo, useState } from 'preact/hooks'
import {
  dayStops,
  dayTransportLines,
  localRouteStore,
  planLegs,
  resolveWalkLegs,
  type DayStop,
  type Leg,
  type TransportLine,
  type WalkRoute,
} from '../lib/dayRoute'
import type { DayMapEnd, DayMapLine } from '../ui/MapView'
import { MODE_LABEL } from '../ui/TransportForm'
import type { Day, Trip } from '../types'

export const STOP_COLOR = '#c8402f'
export const TRANSPORT_COLOR = '#1f6fd0'

export interface DayRoute {
  stops: DayStop[]
  /** tappe di un luogo senza posizione */
  missing: number
  legs: Leg[]
  /** percorso a piedi per tratto: `undefined` = in calcolo, `null` = non disponibile */
  routes: Record<string, WalkRoute | null>
  transports: TransportLine[]
  lines: DayMapLine[]
  ends: DayMapEnd[]
}

/** Tappe, tratti e trasporti di un giorno; i percorsi a piedi si calcolano (o si rileggono dalla cache) uno alla volta. */
export function useDayRoute(trip: Pick<Trip, 'places' | 'transports'>, day: Day): DayRoute {
  const [routes, setRoutes] = useState<Record<string, WalkRoute | null>>({})
  const { stops, missing } = useMemo(() => dayStops(day, trip.places), [day, trip.places])
  const transports = useMemo(() => dayTransportLines(day, trip.transports), [day, trip.transports])
  const legs = useMemo(() => planLegs(stops), [stops])
  const legsSig = legs.map((l) => `${l.key}:${l.kind}`).join('|')

  useEffect(() => {
    setRoutes({})
    if (!legs.some((l) => l.kind === 'walk')) return
    const ctrl = new AbortController()
    void resolveWalkLegs(legs, {
      store: localRouteStore(),
      signal: ctrl.signal,
      onRoute: (key, route) => !ctrl.signal.aborted && setRoutes((prev) => ({ ...prev, [key]: route })),
    })
    return () => ctrl.abort()
    // legsSig descrive i tratti: si rifà il calcolo solo se cambiano
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legsSig])

  const lines: DayMapLine[] = useMemo(() => {
    const out: DayMapLine[] = legs.map((leg) => {
      const route = routes[leg.key]
      const straight: [number, number][] = [[leg.from.lng, leg.from.lat], [leg.to.lng, leg.to.lat]]
      return leg.kind === 'walk' && route
        ? { id: leg.key, coords: route.coords, dashed: false, color: STOP_COLOR }
        : { id: leg.key, coords: straight, dashed: true, color: STOP_COLOR }
    })
    for (const t of transports) {
      out.push({ id: t.id, coords: [[t.from.lng, t.from.lat], [t.to.lng, t.to.lat]], dashed: true, color: TRANSPORT_COLOR })
    }
    return out
  }, [legs, routes, transports])

  const ends: DayMapEnd[] = useMemo(
    () =>
      transports.flatMap((t) => [
        { id: `${t.id}-a`, name: `${MODE_LABEL[t.mode]}: partenza ${t.fromName}`, ...t.from },
        { id: `${t.id}-b`, name: `${MODE_LABEL[t.mode]}: arrivo ${t.toName}`, ...t.to },
      ]),
    [transports],
  )

  return { stops, missing, legs, routes, transports, lines, ends }
}
