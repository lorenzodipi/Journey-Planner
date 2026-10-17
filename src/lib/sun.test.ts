import { describe, expect, it } from 'vitest'
import { formatMinutes, minutesOfDay, sunForDay, tzOffsetMinutes } from './sun'

describe('fusi orari', () => {
  it('scarto dall’UTC', () => {
    const d = new Date('2026-11-22T00:00:00Z')
    expect(tzOffsetMinutes(d, 'Asia/Tokyo')).toBe(540)
    expect(tzOffsetMinutes(d, 'Europe/Rome')).toBe(60) // inverno: CET
    expect(tzOffsetMinutes(d, 'UTC')).toBe(0)
  })

  it('minuti dalla mezzanotte nel fuso locale', () => {
    expect(minutesOfDay(new Date('2026-11-22T07:30:00Z'), 'Asia/Tokyo')).toBe(16 * 60 + 30)
  })

  it('formatta i minuti', () => expect(formatMinutes(16 * 60 + 5)).toBe('16:05'))
})

describe('alba e tramonto', () => {
  it('Tokyo a fine novembre: alba ~06:20, tramonto ~16:30', () => {
    const s = sunForDay('2026-11-22', 35.6812, 139.7671, 'Asia/Tokyo')
    expect(s.sunrise).not.toBeNull()
    expect(s.sunset).not.toBeNull()
    expect(s.sunrise!).toBeGreaterThanOrEqual(6 * 60)
    expect(s.sunrise!).toBeLessThanOrEqual(6 * 60 + 45)
    expect(s.sunset!).toBeGreaterThanOrEqual(16 * 60 + 15)
    expect(s.sunset!).toBeLessThanOrEqual(16 * 60 + 50)
  })

  it('Reykjavík a dicembre: giornata corta ma con alba e tramonto', () => {
    const s = sunForDay('2026-12-15', 64.1466, -21.9426, 'Atlantic/Reykjavik')
    expect(s.sunrise).not.toBeNull()
    expect(s.sunset! - s.sunrise!).toBeLessThan(5 * 60)
  })
})
