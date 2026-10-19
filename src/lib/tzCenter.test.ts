import { describe, expect, it } from 'vitest'
import { formatMinutes, sunForDay } from './sun'
import { DEFAULT_CENTER } from './tripForm'
import { centerForTimezone, tripCenter } from './tzCenter'

describe('posizione di un fuso orario', () => {
  it('città principale dei fusi più comuni', () => {
    expect(centerForTimezone('Asia/Shanghai')).toEqual({ lat: 31.23, lng: 121.47 })
    expect(centerForTimezone('America/New_York').lng).toBeLessThan(-70)
    expect(centerForTimezone('Australia/Sydney').lat).toBeLessThan(-30)
  })

  it('fuso fuori elenco: longitudine dallo scarto orario, latitudine tipica dell\'area', () => {
    const c = centerForTimezone('Asia/Pyongyang', new Date('2027-01-19T00:00:00Z')) // UTC+9
    expect(c.lng).toBeCloseTo(135, 0)
    expect(c.lat).toBe(30)
  })

  it('fuso sconosciuto: ripiega sul centro di partenza', () => {
    expect(centerForTimezone('Marte/Olympus')).toEqual(DEFAULT_CENTER)
  })

  it('«Altro» con un fuso lontano non resta a Roma', () => {
    expect(tripCenter({ center: DEFAULT_CENTER, timezone: 'Asia/Shanghai' })).toEqual(centerForTimezone('Asia/Shanghai'))
    expect(tripCenter({ center: DEFAULT_CENTER, timezone: 'Europe/Rome' })).toEqual(DEFAULT_CENTER)
    expect(tripCenter({ center: DEFAULT_CENTER, timezone: 'Europe/Paris' })).toEqual(DEFAULT_CENTER) // vicino a Roma
  })

  it('una posizione scelta davvero non viene toccata', () => {
    const chosen = { lat: 39.9, lng: 116.4 } // Pechino
    expect(tripCenter({ center: chosen, timezone: 'Asia/Shanghai' })).toBe(chosen)
  })
})

describe('sole con posizione e fuso che combaciano', () => {
  it('Cina a gennaio: alba e tramonto sensati (il caso che si vedeva rotto)', () => {
    const c = tripCenter({ center: DEFAULT_CENTER, timezone: 'Asia/Shanghai' })
    const s = sunForDay('2027-01-19', c.lat, c.lng, 'Asia/Shanghai')
    expect(formatMinutes(s.sunrise as number) >= '06:40' && formatMinutes(s.sunrise as number) <= '07:10').toBe(true) // Shanghai, metà gennaio
    expect(formatMinutes(s.sunset as number) >= '17:10' && formatMinutes(s.sunset as number) <= '17:40').toBe(true)
    // con il centro di Roma nel fuso della Cina uscivano orari impossibili: ora si scartano
    const broken = sunForDay('2027-01-19', DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, 'Asia/Shanghai')
    expect(broken.sunrise).toBeNull()
  })
})
