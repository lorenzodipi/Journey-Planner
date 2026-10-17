import { daysBetween } from './dates'

// Previsioni da Open-Meteo (gratuito, senza chiave). Coprono circa 16 giorni da oggi:
// prima la scheda lo dice e mostra solo la data da cui saranno disponibili.
// L'ultimo risultato resta salvato sul telefono per l'uso offline.

export interface DayWeather {
  date: string // YYYY-MM-DD, giorno locale della destinazione
  code: number // codice WMO
  max: number
  min: number
  rainPct: number | null
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
}

export function parseForecast(json: unknown): DayWeather[] {
  const d = (json as ForecastJson)?.daily
  if (!d?.time || !d.weather_code || !d.temperature_2m_max || !d.temperature_2m_min) return []
  const out: DayWeather[] = []
  d.time.forEach((date, i) => {
    const max = d.temperature_2m_max?.[i]
    const min = d.temperature_2m_min?.[i]
    const code = d.weather_code?.[i]
    if (typeof max !== 'number' || typeof min !== 'number' || typeof code !== 'number') return
    const rain = d.precipitation_probability_max?.[i]
    out.push({ date, code, max: Math.round(max), min: Math.round(min), rainPct: typeof rain === 'number' ? Math.round(rain) : null })
  })
  return out
}

export function forecastUrl(lat: number, lng: number, timeZone: string): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lng.toFixed(3),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
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
