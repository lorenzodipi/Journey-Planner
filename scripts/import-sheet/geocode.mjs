// Geocoding dei luoghi con Nominatim (OpenStreetMap): gratuito, senza chiave, massimo 1 richiesta al secondo.
// I risultati si salvano in una cache (private/geocode-cache.json) per non ripetere le richieste.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
export const MIN_INTERVAL_MS = 1100

const hasJapanese = (s) => /[぀-ヿ㐀-鿿]/.test(s)

/** Ricerche da provare, dalla più precisa alla più generica. */
export function buildQueries(place, country = 'Japan') {
  const q = []
  if (place.address) q.push(`${place.address}, ${country}`)
  q.push(`${place.name}, ${place.city || ''}, ${country}`.replace(/,\s*,/g, ','))
  if (place.address) q.push(`${place.name}, ${place.address}`)
  return [...new Set(q)]
}

export function toResult(r) {
  const lat = Number(r.lat)
  const lng = Number(r.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const local = r.namedetails?.name
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), nameLocal: local && hasJapanese(local) ? local : null, display: r.display_name ?? '' }
}

export function createGeocoder({ fetchFn = fetch, cache = {}, userAgent, countryCodes = 'jp', sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now } = {}) {
  let last = 0
  async function search(query) {
    if (query in cache) return cache[query]
    const wait = last + MIN_INTERVAL_MS - now()
    if (wait > 0) await sleep(wait)
    last = now()
    const url = `${NOMINATIM}?${new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', namedetails: '1', countrycodes: countryCodes })}`
    const res = await fetchFn(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } })
    if (res.status === 429) throw new Error('Nominatim ha limitato le richieste (429): riprova tra qualche minuto, la cache conserva quanto già trovato.')
    if (!res.ok) throw new Error(`Nominatim ha risposto ${res.status}.`)
    const json = await res.json()
    const found = Array.isArray(json) && json.length > 0 ? toResult(json[0]) : null
    cache[query] = found
    return found
  }
  return {
    cache,
    /** Prima ricerca che trova qualcosa, oppure `null`. */
    async locate(place) {
      for (const q of buildQueries(place)) {
        const hit = await search(q)
        if (hit) return { ...hit, query: q }
      }
      return null
    },
  }
}
