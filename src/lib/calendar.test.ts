import { describe, expect, it } from 'vitest'
import { isDayBlocked, monthBeforeMin, monthGrid, shiftMonth, startMonth } from './calendar'

describe('calendario', () => {
  it('novembre 2026 comincia di domenica e ha settimane da lunedì', () => {
    const weeks = monthGrid(2026, 10)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null]) // 1 nov 2026 è domenica
    expect(weeks[0][6]).toBe('2026-11-01')
    expect(weeks.flat().filter(Boolean)).toHaveLength(30)
    expect(weeks.at(-1)?.includes('2026-11-30')).toBe(true)
  })

  it('febbraio bisestile', () => {
    expect(monthGrid(2028, 1).flat().filter(Boolean)).toHaveLength(29)
  })

  it('i giorni prima del minimo sono bloccati, quello del minimo no', () => {
    expect(isDayBlocked('2026-11-09', '2026-11-10')).toBe(true)
    expect(isDayBlocked('2026-11-10', '2026-11-10')).toBe(false)
    expect(isDayBlocked('2026-11-11', '2026-11-10')).toBe(false)
    expect(isDayBlocked('2026-11-11', undefined, '2026-11-10')).toBe(true)
    expect(isDayBlocked('2026-11-11')).toBe(false)
  })

  it('cambio di mese a cavallo dell’anno', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })

  it('apre il mese giusto', () => {
    expect(startMonth('2026-12-08', undefined, '2026-10-19')).toEqual({ year: 2026, month: 11 })
    expect(startMonth('', '2026-12-02', '2026-10-19')).toEqual({ year: 2026, month: 11 })
    expect(startMonth('', undefined, '2026-10-19')).toEqual({ year: 2026, month: 9 })
  })

  it('non si torna a mesi interamente prima del minimo', () => {
    expect(monthBeforeMin(2026, 10, '2026-12-02')).toBe(true)
    expect(monthBeforeMin(2026, 11, '2026-12-02')).toBe(false)
  })
})
