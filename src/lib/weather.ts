import { daysBetween } from './dates'

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
  hum?: number // umidità, %
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

export function weatherLabel(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Sereno', icon: '☀️' }
  if (code === 1) return { label: 'Quasi sereno', icon: '🌤️' }
  if (code === 2) return { label: 'Parzialmente nuvoloso', icon: '⛅' }
  if (code === 3) return { label: 'Coperto', icon: '☁️' }
  if (code === 45 || code === 48) return { label: 'Nebbia', icon: '🌫️' }
  if (code >= 51 && code <= 57) return { label: 'Pioggerella', icon: '🌦️' }
  if (code >= 61 && code <= 67) return { label: 'Pioggia', icon: '🌧️' }
  if (code >= 71 && code <= 77) return { label: 'Neve', icon: '🌨️' }
  if (code >= 80 && code <= 82) return { label: 'Rovesci', icon: '🌦️' }
  if (code === 85 || code === 86) return { label: 'Rovesci di neve', icon: '🌨️' }
  if (code >= 95) return { label: 'Temporale', icon: '⛈️' }
  return { label: 'Variabile', icon: '🌥️' }
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
    relative_humidity_2m?: (number | null)[]
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
    const hum = num(h.relative_humidity_2m?.[i])
    if (feels != null) hour.feels = feels
    if (wind != null) hour.wind = wind
    if (windDir != null) hour.windDir = windDir
    if (hum != null) hour.hum = hum
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
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m',
    timezone: timeZone,
    forecast_days: String(FORECAST_DAYS),
  })
  return `https://api.open-meteo.com/v1/forecast?${q.toString()}`
}

export async function fetchForecast(lat: number, lng: number, timeZone: string): Promise<DayWeather[]> {
  const res = await fetch(forecastUrl(lat, lng, timeZone))
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

const KEY = 'jp.weather.v1'
export interface CachedForecast {
  key: string
  savedAt: number
  days: DayWeather[]
}

export const forecastKey = (lat: number, lng: number, tz: string) => `${lat.toFixed(2)},${lng.toFixed(2)},${tz}`

export function loadForecast(key: string): CachedForecast | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as CachedForecast
    return c.key === key && Array.isArray(c.days) ? c : null
  } catch {
    return null
  }
}

export function saveForecast(c: CachedForecast): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    // ignorato
  }
}

export const FORECAST_TTL_MS = 3 * 60 * 60 * 1000
