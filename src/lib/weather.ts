import { daysBetween } from './dates'
import { t as tt } from '../i18n'

// Previsioni da Open-Meteo (gratuito, senza chiave). Coprono circa 16 giorni da oggi:
// prima la scheda lo dice e mostra solo la data da cui saranno disponibili.
// L'ultimo risultato resta salvato sul telefono per l'uso offline.

/** Un'ora di previsione (ora locale della destinazione). */
export interface HourWeather {
  h: number // 0-23
  t: number // temperatura, °C
  code: number // codice WMO
  rain: number | null // probabilità di pioggia, %
  feels?: number // temperatura percepita
  wind?: number // km/h
  windDir?: number // gradi, da dove soffia
  /** raffiche, km/h (assenti nelle copie salvate prima) */
  gust?: number
  hum?: number // umidità, %
  /** precipitazione prevista nell'ora, mm */
  mm?: number
}

export interface DayWeather {
  date: string // YYYY-MM-DD, giorno locale della destinazione
  code: number // codice WMO
  max: number
  min: number
  rainPct: number | null
  /** Previsioni ora per ora (assenti nelle copie salvate prima di questa versione). */
  hours?: HourWeather[]
}

export const FORECAST_DAYS = 16
const FORECAST_TIMEOUT_MS = 10_000

export function weatherLabel(code: number): { label: string; icon: string } {
  if (code === 0) return { label: tt('Sereno'), icon: '☀️' }
  if (code === 1) return { label: tt('Quasi sereno'), icon: '🌤️' }
  if (code === 2) return { label: tt('Parzialmente nuvoloso'), icon: '⛅' }
  if (code === 3) return { label: tt('Coperto'), icon: '☁️' }
  if (code === 45 || code === 48) return { label: tt('Nebbia'), icon: '🌫️' }
  if (code >= 51 && code <= 57) return { label: tt('Pioggerella'), icon: '🌦️' }
  if (code >= 61 && code <= 67) return { label: tt('Pioggia'), icon: '🌧️' }
  if (code >= 71 && code <= 77) return { label: tt('Neve'), icon: '🌨️' }
  if (code >= 80 && code <= 82) return { label: tt('Rovesci'), icon: '🌦️' }
  if (code === 85 || code === 86) return { label: tt('Rovesci di neve'), icon: '🌨️' }
  if (code >= 95) return { label: tt('Temporale'), icon: '⛈️' }
  return { label: tt('Variabile'), icon: '🌥️' }
}

interface ForecastJson {
  daily?: {
    time?: string[]
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: (number | null)[]
  }
  hourly?: {
    time?: string[]
    temperature_2m?: (number | null)[]
    apparent_temperature?: (number | null)[]
    precipitation_probability?: (number | null)[]
    weather_code?: (number | null)[]
    wind_speed_10m?: (number | null)[]
    wind_direction_10m?: (number | null)[]
    wind_gusts_10m?: (number | null)[]
    relative_humidity_2m?: (number | null)[]
    precipitation?: (number | null)[]
  }
}

const num = (v: number | null | undefined): number | undefined => (typeof v === 'number' ? Math.round(v) : undefined)

function parseHours(json: ForecastJson): Map<string, HourWeather[]> {
  const h = json.hourly
  const out = new Map<string, HourWeather[]>()
  if (!h?.time || !h.temperature_2m || !h.weather_code) return out
  h.time.forEach((stamp, i) => {
    const [date, hh] = stamp.split('T')
    const t = h.temperature_2m?.[i]
    const code = h.weather_code?.[i]
    if (!date || !hh || typeof t !== 'number' || typeof code !== 'number') return
    const rain = h.precipitation_probability?.[i]
    const hour: HourWeather = { h: Number(hh.slice(0, 2)), t: Math.round(t), code, rain: typeof rain === 'number' ? Math.round(rain) : null }
    const feels = num(h.apparent_temperature?.[i])
    const wind = num(h.wind_speed_10m?.[i])
    const windDir = num(h.wind_direction_10m?.[i])
    const gust = num(h.wind_gusts_10m?.[i])
    const hum = num(h.relative_humidity_2m?.[i])
    if (feels != null) hour.feels = feels
    if (wind != null) hour.wind = wind
    if (windDir != null) hour.windDir = windDir
    if (gust != null) hour.gust = gust
    if (hum != null) hour.hum = hum
    const mm = h.precipitation?.[i]
    if (typeof mm === 'number') hour.mm = Math.round(mm * 10) / 10
    const list = out.get(date) ?? []
    list.push(hour)
    out.set(date, list)
  })
  return out
}

export function parseForecast(json: unknown): DayWeather[] {
  const hours = parseHours((json ?? {}) as ForecastJson)
  const d = (json as ForecastJson)?.daily
  if (!d?.time || !d.weather_code || !d.temperature_2m_max || !d.temperature_2m_min) return []
  const out: DayWeather[] = []
  d.time.forEach((date, i) => {
    const max = d.temperature_2m_max?.[i]
    const min = d.temperature_2m_min?.[i]
    const code = d.weather_code?.[i]
    if (typeof max !== 'number' || typeof min !== 'number' || typeof code !== 'number') return
    const rain = d.precipitation_probability_max?.[i]
    const day: DayWeather = { date, code, max: Math.round(max), min: Math.round(min), rainPct: typeof rain === 'number' ? Math.round(rain) : null }
    const hs = hours.get(date)
    if (hs && hs.length > 0) day.hours = hs
    out.push(day)
  })
  return out
}

export function forecastUrl(lat: number, lng: number, timeZone: string): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lng.toFixed(3),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m',
    timezone: timeZone,
    forecast_days: String(FORECAST_DAYS),
  })
  return `https://api.open-meteo.com/v1/forecast?${q.toString()}`
}

export async function fetchForecast(lat: number, lng: number, timeZone: string): Promise<DayWeather[]> {
  // una richiesta che non risponde non deve lasciare il caricamento acceso per sempre
  const stop = new AbortController()
  const timer = setTimeout(() => stop.abort(), FORECAST_TIMEOUT_MS)
  const res = await fetch(forecastUrl(lat, lng, timeZone), { signal: stop.signal }).finally(() => clearTimeout(timer))
  if (!res.ok) throw new Error('Previsioni non raggiungibili.')
  const days = parseForecast(await res.json())
  if (days.length === 0) throw new Error('Previsioni non disponibili.')
  return days
}

/** Simbolo del Design System per un codice meteo: sole, nuvola o pioggia. */
export function weatherSymbol(code: number): 'i-nav-sun' | 'i-sez-cloud' | 'i-sez-rain' {
  if (code <= 1) return 'i-nav-sun'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 || (code >= 71 && code <= 77) || code === 85 || code === 86) return 'i-sez-rain'
  return 'i-sez-cloud'
}

const rainy = (h: HourWeather) => weatherSymbol(h.code) === 'i-sez-rain' || (h.rain ?? 0) >= 60

/** La finestra di pioggia del giorno (prima e ultima ora piovosa dopo `fromHour`), se c'è. */
export function rainWindow(hours: HourWeather[] | undefined, fromHour = 0): { from: number; to: number } | null {
  const r = (hours ?? []).filter((h) => h.h >= fromHour && rainy(h))
  if (r.length === 0) return null
  return { from: r[0].h, to: r[r.length - 1].h + 1 }
}

/** Punto cardinale da cui soffia il vento («nord», «sud-est», …). */
export function windFrom(deg: number): string {
  const names = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest']
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
}

/** Il giorno `ymd` rientra nelle previsioni disponibili a partire da `today`? */
export function inForecastRange(today: string, ymd: string): boolean {
  const n = daysBetween(today, ymd)
  return n >= 0 && n < FORECAST_DAYS
}

/** Da quando saranno disponibili le previsioni per `ymd` (data). */
export function forecastAvailableFrom(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = new Date(y, m - 1, d - (FORECAST_DAYS - 1))
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

// ---------- copia sul telefono ----------
// Una copia per ogni posto (città del viaggio, centro del viaggio): prima ce n'era una sola e le città si sostituivano a
// vicenda, così ogni pagina riscaricava tutto e offline restava solo l'ultima. Si tengono le più recenti (al massimo
// MAX_COPIE, non più vecchie di COPIA_MAX_MS); la lettura riusa l'ultima decodifica finché il testo salvato non cambia.

const KEY = 'jp.weather.v2'
const KEY_VECCHIA = 'jp.weather.v1'
export const MAX_COPIE = 24
const COPIA_MAX_MS = 10 * 24 * 3600_000

export interface CachedForecast {
  key: string
  savedAt: number
  days: DayWeather[]
}

export const forecastKey = (lat: number, lng: number, tz: string) => `${lat.toFixed(2)},${lng.toFixed(2)},${tz}`

let decodifica: { raw: string; copie: Record<string, CachedForecast> } | null = null

function leggiCopie(): Record<string, CachedForecast> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) {
      // la copia unica di prima diventa la prima delle copie
      const vecchia = localStorage.getItem(KEY_VECCHIA)
      if (!vecchia) return {}
      const c = JSON.parse(vecchia) as CachedForecast
      localStorage.removeItem(KEY_VECCHIA)
      if (!c?.key || !Array.isArray(c.days)) return {}
      scriviCopie({ [c.key]: c })
      return { [c.key]: c }
    }
    if (decodifica?.raw === raw) return decodifica.copie
    const copie = JSON.parse(raw) as Record<string, CachedForecast>
    decodifica = { raw, copie: copie && typeof copie === 'object' ? copie : {} }
    return decodifica.copie
  } catch {
    return {}
  }
}

function scriviCopie(copie: Record<string, CachedForecast>): void {
  const ora = Date.now()
  const tenute = Object.values(copie)
    .filter((c) => c && Array.isArray(c.days) && ora - c.savedAt < COPIA_MAX_MS)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, MAX_COPIE)
  const out = Object.fromEntries(tenute.map((c) => [c.key, c]))
  const raw = JSON.stringify(out)
  try {
    localStorage.setItem(KEY, raw)
    decodifica = { raw, copie: out }
  } catch {
    // storage pieno: si tiene almeno la più recente
    try {
      const una = tenute[0] ? { [tenute[0].key]: tenute[0] } : {}
      const r = JSON.stringify(una)
      localStorage.setItem(KEY, r)
      decodifica = { raw: r, copie: una }
    } catch {
      // ignorato
    }
  }
}

export function loadForecast(key: string): CachedForecast | null {
  const c = leggiCopie()[key]
  return c && c.key === key && Array.isArray(c.days) ? c : null
}

export function saveForecast(c: CachedForecast): void {
  scriviCopie({ ...leggiCopie(), [c.key]: c })
}

/** Cancella tutte le copie del meteo (Dati sul telefono › Scarica di nuovo). */
export function clearForecasts(): void {
  decodifica = null
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(KEY_VECCHIA)
  } catch {
    // ignorato
  }
}

// una richiesta alla volta per posto: Oggi, la card del meteo e il Giorno chiedono spesso lo stesso nello stesso momento
const inCorso = new Map<string, Promise<DayWeather[]>>()

/** Come `fetchForecast`, ma condivide la richiesta già partita per lo stesso posto e salva la copia sul telefono. */
/** Dopo una richiesta fallita (rete scarsa, servizio giù) lo stesso posto non si richiede per un po': ogni pagina aperta riprenderebbe da capo. */
export const PAUSA_DOPO_ERRORE_MS = 2 * 60 * 1000
const fallite = new Map<string, { alle: number; errore: unknown }>()

export function fetchForecastCondiviso(lat: number, lng: number, timeZone: string, adesso = Date.now()): Promise<DayWeather[]> {
  const key = forecastKey(lat, lng, timeZone)
  const ko = fallite.get(key)
  if (ko && adesso - ko.alle < PAUSA_DOPO_ERRORE_MS) return Promise.reject(ko.errore)
  let p = inCorso.get(key)
  if (!p) {
    p = fetchForecast(lat, lng, timeZone)
      .then(
        (days) => {
          fallite.delete(key)
          saveForecast({ key, savedAt: Date.now(), days })
          return days
        },
        (e: unknown) => {
          fallite.set(key, { alle: Date.now(), errore: e })
          throw e
        },
      )
      .finally(() => inCorso.delete(key))
    inCorso.set(key, p)
  }
  return p
}

export const FORECAST_TTL_MS = 3 * 60 * 60 * 1000
