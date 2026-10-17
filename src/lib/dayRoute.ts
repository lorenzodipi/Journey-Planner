// Mappa del giorno: tappe numerate, tratti a piedi lungo le strade, linee tratteggiate per i mezzi.
// Il calcolo dei percorsi a piedi usa OSRM (dati OpenStreetMap, senza chiave) e, per funzionare anche
// offline, ogni percorso già calcolato resta salvato sul telefono.

import type { Day, Place, Transport, TransportMode } from '../types'

export interface LatLng {
  lat: number
  lng: number
}

export interface DayStop extends LatLng {
  id: string
  n: number // numero mostrato sulla mappa (1, 2, 3…)
  name: string
}

/** Oltre questa distanza in linea d'aria non si va a piedi: si usa un mezzo e si traccia una linea tratteggiata. */
export const WALK_MAX_M = 2000

export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371008.8
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const hasPos = (p: { lat: number | null; lng: number | null }): p is { lat: number; lng: number } => p.lat != null && p.lng != null

/** Tappe del giorno che hanno una posizione, nell'ordine in cui sono nel programma. `missing` = tappe di un luogo senza posizione. */
export function dayStops(day: Day, places: Place[]): { stops: DayStop[]; missing: number } {
  const byId = new Map(places.map((p) => [p.id, p]))
  const stops: DayStop[] = []
  let missing = 0
  for (const it of day.items) {
    const place = it.placeId ? byId.get(it.placeId) : undefined
    if (place && hasPos(place)) {
      stops.push({ id: it.id, n: stops.length + 1, name: it.title || place.name, lat: place.lat, lng: place.lng })
    } else if (it.kind === 'visit' || it.kind === 'meal') {
      missing++
    }
  }
  return { stops, missing }
}

export type LegKind = 'walk' | 'line'

export interface Leg {
  key: string
  from: DayStop
  to: DayStop
  kind: LegKind
  straightM: number
}

const r5 = (n: number) => n.toFixed(5)
export const legKey = (a: LatLng, b: LatLng) => `${r5(a.lat)},${r5(a.lng)};${r5(b.lat)},${r5(b.lng)}`

/** Un tratto tra due tappe consecutive: a piedi se sono vicine, altrimenti linea tratteggiata. */
export function planLegs(stops: DayStop[]): Leg[] {
  const legs: Leg[] = []
  for (let i = 0; i + 1 < stops.length; i++) {
    const from = stops[i]
    const to = stops[i + 1]
    const straightM = distanceM(from, to)
    legs.push({ key: legKey(from, to), from, to, kind: straightM <= WALK_MAX_M ? 'walk' : 'line', straightM })
  }
  return legs
}

export interface TransportLine {
  id: string
  mode: TransportMode
  fromName: string
  toName: string
  from: LatLng
  to: LatLng
}

/** Trasporti del giorno con partenza e arrivo posizionati. */
export function dayTransportLines(day: Pick<Day, 'id'>, transports: Transport[]): TransportLine[] {
  const out: TransportLine[] = []
  for (const t of transports) {
    if (t.dayId !== day.id) continue
    if (t.fromLat == null || t.fromLng == null || t.toLat == null || t.toLng == null) continue
    out.push({
      id: t.id,
      mode: t.mode,
      fromName: t.from,
      toName: t.to,
      from: { lat: t.fromLat, lng: t.fromLng },
      to: { lat: t.toLat, lng: t.toLng },
    })
  }
  return out
}

// ---------- percorsi a piedi (OSRM) ----------

export interface WalkRoute {
  coords: [number, number][] // [lng, lat]
  meters: number
  seconds: number
}

export function parseOsrm(json: unknown): WalkRoute | null {
  const route = (json as { routes?: { geometry?: { coordinates?: unknown }; distance?: number; duration?: number }[] })?.routes?.[0]
  const coords = route?.geometry?.coordinates
  if (!route || !Array.isArray(coords) || coords.length < 2) return null
  const clean = coords.filter((c): c is [number, number] => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
  if (clean.length < 2) return null
  return { coords: clean, meters: Number(route.distance) || 0, seconds: Number(route.duration) || 0 }
}

// Il server pubblico di OpenStreetMap (FOSSGIS) ha un'istanza per i pedoni. Il nome del profilo nell'indirizzo
// dipende dalla versione, quindi si prova l'uno e poi l'altro.
const ENDPOINTS = [
  'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
  'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
]

export async function fetchWalkRoute(
  a: LatLng,
  b: LatLng,
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<WalkRoute | null> {
  const coords = `${a.lng},${a.lat};${b.lng},${b.lat}`
  for (const base of ENDPOINTS) {
    try {
      const res = await fetchFn(`${base}/${coords}?overview=full&geometries=geojson`, { signal })
      if (!res.ok) continue
      const route = parseOsrm(await res.json())
      if (route) return route
    } catch (e) {
      if (signal?.aborted) throw e
      // rete assente o servizio non raggiungibile: si prova l'altro indirizzo, poi si rinuncia
    }
  }
  return null
}

export interface RouteStore {
  get(key: string): WalkRoute | undefined
  set(key: string, route: WalkRoute): void
}

const STORE_KEY = 'jp.routes.v1'

/** Percorsi già calcolati, salvati sul telefono (al massimo `max`, i più vecchi si scartano). */
export function localRouteStore(storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = safeStorage(), max = 300): RouteStore {
  let data: { order: string[]; routes: Record<string, WalkRoute> } = { order: [], routes: {} }
  try {
    const raw = storage?.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.order) && parsed.routes && typeof parsed.routes === 'object') data = parsed
    }
  } catch {
    // cache illeggibile: si riparte vuota
  }
  return {
    get: (key) => data.routes[key],
    set(key, route) {
      if (!data.routes[key]) data.order.push(key)
      data.routes[key] = route
      while (data.order.length > max) delete data.routes[data.order.shift() as string]
      try {
        storage?.setItem(STORE_KEY, JSON.stringify(data))
      } catch {
        // spazio esaurito o archivio non disponibile: il percorso resta solo in memoria
      }
    },
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

export interface ResolveOptions {
  store: RouteStore
  fetchFn?: typeof fetch
  signal?: AbortSignal
  /** Chiamata per ogni tratto a piedi: il percorso, oppure `null` se non è stato possibile calcolarlo. */
  onRoute: (key: string, route: WalkRoute | null) => void
  /** Pausa tra due richieste di rete, per rispettare il servizio gratuito. */
  gapMs?: number
}

/** Calcola (o recupera dalla cache) i percorsi dei tratti a piedi, uno alla volta. */
export async function resolveWalkLegs(legs: Leg[], opts: ResolveOptions): Promise<void> {
  const { store, fetchFn = fetch, signal, onRoute, gapMs = 300 } = opts
  let first = true
  for (const leg of legs) {
    if (leg.kind !== 'walk') continue
    if (signal?.aborted) return
    const cached = store.get(leg.key)
    if (cached) {
      onRoute(leg.key, cached)
      continue
    }
    if (!first && gapMs > 0) await new Promise((r) => setTimeout(r, gapMs))
    first = false
    if (signal?.aborted) return
    try {
      const route = await fetchWalkRoute(leg.from, leg.to, fetchFn, signal)
      if (route) store.set(leg.key, route)
      onRoute(leg.key, route)
    } catch {
      return // interrotto
    }
  }
}

export function formatDistance(m: number): string {
  if (m < 950) return `${Math.max(10, Math.round(m / 10) * 10)} m`
  return `${(m / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} km`
}

export const formatMinutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`

/** Come si fa un tratto tra due tappe: "10 min a piedi · 810 m", "serve un mezzo", ecc. `route`: percorso calcolato, `null` se non disponibile, `undefined` se in calcolo. */
export function describeLeg(leg: Pick<Leg, 'kind' | 'straightM'>, route: WalkRoute | null | undefined): string {
  if (leg.kind === 'line') return `${formatDistance(leg.straightM)} in linea d'aria: serve un mezzo`
  if (route) return `${formatMinutes(route.seconds)} a piedi · ${formatDistance(route.meters)}`
  if (route === null) return `${formatDistance(leg.straightM)} in linea d'aria a piedi (percorso non disponibile)`
  return 'Calcolo il percorso…'
}
