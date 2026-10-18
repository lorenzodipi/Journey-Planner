import { useEffect, useMemo, useState } from 'preact/hooks'
import {
  dayStops,
  dayTransportLines,
  localRouteStore,
  planLegs,
  resolveWalkLegs,
  walkLegs,
  type DayStop,
  type Leg,
  type TransportLine,
  type WalkRoute,
} from '../lib/dayRoute'
import type { DayMapEnd, DayMapLine } from '../ui/MapView'
import { MODE_LABEL } from '../ui/TransportForm'
import type { Day, Trip } from '../types'

export const STOP_COLOR = '#3d86ff'
export const TRANSPORT_COLOR = '#ffa23a'

export interface DayRoute {
  stops: DayStop[]
  /** tappe di un luogo senza posizione */
  missing: number
  legs: Leg[]
  /** i tratti a piedi da calcolare e disegnare (anche da/verso le stazioni dei trasporti) */
  walks: Leg[]
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
  const legs = useMemo(() => planLegs(stops, transports), [stops, transports])
  const walks = useMemo(() => walkLegs(legs), [legs])
  const legsSig = walks.map((l) => l.key).join('|')

  useEffect(() => {
    setRoutes({})
    if (walks.length === 0) return
    const ctrl = new AbortController()
    void resolveWalkLegs(walks, {
      store: localRouteStore(),
      signal: ctrl.signal,
      onRoute: (key, route) => !ctrl.signal.aborted && setRoutes((prev) => ({ ...prev, [key]: route })),
    })
    return () => ctrl.abort()
    // legsSig descrive i tratti: si rifà il calcolo solo se cambiano
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legsSig])

  const lines: DayMapLine[] = useMemo(() => {
    const straight = (leg: Leg): [number, number][] => [[leg.from.lng, leg.from.lat], [leg.to.lng, leg.to.lat]]
    // a piedi lungo le strade; la linea d'aria solo se il percorso non è (ancora) disponibile o il tratto è troppo lungo
    const out: DayMapLine[] = walks.map((leg) => {
      const route = routes[leg.key]
      return route
        ? { id: leg.key, coords: route.coords, dashed: false, color: STOP_COLOR }
        : { id: leg.key, coords: straight(leg), dashed: true, color: STOP_COLOR }
    })
    for (const leg of legs) {
      if (leg.kind === 'line' && !leg.via) out.push({ id: leg.key, coords: straight(leg), dashed: true, color: STOP_COLOR })
    }
    for (const t of transports) {
      out.push({ id: t.id, coords: [[t.from.lng, t.from.lat], [t.to.lng, t.to.lat]], dashed: true, color: TRANSPORT_COLOR })
    }
    return out
  }, [legs, walks, routes, transports])

  const ends: DayMapEnd[] = useMemo(
    () =>
      transports.flatMap((t) => [
        { id: `${t.id}-a`, name: `${MODE_LABEL[t.mode]}: partenza ${t.fromName}`, ...t.from },
        { id: `${t.id}-b`, name: `${MODE_LABEL[t.mode]}: arrivo ${t.toName}`, ...t.to },
      ]),
    [transports],
  )

  return { stops, missing, legs, walks, routes, transports, lines, ends }
}
