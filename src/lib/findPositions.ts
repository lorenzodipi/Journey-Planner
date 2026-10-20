// Cerca la posizione dei luoghi che non hanno coordinate (es. importati da un file Google senza punti).
// Usa la ricerca di OpenStreetMap già presente nell'app (searchPlaces: una richiesta al secondo).
// Per ogni luogo prova più ricerche, dalla più precisa alla più generica, e accetta solo risultati
// vicini a dove ci si aspetta il luogo: così «Gion» di Kyoto non finisce in un altro paese.

import type { GeoResult } from './geocode'
import { meters } from './kmzPlan'

export interface LatLng {
  lat: number
  lng: number
}

export interface Searchable {
  id: string
  name: string
  city: string
  address?: string
  lat: number | null
  lng: number | null
}

export type Searcher = (query: string, near?: LatLng) => Promise<GeoResult[]>

/** Distanza massima dal centro della città, se la città è già nota (almeno un luogo trovato lì). */
export const CITY_RADIUS_KM = 40
/** Distanza massima dal centro del viaggio, quando la città non è ancora nota. */
export const TRIP_RADIUS_KM = 600

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Ricerche da provare, dalla più precisa alla più generica, senza doppioni. */
export function queriesFor(p: Pick<Searchable, 'name' | 'city' | 'address'>): string[] {
  const name = p.name.trim()
  const city = p.city.trim()
  const address = (p.address ?? '').replace(/\s+/g, ' ').trim()
  const out: string[] = []
  const add = (q: string) => {
    const t = q.trim().replace(/^,\s*|,\s*$/g, '')
    if (t && !out.some((o) => norm(o) === norm(t))) out.push(t)
  }
  add(city ? `${name}, ${city}` : name)
  if (address && norm(address) !== norm(city)) {
    // l'indirizzo senza il nome del luogo; si aggiunge la città se non c'è già
    const bare = address.split(name).join('').replace(/^[\s,]+/, '').trim()
    if (bare) add(city && !norm(bare).includes(norm(city)) ? `${bare}, ${city}` : bare)
  }
  if (city) add(name)
  return out
}

/** Il risultato più vicino a `near` entro `maxKm`, oppure null. */
export function pickResult(results: GeoResult[], near: LatLng, maxKm: number): GeoResult | null {
  let best: GeoResult | null = null
  let bestD = Infinity
  for (const r of results) {
    const d = meters(near, r)
    if (d <= maxKm * 1000 && d < bestD) {
      best = r
      bestD = d
    }
  }
  return best
}

/** Centro di ogni città, dalla media dei luoghi che hanno già una posizione. */
export class CityCenters {
  private sums = new Map<string, { lat: number; lng: number; n: number }>()
  constructor(places: Searchable[] = []) {
    for (const p of places) if (p.lat != null && p.lng != null) this.add(p.city, { lat: p.lat, lng: p.lng })
  }
  add(city: string, at: LatLng) {
    const key = norm(city)
    if (!key) return
    const s = this.sums.get(key) ?? { lat: 0, lng: 0, n: 0 }
    s.lat += at.lat
    s.lng += at.lng
    s.n += 1
    this.sums.set(key, s)
  }
  get(city: string): LatLng | null {
    const s = this.sums.get(norm(city))
    return s ? { lat: s.lat / s.n, lng: s.lng / s.n } : null
  }
}

/** Cerca la posizione di un luogo; null se nessuna ricerca dà un risultato plausibile. */
export async function locatePlace(p: Searchable, search: Searcher, centers: CityCenters, tripCenter: LatLng): Promise<LatLng | null> {
  const cityCenter = centers.get(p.city)
  const near = cityCenter ?? tripCenter
  const maxKm = cityCenter ? CITY_RADIUS_KM : TRIP_RADIUS_KM
  for (const q of queriesFor(p)) {
    const found = pickResult(await search(q, near), near, maxKm)
    if (found) {
      const at = { lat: Number(found.lat.toFixed(6)), lng: Number(found.lng.toFixed(6)) }
      centers.add(p.city, at)
      return at
    }
  }
  return null
}

export interface Found {
  id: string
  name: string
  lat: number
  lng: number
}

export interface FindProgress {
  total: number
  done: number
  found: number
  /** nome del luogo che si sta cercando */
  current: string
}

export interface FindResult {
  found: number
  notFound: { id: string; name: string }[]
  /** messaggio se il lavoro si è fermato prima della fine (rete, limite del servizio, errore di salvataggio) */
  error?: string
  stopped: boolean
}

export interface FindOptions {
  places: Searchable[]
  /** Luoghi del viaggio che hanno già una posizione (servono a capire dove sono le città). */
  known?: Searchable[]
  tripCenter: LatLng
  search: Searcher
  /** Salva un gruppo di posizioni trovate; restituisce un messaggio d'errore oppure null. */
  save: (batch: Found[]) => Promise<string | null>
  onProgress?: (p: FindProgress) => void
  shouldStop?: () => boolean
  batchSize?: number
}

/** Cerca le posizioni una dopo l'altra e le salva a gruppi, così quanto trovato non si perde se il lavoro si ferma. */
export async function findPositions(o: FindOptions): Promise<FindResult> {
  const { places, search, save, tripCenter, onProgress, shouldStop, batchSize = 10 } = o
  const centers = new CityCenters(o.known ?? [])
  const result: FindResult = { found: 0, notFound: [], stopped: false }
  let buffer: Found[] = []

  const flush = async (): Promise<boolean> => {
    if (buffer.length === 0) return true
    const batch = buffer
    buffer = []
    const message = await save(batch)
    if (message) {
      result.error = `Non riesco a salvare le posizioni: ${message}`
      return false
    }
    result.found += batch.length
    return true
  }

  // i luoghi della stessa città vicini tra loro: la prima posizione trovata aiuta a riconoscere le altre
  const queue = [...places].sort((a, b) => norm(a.city).localeCompare(norm(b.city)))
  let done = 0
  for (const p of queue) {
    if (shouldStop?.()) {
      result.stopped = true
      break
    }
    onProgress?.({ total: queue.length, done, found: result.found + buffer.length, current: p.name })
    try {
      const at = await locatePlace(p, search, centers, tripCenter)
      if (at) buffer.push({ id: p.id, name: p.name, ...at })
      else result.notFound.push({ id: p.id, name: p.name })
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      // gli errori di rete del browser sono in inglese ("Failed to fetch"): si sostituiscono con un messaggio chiaro
      result.error = !m || /fetch|network|load failed/i.test(m) ? 'Non riesco a raggiungere il servizio di ricerca: controlla la connessione.' : `${m}.`
      result.error += ' Quanto trovato finora è salvato: puoi riprendere quando vuoi.'
      break
    }
    done += 1
    if (buffer.length >= batchSize && !(await flush())) break
  }
  await flush()
  onProgress?.({ total: queue.length, done, found: result.found, current: '' })
  return result
}
