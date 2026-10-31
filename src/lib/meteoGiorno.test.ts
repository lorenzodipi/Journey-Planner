import { describe, expect, it } from 'vitest'
import type { Day, Trip } from '../types'
import { cittaDelGiorno, cittaTappa, indiceCittaAdesso, meteoDellaTappa } from './meteoGiorno'
import type { DayWeather } from './weather'

const trip = { destination: 'Osaka', places: [{ id: 'n', city: 'Nara' }, { id: 'o', city: 'Osaka' }] } as unknown as Trip
const day = { city: 'Osaka', items: [{ id: '1', position: 0, time: '09:00', placeId: 'o' }, { id: '2', position: 1, time: '10:30' }, { id: '3', position: 2, time: '13:00', placeId: 'n' }, { id: '4', position: 3, time: '15:00', placeId: 'n' }] } as unknown as Day
describe('meteo del giorno (#65)', () => {
  it('trova le città e il cambio alle 13', () => {
    const t = cittaDelGiorno(trip, day)
    expect(t).toEqual([{ city: 'Osaka', da: 0 }, { city: 'Nara', da: 13 * 60 }])
    expect(indiceCittaAdesso(t, 12 * 60)).toBe(0)
    expect(indiceCittaAdesso(t, 13 * 60)).toBe(1)
    expect(indiceCittaAdesso(t, null)).toBe(0)
    expect(cittaTappa(trip, day, { placeId: undefined })).toBe('Osaka')
  })
  it('meteo della tappa con città e ora', () => {
    const g: DayWeather[] = [{ date: '2026-11-22', code: 3, max: 18, min: 9, rainPct: 10, hours: [{ h: 15, t: 14, code: 3, rain: 10 }] }]
    expect(meteoDellaTappa(g, '2026-11-22', '15:30')).toBe('14° · coperto alle 15:30')
    expect(meteoDellaTappa(g, '2026-11-22', undefined)).toBeNull()
  })
})
