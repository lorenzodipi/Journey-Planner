import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_COPIE, PAUSA_DOPO_ERRORE_MS, clearForecasts, fetchForecastCondiviso, forecastKey, loadForecast, saveForecast } from './weather'

const giorni = [{ date: '2026-11-24', code: 2, max: 18, min: 9, rainPct: 0, hours: [{ h: 0, t: 10, code: 2, rain: 0 }] }]
const copia = (key: string, savedAt = Date.now()) => ({ key, savedAt, days: giorni })

/** Deposito finto in memoria (i test girano in node, senza localStorage). */
function deposito(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  }
}

describe('copia del meteo sul telefono', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', deposito())
    clearForecasts()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('ogni città ha la sua copia: salvarne una non cancella le altre', () => {
    saveForecast(copia('tokyo'))
    saveForecast(copia('kyoto'))
    saveForecast(copia('osaka'))
    expect(loadForecast('tokyo')?.key).toBe('tokyo')
    expect(loadForecast('kyoto')?.key).toBe('kyoto')
    expect(loadForecast('osaka')?.key).toBe('osaka')
    expect(loadForecast('nara')).toBeNull()
  })

  it('la copia unica di prima si tiene e si sposta', () => {
    localStorage.setItem('jp.weather.v1', JSON.stringify(copia('vecchia')))
    expect(loadForecast('vecchia')?.key).toBe('vecchia')
    expect(localStorage.getItem('jp.weather.v1')).toBeNull()
  })

  it('si tengono solo le più recenti, e niente di più vecchio di 10 giorni', () => {
    for (let i = 0; i < MAX_COPIE + 3; i++) saveForecast(copia(`c${i}`, Date.now() - (MAX_COPIE + 3 - i) * 1000))
    expect(loadForecast('c0')).toBeNull()
    expect(loadForecast(`c${MAX_COPIE + 2}`)).not.toBeNull()
    saveForecast(copia('antica', Date.now() - 11 * 24 * 3600_000))
    expect(loadForecast('antica')).toBeNull()
  })

  it('due richieste insieme per lo stesso posto partono una volta sola e salvano la copia', async () => {
    const json = { daily: { time: ['2026-11-24'], weather_code: [2], temperature_2m_max: [18], temperature_2m_min: [9], precipitation_probability_max: [0] } }
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(json), { status: 200 }))
    const [a, b] = await Promise.all([fetchForecastCondiviso(35.68, 139.76, 'Asia/Tokyo'), fetchForecastCondiviso(35.68, 139.76, 'Asia/Tokyo')])
    expect(f).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
    expect(loadForecast(forecastKey(35.68, 139.76, 'Asia/Tokyo'))?.days[0].date).toBe('2026-11-24')
  })

  it('dopo un errore lo stesso posto non si richiede per 2 minuti', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchForecastCondiviso(1.5, 2.5, 'Asia/Tokyo')).rejects.toThrow()
    await expect(fetchForecastCondiviso(1.5, 2.5, 'Asia/Tokyo')).rejects.toThrow()
    expect(f).toHaveBeenCalledTimes(1)
    await expect(fetchForecastCondiviso(1.5, 2.5, 'Asia/Tokyo', Date.now() + PAUSA_DOPO_ERRORE_MS + 1)).rejects.toThrow()
    expect(f).toHaveBeenCalledTimes(2)
  })
})
