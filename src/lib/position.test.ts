import { describe, expect, it } from 'vitest'
import { between, needsRebalance, positionForMove, rebalance } from './position'

describe('between', () => {
  it('lista vuota', () => expect(between()).toBe(1000))
  it('in testa e in coda', () => {
    expect(between(null, 1000)).toBe(0)
    expect(between(1000, null)).toBe(2000)
  })
  it('punto medio', () => expect(between(1000, 2000)).toBe(1500))
})

describe('positionForMove', () => {
  const pos = [1000, 2000, 3000, 4000]
  it('sposta il primo in fondo', () => expect(positionForMove(pos, 0, 3)).toBe(5000))
  it('sposta l’ultimo in testa', () => expect(positionForMove(pos, 3, 0)).toBe(0))
  it('sposta in mezzo', () => {
    // [A, B, C, D]: D tra A e B
    const p = positionForMove(pos, 3, 1)
    expect(p).toBeGreaterThan(1000)
    expect(p).toBeLessThan(2000)
  })
})

describe('rebalance', () => {
  it('rinumera in modo equidistante', () => expect(rebalance(3)).toEqual([1000, 2000, 3000]))
  it('riconosce posizioni troppo vicine', () => {
    expect(needsRebalance([1, 2, 3])).toBe(false)
    expect(needsRebalance([1, 1 + 1e-9, 3])).toBe(true)
  })
})
