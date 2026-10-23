import { describe, expect, it } from 'vitest'
import { stopsSummary } from './stopsSummary'

describe('stopsSummary', () => {
  it('giorno vuoto', () => expect(stopsSummary([])).toBe('Giornata ancora libera'))
  it('una sola tappa senza orario', () => expect(stopsSummary([{}])).toBe('1 tappa'))
  it('altro giorno: primo orario', () => expect(stopsSummary([{ time: '10:00' }, { time: '09:00' }, {}])).toBe('3 tappe · dalle 09:00'))
  it('oggi: prossima tappa con orario', () => {
    const items = [{ time: '09:00', done: true }, { time: '12:30' }, { time: '18:00' }]
    expect(stopsSummary(items, '10:15')).toBe('3 tappe · 1 fatta · prossima 12:30')
  })
  it('oggi: nessuna prossima dopo le ultime', () => expect(stopsSummary([{ time: '09:00' }], '20:00')).toBe('1 tappa'))
  it('con il tempo di permanenza totale', () => {
    expect(stopsSummary([{}, {}], null, 330)).toBe('2 tappe · ≈ 5 h 30 di visite')
    expect(stopsSummary([{}], null, 0)).toBe('1 tappa')
  })
  it('tutte fatte', () => expect(stopsSummary([{ done: true }, { done: true }], '10:00')).toBe('2 tappe · tutte fatte'))
})

import { minutesToHHMM } from './stopsSummary'
describe('minutesToHHMM', () => {
  it('formatta', () => {
    expect(minutesToHHMM(0)).toBe('00:00')
    expect(minutesToHHMM(615)).toBe('10:15')
    expect(minutesToHHMM(2000)).toBe('23:59')
  })
})
