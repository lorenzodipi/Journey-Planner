import { describe, expect, it } from 'vitest'
import { canSwap, changedPositions, orderItems, positionForNew, positionForStep, renumber } from './itemOrder'

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

describe('orderItems', () => {
  const ids = (l: { id: string }[]) => l.map((x) => x.id).join('')
  it('senza orari segue le posizioni', () => {
    expect(ids(orderItems([{ id: 'b', position: 2 }, { id: 'a', position: 1 }]))).toBe('ab')
  })
  it('le tappe con orario si dispongono per orario nei propri posti', () => {
    const l = [
      { id: 'a', position: 1, time: '10:00' },
      { id: 'u', position: 2 },
      { id: 'c', position: 3, time: '09:00' },
    ]
    expect(ids(orderItems(l))).toBe('cua')
  })
  it('le tappe senza orario non si spostano', () => {
    const l = [
      { id: 'u1', position: 1 },
      { id: 'b', position: 2, time: '12:00' },
      { id: 'u2', position: 3 },
      { id: 'a', position: 4, time: '08:00' },
    ]
    expect(ids(orderItems(l))).toBe('u1au2b')
  })
  it('a parità di orario resta l\'ordine di posizione', () => {
    const l = [
      { id: 'x', position: 1, time: '09:00' },
      { id: 'y', position: 2, time: '09:00' },
    ]
    expect(ids(orderItems(l))).toBe('xy')
  })
  it('già in ordine non cambia nulla e non modifica la lista di partenza', () => {
    const l = [{ id: 'a', position: 1, time: '08:00' }, { id: 'b', position: 2, time: '09:00' }]
    expect(ids(orderItems(l))).toBe('ab')
    expect(ids(l)).toBe('ab')
  })
})

describe('canSwap / renumber', () => {
  it('due orari diversi non si scambiano', () => expect(canSwap({ time: '09:00' }, { time: '10:00' })).toBe(false))
  it('con uno senza orario o orari uguali sì', () => {
    expect(canSwap({ time: '09:00' }, {})).toBe(true)
    expect(canSwap({}, {})).toBe(true)
    expect(canSwap({ time: '09:00' }, { time: '09:00' })).toBe(true)
  })
  it('renumber assegna 1000, 2000…', () => {
    expect(renumber([{ id: 'a' }, { id: 'b' }])).toEqual([{ id: 'a', position: 1000 }, { id: 'b', position: 2000 }])
  })
})

describe('changedPositions', () => {
  it('scambiando due tappe si riscrivono solo quelle due', () => {
    const before = [
      { id: 'a', position: 1000 },
      { id: 'b', position: 2000 },
      { id: 'c', position: 3000 },
      { id: 'd', position: 4000 },
    ]
    const next = renumber([before[0], before[2], before[1], before[3]])
    expect(changedPositions(before, next)).toEqual([
      { id: 'c', position: 2000 },
      { id: 'b', position: 3000 },
    ])
  })

  it('se le posizioni salvate erano disordinate le sistema tutte', () => {
    const before = [{ id: 'a' }, { id: 'b', position: 5 }]
    expect(changedPositions(before, renumber(before))).toHaveLength(2)
  })
})
