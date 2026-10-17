// Ricerca luoghi con OpenStreetMap (Nominatim). Regole d'uso del servizio pubblico:
// al massimo 1 richiesta al secondo, solo su azione esplicita dell'utente (niente
// autocompletamento a ogni tasto) e con il Referer del sito, che il browser invia da solo.

export interface GeoResult {
  name: string
  nameLocal?: string
  address: string
  city: string
  lat: number
  lng: number
}

interface NominatimItem {
  lat: string
  lon: string
  name?: string
  display_name?: string
  namedetails?: Record<string, string>
  address?: Record<string, string>
}

export function parseNominatim(items: NominatimItem[]): GeoResult[] {
  const out: GeoResult[] = []
  for (const it of items) {
    const lat = Number(it.lat)
    const lng = Number(it.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const display = it.display_name ?? ''
    const a = it.address ?? {}
    const nd = it.namedetails ?? {}
    const name = (it.name || nd['name:it'] || nd['name:en'] || nd.name || display.split(',')[0] || '').trim()
    if (!name) continue
    const local = (nd.name || nd['name:ja'] || '').trim()
    out.push({
      name,
      nameLocal: local && local !== name ? local : undefined,
      address: display,
      city: a.city || a.town || a.village || a.municipality || a.suburb || a.county || '',
      lat,
      lng,
    })
  }
  return out
}

// coda semplice: una richiesta alla volta, distanziate di almeno 1,1 secondi
let queue: Promise<unknown> = Promise.resolve()
let lastCall = 0
const GAP_MS = 1100

export function searchPlaces(query: string, near?: { lat: number; lng: number }): Promise<GeoResult[]> {
  const job = queue.then(async () => {
    const wait = lastCall + GAP_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastCall = Date.now()

    const params = new URLSearchParams({
      q: query.trim(),
      format: 'jsonv2',
      limit: '6',
      addressdetails: '1',
      namedetails: '1',
      'accept-language': 'it',
    })
    if (near) {
      // preferisce (senza obbligare) i risultati vicini alla destinazione del viaggio
      const d = 4
      params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`)
    }
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Ricerca non disponibile (${res.status})`)
    return parseNominatim((await res.json()) as NominatimItem[])
  })
  queue = job.catch(() => undefined)
  return job
}
