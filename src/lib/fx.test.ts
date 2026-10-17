import { describe, expect, it } from 'vitest'
import { baseToLocal, decimalsOf, examples, fieldText, formatRateNumber, localPerBase, localToBase } from './fx'

describe('cambio', () => {
  it('1 € in yen: inverso del tasso salvato', () => {
    expect(localPerBase(0.0056)).toBeCloseTo(178.5714, 3)
    expect(formatRateNumber(localPerBase(0.0056))).toBe('178,57')
  })

  it('decimali per valuta', () => {
    expect(decimalsOf('JPY')).toBe(0)
    expect(decimalsOf('EUR')).toBe(2)
  })

  it('esempi 1, 10 e 100 euro, in yen interi', () => {
    expect(examples(0.0056, 'JPY')).toEqual([
      { base: 1, local: 179 },
      { base: 10, local: 1786 },
      { base: 100, local: 17857 },
    ])
  })

  it('conversione nei due sensi', () => {
    expect(baseToLocal(50, 0.0056, 'JPY')).toBe(8929)
    expect(localToBase(8929, 0.0056, 'EUR')).toBe(50)
    expect(localToBase(1200, 0.0056, 'EUR')).toBe(6.72)
  })

  it('tasso maggiore di 1 (valuta locale più forte)', () => {
    expect(formatRateNumber(localPerBase(1.17))).toBe('0,8547')
    expect(baseToLocal(100, 1.17, 'GBP')).toBe(85.47)
  })

  it('testo per i campi', () => {
    expect(fieldText(1234.5)).toBe('1234,5')
    expect(fieldText(8929)).toBe('8929')
  })
})
