import { describe, expect, it } from 'vitest'
import { THRESHOLD, canStartPull, isPullDown, pullDistance } from './pullToRefresh'

describe('trascina per aggiornare', () => {
  it('la distanza è smorzata e ha un tetto', () => {
    expect(pullDistance(100)).toBe(50)
    expect(pullDistance(400)).toBe(96)
    expect(pullDistance(-30)).toBe(0)
    expect(pullDistance(THRESHOLD * 2)).toBeGreaterThanOrEqual(THRESHOLD)
  })

  it('serve un trascinamento verso il basso e abbastanza verticale', () => {
    expect(isPullDown(0, 20)).toBe(true)
    expect(isPullDown(40, 20)).toBe(false)
    expect(isPullDown(0, 3)).toBe(false)
    expect(isPullDown(0, -30)).toBe(false)
  })

  it('parte solo dall\'inizio della pagina, con un dito, senza pannelli aperti', () => {
    expect(canStartPull(null, 0, 1, false)).toBe(true)
    expect(canStartPull(null, 120, 1, false)).toBe(false)
    expect(canStartPull(null, 0, 2, false)).toBe(false)
    expect(canStartPull(null, 0, 1, true)).toBe(false)
  })
})
