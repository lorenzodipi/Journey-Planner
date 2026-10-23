// Foto di un luogo da Wikipedia / Wikimedia Commons: gratuita, senza chiave né account, utilizzabile dal browser
// (`origin=*`). Si cerca solo alla selezione di un pin e si accetta una foto solo se l'articolo è vicino alle
// coordinate E il titolo è compatibile col nome del luogo: meglio l'icona che la foto sbagliata.
import type { Place } from '../types'

export interface PlacePhoto {
  /** Miniatura (circa 240 px). */
  url: string
  /** Pagina dell'articolo da cui viene, per il credito. */
  page: string
  title: string
}

/** Un articolo trovato attorno alle coordinate, già letto dalla risposta dell'API. */
export interface PhotoCandidate {
  title: string
  lat: number
  lng: number
  thumb?: string
  /** Nome del file dell'immagine principale (es. «Senso-ji_2019.jpg»). */
  file?: string
  page: string
}

export const MAX_DISTANCE_M = 400

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Minuscolo, senza accenti né segni: «Sensō-ji» → «senso ji». Le lettere di ogni alfabeto restano. */
export function normalizeTitle(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const tokens = (s: string) => new Set(normalizeTitle(s).split(' ').filter((t) => t.length > 0))

/** Il titolo dell'articolo è compatibile con uno dei nomi del luogo? */
export function titleMatches(title: string, names: string[]): boolean {
  const t = normalizeTitle(title)
  if (!t) return false
  const tt = tokens(title)
  for (const name of names) {
    const n = normalizeTitle(name)
    if (!n) continue
    if (n === t) return true
    // uno contenuto nell'altro, ma non per una sigla di due lettere
    const [short, long] = n.length <= t.length ? [n, t] : [t, n]
    if (short.length >= 4 && new RegExp(`(^| )${short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`, 'u').test(long)) return true
    const nt = tokens(name)
    const common = [...nt].filter((x) => tt.has(x)).length
    const union = new Set([...nt, ...tt]).size
    if (union > 0 && common >= 2 && common / union >= 0.5) return true
  }
  return false
}

const BAD_FILE = /\.svg$|\.svg\.png$|logo|flag|bandiera|stemma|coat[ _]of[ _]arms|emblem|locator|location[ _]map|map[ _.]|icon|symbol|signature/i

/** Loghi, bandiere, stemmi e mappe non sono foto del posto. */
export function isBadImage(file: string | undefined, thumb: string | undefined): boolean {
  return BAD_FILE.test(file ?? '') || BAD_FILE.test(decodeURIComponent((thumb ?? '').split('/').pop() ?? ''))
}

/** Sceglie la foto da mostrare tra gli articoli vicini: il più vicino tra quelli compatibili, o niente. */
export function pickPhoto(candidates: PhotoCandidate[], place: Pick<Place, 'name' | 'nameLocal' | 'lat' | 'lng'>): PlacePhoto | null {
  if (place.lat == null || place.lng == null) return null
  const here = { lat: place.lat, lng: place.lng }
  const names = [place.name, place.nameLocal].filter((n): n is string => !!n && n.trim().length > 0)
  const ok = candidates
    .filter((c) => c.thumb && !isBadImage(c.file, c.thumb))
    .map((c) => ({ c, d: distanceM(here, c) }))
    .filter(({ c, d }) => d <= MAX_DISTANCE_M && titleMatches(c.title, names))
    .sort((a, b) => a.d - b.d)
  const best = ok[0]?.c
  return best ? { url: best.thumb as string, page: best.page, title: best.title } : null
}

// ---------- cache ----------

export const FOUND_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const NONE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface CacheEntry {
  /** Nome e coordinate con cui è stata fatta la ricerca: se cambiano si ricerca. */
  key: string
  at: number
  photo: PlacePhoto | null
}

export function photoKey(place: Pick<Place, 'name' | 'nameLocal' | 'lat' | 'lng'>): string {
  const c = (n: number | null | undefined) => (n == null ? '' : n.toFixed(4))
  return `${normalizeTitle(place.name)}|${normalizeTitle(place.nameLocal ?? '')}|${c(place.lat)},${c(place.lng)}`
}

export function cacheFresh(entry: CacheEntry | null | undefined, key: string, now: number): boolean {
  if (!entry || entry.key !== key) return false
  return now - entry.at < (entry.photo ? FOUND_TTL_MS : NONE_TTL_MS) && now >= entry.at
}

const STORE = 'jp.placePhoto.v1.'

export function readCache(placeId: string, storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): CacheEntry | null {
  try {
    const raw = storage?.getItem(STORE + placeId)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<CacheEntry>
    if (typeof v?.key !== 'string' || typeof v.at !== 'number') return null
    const p = v.photo
    if (p != null && (typeof p.url !== 'string' || typeof p.page !== 'string')) return null
    return { key: v.key, at: v.at, photo: p ? { url: p.url, page: p.page, title: String(p.title ?? '') } : null }
  } catch {
    return null
  }
}

export function writeCache(placeId: string, entry: CacheEntry, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORE + placeId, JSON.stringify(entry))
  } catch {
    // spazio finito o memoria bloccata: la foto si ricerca la volta dopo
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** La foto già trovata e ancora valida, senza fare richieste (per il credito in «Dettagli»). */
export function cachedPhoto(place: Pick<Place, 'id' | 'name' | 'nameLocal' | 'lat' | 'lng'>, now = Date.now()): PlacePhoto | null {
  const entry = readCache(place.id)
  return entry && cacheFresh(entry, photoKey(place), now) ? entry.photo : null
}

// ---------- rete ----------

interface WikiPage {
  title: string
  fullurl?: string
  thumbnail?: { source: string }
  pageimage?: string
  coordinates?: { lat: number; lon: number }[]
}

export function parseWikiPages(json: unknown, lang: string): PhotoCandidate[] {
  const pages = (json as { query?: { pages?: Record<string, WikiPage> } } | null)?.query?.pages
  if (!pages || typeof pages !== 'object') return []
  const out: PhotoCandidate[] = []
  for (const p of Object.values(pages)) {
    const c = p?.coordinates?.[0]
    if (!p?.title || !c || !Number.isFinite(c.lat) || !Number.isFinite(c.lon)) continue
    out.push({
      title: p.title,
      lat: c.lat,
      lng: c.lon,
      thumb: p.thumbnail?.source,
      file: p.pageimage,
      page: p.fullurl ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    })
  }
  return out
}

function geosearchUrl(lang: string, lat: number, lng: number): string {
  const q = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'geosearch',
    ggscoord: `${lat}|${lng}`,
    ggsradius: '300',
    ggslimit: '8',
    prop: 'pageimages|coordinates|info',
    piprop: 'thumbnail|name',
    pithumbsize: '240',
    inprop: 'url',
    colimit: '8',
  })
  return `https://${lang}.wikipedia.org/w/api.php?${q}`
}

async function searchLang(lang: string, lat: number, lng: number, fetcher: typeof fetch, signal: AbortSignal): Promise<PhotoCandidate[]> {
  const res = await fetcher(geosearchUrl(lang, lat, lng), { signal })
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`)
  return parseWikiPages(await res.json(), lang)
}

/**
 * Cerca la foto. `null` = non c'è una foto affidabile. Se la rete non risponde lancia (così non si salva «non trovata»
 * per un problema di connessione).
 */
export async function findPhoto(
  place: Pick<Place, 'name' | 'nameLocal' | 'lat' | 'lng'>,
  langs: string[] = ['it', 'en'],
  fetcher: typeof fetch = fetch,
): Promise<PlacePhoto | null> {
  if (place.lat == null || place.lng == null) return null
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 8000)
  try {
    const results = await Promise.allSettled(langs.map((l) => searchLang(l, place.lat as number, place.lng as number, fetcher, ctl.signal)))
    if (results.every((r) => r.status === 'rejected')) throw new Error('Wikipedia non raggiungibile')
    const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    return pickPhoto(all, place)
  } finally {
    clearTimeout(timer)
  }
}
