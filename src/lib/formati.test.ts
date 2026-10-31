import { describe, expect, it } from 'vitest'
import { distanza, FORMATI_DEFAULT, gradi, ora } from './formati'

const f12 = { ...FORMATI_DEFAULT, ore: 12 as const }
describe('formati (#63)', () => {
  it('ora a 24 e a 12 ore', () => {
    expect(ora('14:30')).toBe('14:30')
    expect(ora('14:30', f12)).toBe('2:30 PM')
    expect(ora('00:05', f12)).toBe('12:05 AM')
    expect(ora('12:00', f12)).toBe('12:00 PM')
    expect(ora('', f12)).toBe('')
    expect(ora('tutto il giorno', f12)).toBe('tutto il giorno')
  })
  it('gradi', () => {
    expect(gradi(20)).toBe('20°')
    expect(gradi(20, { ...FORMATI_DEFAULT, temperatura: 'F' })).toBe('68°')
    expect(gradi(-5, { ...FORMATI_DEFAULT, temperatura: 'F' })).toBe('23°')
  })
  it('distanza', () => {
    expect(distanza(800)).toBe('800 m')
    expect(distanza(2500)).toMatch(/^2,5 km$/)
    expect(distanza(1609.344, { ...FORMATI_DEFAULT, distanza: 'mi' })).toBe('1 mi')
    expect(distanza(30, { ...FORMATI_DEFAULT, distanza: 'mi' })).toBe('100 ft')
  })
})
