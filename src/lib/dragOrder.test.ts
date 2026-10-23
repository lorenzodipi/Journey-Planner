import { describe, expect, it } from 'vitest'
import { dropIndex, planMove, shiftDirection } from './dragOrder'

describe('dropIndex', () => {
  const mids = [50, 150, 250, 350]
  it('resta dov\'è', () => expect(dropIndex(mids, 1, 150)).toBe(1))
  it('scende di un posto oltre il centro della successiva', () => expect(dropIndex(mids, 1, 260)).toBe(2))
  it('in cima', () => expect(dropIndex(mids, 2, -40)).toBe(0))
  it('in fondo', () => expect(dropIndex(mids, 0, 999)).toBe(3))
  it('non conta se stessa', () => expect(dropIndex(mids, 3, 351)).toBe(3))
})

describe('shiftDirection', () => {
  it('trascinando giù le righe in mezzo salgono', () => {
    expect([0, 1, 2, 3].map((i) => shiftDirection(i, 0, 2))).toEqual([0, -1, -1, 0])
  })
  it('trascinando su le righe in mezzo scendono', () => {
    expect([0, 1, 2, 3].map((i) => shiftDirection(i, 3, 1))).toEqual([0, 1, 1, 0])
  })
  it('fermo se from = to', () => expect([0, 1, 2].map((i) => shiftDirection(i, 1, 1))).toEqual([0, 0, 0]))
})

describe('planMove', () => {
  const items = [
    { id: 'a', position: 1000, time: '09:00' },
    { id: 'b', position: 2000 },
    { id: 'c', position: 3000 },
    { id: 'd', position: 4000 },
  ]
  it('sposta in fondo e riscrive solo le posizioni cambiate', () => {
    expect(planMove(items, 1, 3)).toEqual([
      { id: 'c', position: 2000 },
      { id: 'd', position: 3000 },
      { id: 'b', position: 4000 },
    ])
  })
  it('sposta in su', () => {
    expect(planMove(items, 3, 1)).toEqual([
      { id: 'd', position: 2000 },
      { id: 'b', position: 3000 },
      { id: 'c', position: 4000 },
    ])
  })
  it('una tappa con orario non si sposta', () => expect(planMove(items, 0, 2)).toBeNull())
  it('nessuno spostamento', () => expect(planMove(items, 2, 2)).toBeNull())
  it('indici fuori dalla lista', () => expect(planMove(items, 1, 9)).toBeNull())
  it('si può passare oltre una tappa con orario', () => {
    const r = planMove(items, 2, 0)
    expect(r?.map((x) => x.id).sort()).toEqual(['a', 'b', 'c'])
  })
})
