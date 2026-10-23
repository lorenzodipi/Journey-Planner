import { distanceM } from './dayRoute'
import { changedPositions, renumber } from './itemOrder'

// «Ottimizza percorso»: le tappe senza orario si dispongono sul tragitto più breve (in linea d'aria),
// dopo tutte quelle con orario. Vicino più prossimo + miglioramento 2-opt: istantaneo, offline e
// deterministico per i pochi punti di una giornata.

export interface LatLng {
  lat: number
  lng: number
}

export interface RoutePoint extends LatLng {
  id: string
}

/** Lunghezza in metri del percorso che parte da `start` (se c'è) e tocca i punti nell'ordine dato. */
export function pathLength(start: LatLng | null, pts: LatLng[]): number {
  let total = 0
  let prev = start
  for (const p of pts) {
    if (prev) total += distanceM(prev, p)
    prev = p
  }
  return total
}

function nearestNeighbour(start: LatLng | null, pts: RoutePoint[], first: number | null): RoutePoint[] {
  const left = pts.slice()
  const out: RoutePoint[] = []
  let cur: LatLng | null = start
  if (first != null) {
    const [p] = left.splice(first, 1)
    out.push(p)
    cur = p
  }
  while (left.length > 0) {
    let best = 0
    if (cur) {
      let bestD = Infinity
      left.forEach((p, i) => {
        const d = distanceM(cur as LatLng, p)
        if (d < bestD - 1e-9) {
          bestD = d
          best = i
        }
      })
    }
    const [p] = left.splice(best, 1)
    out.push(p)
    cur = p
  }
  return out
}

/** 2-opt su un percorso aperto: inverte tratti finché accorcia. `start` resta fisso. */
function twoOpt(start: LatLng | null, path: RoutePoint[]): RoutePoint[] {
  const p = path.slice()
  const at = (i: number): LatLng | null => (i < 0 ? start : p[i])
  let improved = true
  let guard = 0
  while (improved && guard++ < 50) {
    improved = false
    for (let i = 0; i < p.length - 1; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const before = at(i - 1)
        const after = j + 1 < p.length ? p[j + 1] : null
        const oldD = (before ? distanceM(before, p[i]) : 0) + (after ? distanceM(p[j], after) : 0)
        const newD = (before ? distanceM(before, p[j]) : 0) + (after ? distanceM(p[i], after) : 0)
        if (newD < oldD - 1e-6) {
          const rev = p.slice(i, j + 1).reverse()
          p.splice(i, j - i + 1, ...rev)
          improved = true
        }
      }
    }
  }
  return p
}

/**
 * Ordine dei punti per il percorso più breve a partire da `start`. Senza `start` si prova ogni punto come inizio.
 * Non è mai peggiore dell'ordine di partenza: se non lo accorcia, lo restituisce com'è.
 */
export function optimizeOrder(start: LatLng | null, pts: RoutePoint[]): RoutePoint[] {
  if (pts.length < 2) return pts.slice()
  const candidates = start ? [twoOpt(start, nearestNeighbour(start, pts, null))] : pts.map((_, i) => twoOpt(null, nearestNeighbour(null, pts, i)))
  let best = pts.slice()
  let bestLen = pathLength(start, best)
  for (const c of candidates) {
    const len = pathLength(start, c)
    if (len < bestLen - 1e-6) {
      best = c
      bestLen = len
    }
  }
  return best
}

export interface RouteItem {
  id: string
  position?: number
  time?: string
  lat?: number | null
  lng?: number | null
}

export interface RoutePlan {
  /** nuovo ordine di tutte le tappe del giorno */
  order: string[]
  /** posizioni da scrivere (solo quelle che cambiano); vuoto = il percorso è già quello */
  changed: { id: string; position: number }[]
  /** lunghezza (m) del tragitto tra le tappe senza orario, prima e dopo */
  beforeM: number
  afterM: number
}

const hasPos = (i: RouteItem): i is RouteItem & LatLng => typeof i.lat === 'number' && typeof i.lng === 'number'

/**
 * Piano del comando «Ottimizza percorso». `items` è il giorno nell'ordine mostrato; `home` è l'alloggio del giorno
 * (se ha coordinate). Parte dall'ultima tappa con orario che ha una posizione, altrimenti da `home`.
 * Le tappe con orario restano le prime, in ordine di orario; quelle senza orario e senza posizione vanno in coda.
 * `null` se non ci sono almeno due tappe senza orario con una posizione.
 */
export function planRoute(items: RouteItem[], home: LatLng | null): RoutePlan | null {
  const timed = items.filter((i) => i.time).sort((a, b) => (a.time as string).localeCompare(b.time as string))
  const free = items.filter((i) => !i.time)
  const movable = free.filter(hasPos)
  const fixedTail = free.filter((i) => !hasPos(i))
  if (movable.length < 2) return null
  const last = [...timed].reverse().find(hasPos)
  const start: LatLng | null = last ? { lat: last.lat, lng: last.lng } : home
  const points = movable.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng }))
  const best = optimizeOrder(start, points)
  const byId = new Map(items.map((i) => [i.id, i]))
  const order = [...timed.map((i) => i.id), ...best.map((p) => p.id), ...fixedTail.map((i) => i.id)]
  const ordered = order.map((id) => byId.get(id) as RouteItem)
  return {
    order,
    changed: changedPositions(items, renumber(ordered)),
    beforeM: pathLength(start, points),
    afterM: pathLength(start, best),
  }
}
