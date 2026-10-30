import { useEffect, useState } from 'react'
import { daysBetween } from '../lib/dates'
import { tripToday } from '../lib/today'
import { FORECAST_DAYS, FORECAST_TTL_MS, fetchForecast, forecastKey, loadForecast, saveForecast, type DayWeather } from '../lib/weather'
import type { Trip } from '../types'

export interface ForecastState {
  days: DayWeather[]
  /** quando sono state scaricate (ms), `null` se non ci sono dati */
  savedAt: number | null
  loading: boolean
  error: string | null
}

/** Previsioni del viaggio: dalla copia sul telefono subito, poi aggiornate se c'è rete (al massimo ogni 3 ore). */
export function useForecast(trip: Pick<Trip, 'center' | 'timezone' | 'startDate' | 'endDate'>): ForecastState {
  const key = forecastKey(trip.center.lat, trip.center.lng, trip.timezone)
  const read = (): ForecastState => {
    const c = loadForecast(key)
    return { days: c?.days ?? [], savedAt: c?.savedAt ?? null, loading: false, error: null }
  }
  const [state, setState] = useState<ForecastState>(read)

  useEffect(() => {
    setState(read())
    const today = tripToday(trip)
    // le previsioni coprono ~16 giorni: se il viaggio è più lontano o già finito non serve scaricare nulla
    const relevant = daysBetween(today, trip.endDate) >= 0 && daysBetween(today, trip.startDate) < FORECAST_DAYS
    if (!relevant || !navigator.onLine) return
    const cached = loadForecast(key)
    // una copia salvata prima dell'arrivo delle previsioni orarie è da riscaricare
    if (cached && Date.now() - cached.savedAt < FORECAST_TTL_MS && cached.days.some((d) => d.hours)) return
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchForecast(trip.center.lat, trip.center.lng, trip.timezone).then(
      (days) => {
        const savedAt = Date.now()
        saveForecast({ key, savedAt, days })
        if (active) setState({ days, savedAt, loading: false, error: null })
      },
      (e) => {
        if (active) setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Previsioni non disponibili.' }))
      },
    )
    return () => {
      active = false
    }
    // si riscarica solo se cambia la destinazione o le date
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, trip.startDate, trip.endDate])

  return state
}
