import { describe, expect, it } from 'vitest'
import { convert, outstanding, outstandingForPerson, perPerson, totalFor } from './money'

// Cifre FITTIZIE, solo per verificare la logica.
describe('soldi', () => {
  it('per persona e totale', () => {
    expect(perPerson(500, 'per_person', 2)).toBe(500)
    expect(perPerson(1000, 'total', 2)).toBe(500)
    expect(totalFor(500, 'per_person', 2)).toBe(1000)
    expect(totalFor(1000, 'total', 2)).toBe(1000)
  })

  it('residuo da pagare di una voce', () => {
    expect(outstanding({ amount: 100, scope: 'per_person', paidCount: 0 }, 2)).toBe(200)
    expect(outstanding({ amount: 100, scope: 'per_person', paidCount: 1 }, 2)).toBe(100)
    expect(outstanding({ amount: 100, scope: 'per_person', paidCount: 2 }, 2)).toBe(0)
    expect(outstanding({ amount: 90, scope: 'total', paidCount: 1 }, 3)).toBe(60)
  })

  it('residuo di una persona, come SUMIF(Pagato; FALSE; Prezzo) del foglio', () => {
    const lines = [
      { amount: 600, scope: 'per_person' as const, paid: true },
      { amount: 200, scope: 'per_person' as const, paid: false },
      { amount: 30, scope: 'per_person' as const, paid: false },
    ]
    expect(outstandingForPerson(lines, 2)).toBe(230)
  })

  it('conversione di valuta', () => {
    expect(convert(10_000, 0.0061)).toBe(61)
  })
})

import { amountToText, formatMoney, parseAmount } from './money'

describe('importi scritti a mano', () => {
  it('legge virgola e punto', () => {
    expect(parseAmount('12,5')).toBe(12.5)
    expect(parseAmount('1.234,50')).toBe(1234.5)
    expect(parseAmount('1.234')).toBe(1234)
    expect(parseAmount('300')).toBe(300)
    expect(parseAmount('12.5')).toBe(12.5)
  })

  it('vuoto o non valido è null', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
  })

  it('formatta euro e yen', () => {
    expect(formatMoney(12345.5, 'EUR')).toMatch(/12\.345,50/)
    expect(formatMoney(30000, 'JPY')).toMatch(/30\.000/)
    expect(formatMoney(30000, 'JPY')).not.toMatch(/,00/)
    expect(formatMoney(5, 'XXX1')).toBe('5.00 XXX1')
  })

  it('testo del campo', () => {
    expect(amountToText(30)).toBe('30')
    expect(amountToText(12.5)).toBe('12,5')
    expect(amountToText(undefined)).toBe('')
  })
})

import { sumByCurrency } from './money'

describe('somme per valuta', () => {
  it('raggruppa e arrotonda', () => {
    expect(
      sumByCurrency([
        { amount: 100.1, currency: 'EUR' },
        { amount: 3000, currency: 'JPY' },
        { amount: 0.2, currency: 'EUR' },
      ]),
    ).toEqual([
      { currency: 'EUR', amount: 100.3 },
      { currency: 'JPY', amount: 3000 },
    ])
    expect(sumByCurrency([])).toEqual([])
  })
})

import { parseRate } from './money'

describe('tasso di cambio', () => {
  it('mantiene i decimali che servono', () => {
    expect(parseRate('0,0056')).toBe(0.0056)
    expect(parseRate('0.00562')).toBe(0.00562)
    expect(parseRate('160')).toBe(160)
    expect(parseRate('0,1234567')).toBe(0.123457)
  })

  it('zero, negativi e testo non valgono', () => {
    expect(parseRate('0')).toBeNull()
    expect(parseRate('-1')).toBeNull()
    expect(parseRate('abc')).toBeNull()
    expect(parseRate('')).toBeNull()
  })
})
