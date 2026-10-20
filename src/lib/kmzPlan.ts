// Abbinamento dei punti della mappa Google ai luoghi già presenti nel viaggio e piano dell'import.

import type { Place } from '../types'
import type { PlaceInput } from './tripApi'
import type { KmzPoint } from './kmz'

/** Nome senza maiuscole, accenti, simboli e articoli iniziali: "The Tokyo-Tower!" ~ "tokyo tower". */
export function normName(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/^(the|il|lo|la|le|i|gli|l)\s+/, '')
    .trim()
}

interface LatLng {
  lat: number | null
  lng: number | null
}

/** Distanza in metri (haversine). */
export function meters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const has = (p: LatLng): p is { lat: number; lng: number } => p.lat != null && p.lng != null

function sameName(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  return short.length >= 4 && ` ${long} `.includes(` ${short} `) // "tokyo tower" ~ "tokyo tower observatory"
}

export interface Match {
  point: KmzPoint
  place: Place
  how: 'nome' | 'nome simile' | 'vicino'
}

/**
 * Per ogni punto cerca un luogo esistente: stesso nome (anche il nome locale), nome simile, oppure
 * a meno di `radius` metri con la stessa prima parola. Un luogo esistente si usa una volta sola.
 */
export function matchPlaces(points: KmzPoint[], places: Place[], radius = 150): { matched: Match[]; fresh: KmzPoint[] } {
  const used = new Set<string>()
  const matched: Match[] = []
  const fresh: KmzPoint[] = []
  const prepared = places.map((p) => ({ p, names: [normName(p.name), normName(p.nameLocal)].filter(Boolean) }))
  const claim = (pt: KmzPoint, find: (x: (typeof prepared)[number]) => boolean, how: Match['how']) => {
    const hit = prepared.find((x) => !used.has(x.p.id) && find(x))
    if (!hit) return false
    used.add(hit.p.id)
    matched.push({ point: pt, place: hit.p, how })
    return true
  }
  // prima i nomi identici, così "Ramen Ichiran" non ruba l'abbinamento a "Ichiran"
  const exact: KmzPoint[] = []
  const rest: KmzPoint[] = []
  for (const pt of points) {
    const n = normName(pt.name)
    ;(prepared.some((x) => x.names.includes(n)) ? exact : rest).push(pt)
  }
  for (const pt of exact) {
    const n = normName(pt.name)
    if (!claim(pt, (x) => x.names.includes(n), 'nome')) rest.push(pt)
  }
  for (const pt of rest) {
    const n = normName(pt.name)
    const close = (x: (typeof prepared)[number]) => has(pt) && has(x.p) && meters(pt, x.p) <= radius
    if (claim(pt, (x) => x.names.some((m) => sameName(m, n)), 'nome simile')) continue
    if (claim(pt, (x) => close(x) && x.names.some((m) => m.split(' ')[0] === n.split(' ')[0]), 'vicino')) continue
    fresh.push(pt)
  }
  return { matched, fresh }
}

/** Città del luogo già presente più vicino (entro `maxKm`): per i luoghi nuovi senza città. */
export function nearestCity(point: LatLng, places: Place[], maxKm = 30): string | null {
  if (!has(point)) return null
  let best: string | null = null
  let bestD = maxKm * 1000
  for (const p of places) {
    if (!p.city || !has(p)) continue
    const d = meters(point, p)
    if (d < bestD) {
      bestD = d
      best = p.city
    }
  }
  return best
}

export interface PlaceUpdate {
  id: string
  name: string
  patch: { mapsUrl?: string; lat?: number; lng?: number }
}

export interface ImportPlan {
  /** Punti abbinati a un luogo già nell'app (anche quelli già a posto). */
  matched: number
  /** Luoghi esistenti a cui si aggiunge il link e/o la posizione. */
  updates: PlaceUpdate[]
  /** Luoghi da aggiungere. */
  fresh: PlaceInput[]
  /** Categorie che verranno create. */
  newCategories: string[]
  /** Punti senza coordinate: il link è una ricerca per nome e indirizzo. */
  withoutCoords: number
  /** Abbinati ma lontani più di 2 km dal pin attuale (da controllare). */
  far: { name: string; km: number }[]
}

export interface PlanOptions {
  /** Sostituisce anche i link già salvati (di base si riempiono solo quelli vuoti). */
  replaceLinks?: boolean
  /** Sposta i pin sulle coordinate di Google (di base sì, se il file le ha). */
  moveCoords?: boolean
  radius?: number
}

export function planImport(points: KmzPoint[], places: Place[], categories: string[], options: PlanOptions = {}): ImportPlan {
  const { replaceLinks = false, moveCoords = true, radius = 150 } = options
  const { matched, fresh } = matchPlaces(points, places, radius)

  const updates: PlaceUpdate[] = []
  const far: ImportPlan['far'] = []
  for (const { point, place } of matched) {
    const patch: PlaceUpdate['patch'] = {}
    if ((!place.mapsUrl || replaceLinks) && place.mapsUrl !== point.url) patch.mapsUrl = point.url
    if (moveCoords && has(point) && (!has(place) || meters(point, place) > 20)) {
      patch.lat = point.lat
      patch.lng = point.lng
    }
    if (has(point) && has(place)) {
      const d = meters(point, place)
      if (d > 2000) far.push({ name: place.name, km: Math.round(d / 1000) })
    }
    if (Object.keys(patch).length > 0) updates.push({ id: place.id, name: place.name, patch })
  }

  const known = new Set(categories.map((c) => c.toLowerCase()))
  const newCategories: string[] = []
  const inputs: PlaceInput[] = fresh.map((p) => {
    const category = p.type || p.folder
    if (category && !known.has(category.toLowerCase())) {
      known.add(category.toLowerCase())
      newCategories.push(category)
    }
    const address = p.address && p.address !== p.name ? p.address.replace(p.name, '').trim() : ''
    return {
      name: p.name,
      nameLocal: '',
      city: p.city || nearestCity(p, places) || '',
      category,
      status: 'idea',
      notes: p.note,
      address,
      mapsUrl: p.url,
      openingHours: '',
      lat: p.lat,
      lng: p.lng,
    }
  })

  return { matched: matched.length, updates, fresh: inputs, newCategories, withoutCoords: points.filter((p) => !has(p)).length, far }
}
