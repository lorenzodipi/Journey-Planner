// Previsioni per città del viaggio (riga meteo di Giorni, meteo per tappa nel Giorno e in Oggi).
// Il centro di una città è la media delle posizioni dei luoghi salvati in quella città; senza luoghi
// con posizione si usa il centro del viaggio solo per la città della destinazione.
import { useEffect, useMemo, useState } from 'react'
import { daysBetween } from '../lib/dates'
import { tripToday } from '../lib/today'
import { FORECAST_DAYS, FORECAST_TTL_MS, fetchForecast, forecastKey, loadForecast, saveForecast, type DayWeather } from '../lib/weather'
import type { Trip } from '../types'

export interface CityPoint {
  city: string
  lat: number
  lng: number
}

const norm = (s: string) => s.trim().toLowerCase()

/** Centro di ogni città: media dei luoghi con posizione in quella città. */
export function cityCenters(trip: Pick<Trip, 'places' | 'destination' | 'center'>, cities: string[]): CityPoint[] {
  const out: CityPoint[] = []
  for (const city of cities) {
    const pts = trip.places.filter((p) => norm(p.city) === norm(city) && p.lat != null && p.lng != null)
    if (pts.length > 0) {
      out.push({ city, lat: pts.reduce((s, p) => s + (p.lat as number), 0) / pts.length, lng: pts.reduce((s, p) => s + (p.lng as number), 0) / pts.length })
    } else if (norm(city) === norm(trip.destination)) {
      out.push({ city, lat: trip.center.lat, lng: trip.center.lng })
    }
  }
  return out
}

/** Città del viaggio in ordine di apparizione nei giorni (senza ripetizioni). */
export function tripCities(trip: Pick<Trip, 'days'>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const d of trip.days) {
    const c = d.city?.trim()
    if (c && !seen.has(norm(c))) {
      seen.add(norm(c))
      out.push(c)
    }
  }
  return out
}

/** Previsioni per città, dalla copia sul telefono e poi aggiornate se c'è rete (al massimo ogni 3 ore). */
export function useCityForecasts(trip: Pick<Trip, 'places' | 'destination' | 'center' | 'timezone' | 'startDate' | 'endDate'>, cities: string[]): Map<string, DayWeather[]> {
  const points = useMemo(() => cityCenters(trip, cities), [trip, cities.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const read = () => {
    const m = new Map<string, DayWeather[]>()
    for (const p of points) {
      const c = loadForecast(forecastKey(p.lat, p.lng, trip.timezone))
      if (c) m.set(p.city, c.days)
    }
    return m
  }
  const [map, setMap] = useState<Map<string, DayWeather[]>>(read)

  useEffect(() => {
    setMap(read())
    const today = tripToday(trip)
    const relevant = daysBetween(today, trip.endDate) >= 0 && daysBetween(today, trip.startDate) < FORECAST_DAYS
    if (!relevant || !navigator.onLine) return
    let active = true
    for (const p of points) {
      const key = forecastKey(p.lat, p.lng, trip.timezone)
      const cached = loadForecast(key)
      if (cached && Date.now() - cached.savedAt < FORECAST_TTL_MS && cached.days.some((d) => d.hours)) continue
      fetchForecast(p.lat, p.lng, trip.timezone).then(
        (days) => {
          saveForecast({ key, savedAt: Date.now(), days })
          if (active) setMap((m) => new Map(m).set(p.city, days))
        },
        () => undefined,
      )
    }
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map((p) => `${p.city}:${p.lat.toFixed(2)},${p.lng.toFixed(2)}`).join('|'), trip.timezone, trip.startDate, trip.endDate])

  return map
}

/** Temperatura e codice dell'ora attuale (fuso del viaggio), o del giorno se mancano le ore. */
export function nowWeather(days: DayWeather[] | undefined, ymd: string, hour: number): { t: number; code: number } | null {
  const d = days?.find((x) => x.date === ymd)
  if (!d) return null
  const h = d.hours?.find((x) => x.h === hour) ?? d.hours?.[0]
  return h ? { t: h.t, code: h.code } : { t: Math.round((d.max + d.min) / 2), code: d.code }
}
