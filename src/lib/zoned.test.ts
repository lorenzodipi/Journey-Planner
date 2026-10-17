import { describe, expect, it } from 'vitest'
import { instantToZoned, isCompleteZoned, zonedToInstant } from './zoned'

describe('zonedToInstant / instantToZoned', () => {
  it('Milano a novembre è UTC+1', () => {
    expect(zonedToInstant('2026-11-21', '12:30', 'Europe/Rome')).toBe('2026-11-21T11:30:00.000Z')
  })

  it('Tokyo è UTC+9', () => {
    expect(zonedToInstant('2026-11-22', '16:20', 'Asia/Tokyo')).toBe('2026-11-22T07:20:00.000Z')
  })

  it('Pechino è UTC+8: arrivo del 22/11 alle 05:35', () => {
    expect(zonedToInstant('2026-11-22', '05:35', 'Asia/Shanghai')).toBe('2026-11-21T21:35:00.000Z')
  })

  it('è reversibile', () => {
    const iso = zonedToInstant('2026-12-09', '07:15', 'Europe/Rome')
    expect(instantToZoned(iso, 'Europe/Rome')).toEqual({ date: '2026-12-09', time: '07:15' })
    expect(instantToZoned(iso, 'Asia/Tokyo')).toEqual({ date: '2026-12-09', time: '15:15' })
  })

  it('attraversa la mezzanotte tra fusi diversi', () => {
    const iso = zonedToInstant('2026-12-08', '23:30', 'Asia/Tokyo')
    expect(instantToZoned(iso, 'Europe/Rome')).toEqual({ date: '2026-12-08', time: '15:30' })
  })

  it('gestisce l’ora legale (Roma, agosto UTC+2)', () => {
    expect(zonedToInstant('2026-08-10', '10:00', 'Europe/Rome')).toBe('2026-08-10T08:00:00.000Z')
  })

  it('riconosce data e ora complete', () => {
    expect(isCompleteZoned('2026-11-21', '12:30')).toBe(true)
    expect(isCompleteZoned('', '12:30')).toBe(false)
    expect(isCompleteZoned('2026-11-21', '')).toBe(false)
  })
})
