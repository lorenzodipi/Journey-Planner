import { describe, expect, it } from 'vitest'
import { dateAddDays } from './dates'

describe('dateAddDays', () => {
  it('somma e sottrae giorni di calendario, anche a cavallo di mese e anno', () => {
    expect(dateAddDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(dateAddDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(dateAddDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(dateAddDays('2026-11-23', 0)).toBe('2026-11-23')
  })
  it('regge il cambio dell\'ora legale', () => {
    expect(dateAddDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(dateAddDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(dateAddDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})
