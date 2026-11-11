// Ricerca luoghi con OpenStreetMap (Nominatim). Regole d'uso del servizio pubblico:
// al massimo 1 richiesta al secondo, solo su azione esplicita dell'utente (niente
// autocompletamento a ogni tasto) e con il Referer del sito, che il browser invia da solo.
// Se Nominatim non risponde (rete, limite di richieste: il browser lo vede come un errore CORS, perché la risposta
// d'errore non ha l'intestazione Access-Control-Allow-Origin) si prova Photon di Komoot, sempre con i dati di OpenStreetMap.

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

// Tokyo: per OpenStreetMap ognuno dei 23 quartieri speciali è una «città» (Chiyoda, Shibuya…), ma per chi viaggia la città
// è Tokyo. Si cambia solo dentro la prefettura di Tokyo (le città vere della zona di Tama, come Hachiōji, restano).
const QUARTIERI_TOKYO = new Set(
  'chiyoda chuo minato shinjuku bunkyo taito sumida koto shinagawa meguro ota setagaya shibuya nakano suginami toshima kita arakawa itabashi nerima adachi katsushika edogawa 千代田 中央 港 新宿 文京 台東 墨田 江東 品川 目黒 大田 世田谷 渋谷 中野 杉並 豊島 北 荒川 板橋 練馬 足立 葛飾 江戸川'.split(' '),
)
const semplice = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(?:[\s-]*(?:ku|city|ward))+$|区$/u, '')
    .trim()

/** La città da un indirizzo di Nominatim (città, paese, villaggio…), con i quartieri di Tokyo riportati a Tokyo. */
export function cittaDa(a: Record<string, string>): string {
  const city = a.city || a.town || a.village || a.municipality || a.suburb || a.county || ''
  const prefettura = `${a['ISO3166-2-lvl4'] ?? ''} ${a.state ?? ''} ${a.province ?? ''}`
  const aTokyo = /JP-13|tokyo|tōkyō|東京/i.test(prefettura)
  return aTokyo && city && QUARTIERI_TOKYO.has(semplice(city)) ? 'Tokyo' : city
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
      city: cittaDa(a),
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
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`Ricerca non disponibile (${res.status})`)
      return parseNominatim((await res.json()) as NominatimItem[])
    } catch (primo) {
      const ph = new URLSearchParams({ q: query.trim(), limit: '6', lang: 'en' })
      if (near) (ph.set('lat', String(near.lat)), ph.set('lon', String(near.lng)))
      const res = await fetch(`https://photon.komoot.io/api/?${ph}`, { headers: { Accept: 'application/json' } }).catch(() => null)
      if (!res?.ok) throw primo instanceof Error ? primo : new Error('Ricerca non disponibile')
      return parsePhoton((await res.json()) as PhotonRisposta)
    }
  })
  queue = job.catch(() => undefined)
  return job
}

interface NominatimReverse {
  name?: string
  display_name?: string
  address?: Record<string, string>
}

/** Indirizzo completo come lo scrive Google («Via 12, 846 Flúðir, Islanda») e città da una risposta di Nominatim /reverse. */
export function parseReverse(item: NominatimReverse | null | undefined): { address: string; city: string } {
  const a = item?.address ?? {}
  const city = cittaDa(a)
  const via = a.road || a.pedestrian || a.footway || a.path || a.square || a.neighbourhood || ''
  const strada = via ? `${via}${a.house_number ? ` ${a.house_number}` : ''}` : a.suburb || a.quarter || ''
  const zona = [a.postcode, city].filter(Boolean).join(' ')
  const address = [strada, zona, a.country].filter(Boolean).join(', ')
  return { address, city }
}

/** Indirizzo e città di un punto sulla mappa (una richiesta, su azione esplicita dell'utente). */
export function reverseGeocode(lat: number, lng: number): Promise<{ address: string; city: string }> {
  const job = queue.then(async () => {
    const wait = lastCall + GAP_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastCall = Date.now()
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'jsonv2', addressdetails: '1', zoom: '18', 'accept-language': 'it' })
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`Indirizzo non disponibile (${res.status})`)
      return parseReverse((await res.json()) as NominatimReverse)
    } catch (primo) {
      const ph = new URLSearchParams({ lat: String(lat), lon: String(lng), lang: 'en', limit: '1' })
      const res = await fetch(`https://photon.komoot.io/reverse?${ph}`, { headers: { Accept: 'application/json' } }).catch(() => null)
      if (!res?.ok) throw primo instanceof Error ? primo : new Error('Indirizzo non disponibile')
      return parsePhotonReverse((await res.json()) as PhotonRisposta)
    }
  })
  queue = job.catch(() => undefined)
  return job
}

// ---- Photon (photon.komoot.io): GeoJSON con le proprietà di OpenStreetMap; si riportano ai nomi di Nominatim
interface PhotonProps {
  name?: string
  street?: string
  housenumber?: string
  postcode?: string
  city?: string
  district?: string
  locality?: string
  county?: string
  state?: string
  country?: string
  countrycode?: string
  type?: string
}
export interface PhotonRisposta {
  features?: { geometry?: { coordinates?: [number, number] }; properties?: PhotonProps }[]
}

function indirizzoPhoton(p: PhotonProps): Record<string, string> {
  const a: Record<string, string> = {}
  const metti = (k: string, v?: string) => (v ? (a[k] = v) : undefined)
  // un risultato che è esso stesso una città ha il nome al posto di «city»
  metti('city', p.city || (p.type === 'city' ? p.name : undefined))
  metti('road', p.street)
  metti('house_number', p.housenumber)
  metti('postcode', p.postcode)
  metti('suburb', p.district || p.locality)
  metti('county', p.county)
  metti('state', p.state)
  metti('country', p.country)
  if (p.countrycode === 'JP' && /tokyo/i.test(p.state ?? '')) a['ISO3166-2-lvl4'] = 'JP-13'
  return a
}

/** Indirizzo e città dal primo risultato di Photon /reverse. */
export function parsePhotonReverse(r: PhotonRisposta | null | undefined): { address: string; city: string } {
  const p = r?.features?.[0]?.properties
  return p ? parseReverse({ address: indirizzoPhoton(p) }) : { address: '', city: '' }
}

/** Risultati di Photon /api come quelli di Nominatim. */
export function parsePhoton(r: PhotonRisposta | null | undefined): GeoResult[] {
  const out: GeoResult[] = []
  for (const f of r?.features ?? []) {
    const p = f.properties ?? {}
    const [lng, lat] = f.geometry?.coordinates ?? [NaN, NaN]
    const name = (p.name || p.street || '').trim()
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const a = indirizzoPhoton(p)
    const city = cittaDa(a)
    const via = p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ''}` : ''
    const address = [name, via, [p.postcode, city].filter(Boolean).join(' '), p.country].filter((x, i, all) => x && all.indexOf(x) === i).join(', ')
    out.push({ name, address, city, lat, lng })
  }
  return out
}
