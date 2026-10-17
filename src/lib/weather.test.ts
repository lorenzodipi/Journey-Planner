import { describe, expect, it } from 'vitest'
import { forecastAvailableFrom, forecastUrl, inForecastRange, parseForecast, weatherLabel } from './weather'

describe('meteo', () => {
  const json = {
    daily: {
      time: ['2026-11-21', '2026-11-22', '2026-11-23'],
      weather_code: [0, 61, 95],
      temperature_2m_max: [14.6, 12.2, 11.5],
      temperature_2m_min: [6.4, 8.5, 9],
      precipitation_probability_max: [5, 80, null],
    },
  }

  it('legge la risposta di Open-Meteo', () => {
    expect(parseForecast(json)).toEqual([
      { date: '2026-11-21', code: 0, max: 15, min: 6, rainPct: 5 },
      { date: '2026-11-22', code: 61, max: 12, min: 9, rainPct: 80 },
      { date: '2026-11-23', code: 95, max: 12, min: 9, rainPct: null },
    ])
  })

  it('risposte incomplete o sbagliate', () => {
    expect(parseForecast({})).toEqual([])
    expect(parseForecast(null)).toEqual([])
    expect(parseForecast({ daily: { time: ['2026-11-21'], weather_code: [0], temperature_2m_max: [], temperature_2m_min: [] } })).toEqual([])
  })

  it('descrizioni dei codici', () => {
    expect(weatherLabel(0).label).toBe('Sereno')
    expect(weatherLabel(63).label).toBe('Pioggia')
    expect(weatherLabel(96).label).toBe('Temporale')
  })

  it('finestra di 16 giorni', () => {
    expect(inForecastRange('2026-11-01', '2026-11-16')).toBe(true)
    expect(inForecastRange('2026-11-01', '2026-11-17')).toBe(false)
    expect(inForecastRange('2026-11-05', '2026-11-04')).toBe(false)
    expect(forecastAvailableFrom('2026-11-21')).toBe('2026-11-06')
  })

  it('indirizzo della richiesta', () => {
    const u = new URL(forecastUrl(35.6812, 139.7671, 'Asia/Tokyo'))
    expect(u.hostname).toBe('api.open-meteo.com')
    expect(u.searchParams.get('timezone')).toBe('Asia/Tokyo')
    expect(u.searchParams.get('latitude')).toBe('35.681')
  })
})
