import { describe, expect, it } from 'vitest'
import { isBackSwipe } from './swipeBack'

describe('swipe «indietro» da iOS', () => {
  it('dal bordo sinistro verso il centro, abbastanza lungo e orizzontale', () => {
    expect(isBackSwipe({ x: 4, y: 400 }, { x: 140, y: 410 })).toBe(true)
  })
  it('non parte dal bordo: non è un «indietro»', () => {
    expect(isBackSwipe({ x: 120, y: 400 }, { x: 260, y: 400 })).toBe(false)
  })
  it('troppo corto', () => {
    expect(isBackSwipe({ x: 4, y: 400 }, { x: 50, y: 400 })).toBe(false)
  })
  it('più verticale che orizzontale (è uno scroll)', () => {
    expect(isBackSwipe({ x: 4, y: 300 }, { x: 100, y: 500 })).toBe(false)
  })
  it('verso sinistra non conta', () => {
    expect(isBackSwipe({ x: 4, y: 400 }, { x: -60, y: 400 })).toBe(false)
  })
})
