// Estrae le coordinate da un link di Google Maps (o simili) incollato dall'utente.
// I link corti (maps.app.goo.gl) non si possono risolvere dal browser: in quel caso
// restituiamo null e l'interfaccia chiede il link completo.

import type { TransportMode } from '../types'

export interface MapsInfo {
  lat: number
  lng: number
  name?: string
}

const inRange = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '))
  } catch {
    return text
  }
}

export function parseMapsUrl(raw: string): MapsInfo | null {
  const text = raw.trim()
  if (!/^https?:\/\//i.test(text)) return null

  const nameMatch = text.match(/\/maps\/place\/([^/@?]+)/)
  const name = nameMatch ? safeDecode(nameMatch[1]).trim() || undefined : undefined

  const patterns: RegExp[] = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // pin preciso del luogo
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // centro della mappa
    /[?&](?:q|query|ll|center|destination)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (!m) continue
    const lat = Number(m[1])
    const lng = Number(m[2])
    if (inRange(lat, lng)) return { lat, lng, name }
  }
  return null
}

/** Link per aprire il luogo in Google Maps (usa quello salvato, altrimenti le coordinate o il nome). */
export function mapsLinkFor(p: { mapsUrl?: string; lat: number | null; lng: number | null; name: string; city?: string }): string {
  if (p.mapsUrl) return p.mapsUrl
  const query = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : [p.name, p.city].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

// ---------- indicazioni stradali (link "dir") ----------

export interface DirectionsPoint {
  name: string // "Kamakura Station" (vuoto se nel link c'erano solo coordinate)
  lat: number | null
  lng: number | null
}

export interface DirectionsInfo {
  from: DirectionsPoint
  to: DirectionsPoint
  /** Mezzo scelto in Google Maps; assente se il link non lo dice. */
  mode?: TransportMode
}

// Il numero dopo "!3e" nei link di Google Maps: 0 auto, 1 bici, 2 a piedi, 3 mezzi pubblici, 4 aereo.
const MODE_BY_DATA: Record<string, TransportMode> = { '0': 'car', '1': 'other', '2': 'walk', '3': 'train', '4': 'plane' }
const MODE_BY_PARAM: Record<string, TransportMode> = {
  driving: 'car',
  bicycling: 'other',
  walking: 'walk',
  transit: 'train',
  flying: 'plane',
}

const COORDS = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/

function pointFromText(raw: string): DirectionsPoint {
  const text = safeDecode(raw).trim()
  const m = text.match(COORDS)
  if (m && inRange(Number(m[1]), Number(m[2]))) return { name: '', lat: Number(m[1]), lng: Number(m[2]) }
  return { name: text.split(',')[0].trim(), lat: null, lng: null }
}

/** True per i link corti (maps.app.goo.gl, goo.gl/maps), che il browser non può risolvere da solo. */
export const isShortMapsLink = (raw: string) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(raw.trim())

/**
 * Legge da un link "indicazioni" di Google Maps partenza, arrivo e mezzo.
 * Il link non contiene il percorso vero e proprio (le linee dei treni): solo i due estremi.
 */
export function parseDirectionsUrl(raw: string): DirectionsInfo | null {
  const text = raw.trim()
  if (!/^https?:\/\//i.test(text)) return null
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }

  let from: DirectionsPoint | null = null
  let to: DirectionsPoint | null = null

  // forma "…/maps/dir/Partenza/Arrivo/@…/data=…"
  const path = url.pathname.match(/\/maps\/dir\/(.+)$/)
  if (path) {
    const parts = path[1].split('/').filter((p) => p && !p.startsWith('@') && !p.startsWith('data='))
    if (parts.length >= 2) {
      from = pointFromText(parts[0])
      to = pointFromText(parts[parts.length - 1])
    }
  }
  // forma "…/maps/dir/?api=1&origin=…&destination=…"
  const origin = url.searchParams.get('origin')
  const destination = url.searchParams.get('destination')
  if (!from && origin && destination) {
    from = pointFromText(origin)
    to = pointFromText(destination)
  }
  if (!from || !to) return null

  // coordinate precise dei punti, nell'ordine in cui compaiono nel link: "!1d{lng}!2d{lat}"
  const pairs: { lat: number; lng: number }[] = []
  for (const m of text.matchAll(/!1d(-?\d+(?:\.\d+)?)!2d(-?\d+(?:\.\d+)?)/g)) {
    const lng = Number(m[1])
    const lat = Number(m[2])
    if (inRange(lat, lng)) pairs.push({ lat, lng })
  }
  if (pairs.length >= 2) {
    if (from.lat == null) from = { ...from, ...pairs[0] }
    if (to.lat == null) to = { ...to, ...pairs[pairs.length - 1] }
  }

  const dataMode = text.match(/!3e(\d)/)?.[1]
  const paramMode = url.searchParams.get('travelmode')?.toLowerCase()
  const mode = (dataMode && MODE_BY_DATA[dataMode]) || (paramMode && MODE_BY_PARAM[paramMode]) || undefined
  return { from, to, mode }
}
