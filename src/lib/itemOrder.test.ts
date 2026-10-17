import { describe, expect, it } from 'vitest'
import { positionForNew, positionForStep } from './itemOrder'

const list = [
  { position: 1000, time: '09:00' },
  { position: 2000, time: '12:30' },
  { position: 3000 },
]

describe('positionForNew', () => {
  it('giorno vuoto', () => expect(positionForNew([])).toBe(1000))
  it('senza orario va in fondo', () => expect(positionForNew(list)).toBe(4000))
  it('con orario si inserisce prima della tappa più tarda', () => {
    expect(positionForNew(list, '10:00')).toBe(1500)
    expect(positionForNew(list, '08:00')).toBe(0)
  })
  it('orario più tardi di tutte → in fondo', () => expect(positionForNew(list, '23:00')).toBe(4000))
})

describe('positionForStep', () => {
  it('sposta in giù: finisce tra la successiva e quella dopo', () => expect(positionForStep(list, 0, 1)).toBe(2500))
  it('sposta in su: finisce prima della precedente', () => expect(positionForStep(list, 2, -1)).toBe(1500))
  it('ai bordi non si sposta', () => {
    expect(positionForStep(list, 0, -1)).toBeNull()
    expect(positionForStep(list, 2, 1)).toBeNull()
  })
})
