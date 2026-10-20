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

import { tripCurrencies } from './money'

describe('valute scegliibili nel viaggio', () => {
  it('base e locale, senza doppioni', () => {
    expect(tripCurrencies({ baseCurrency: 'EUR', localCurrency: 'JPY' })).toEqual(['EUR', 'JPY'])
    expect(tripCurrencies({ baseCurrency: 'EUR', localCurrency: 'EUR' })).toEqual(['EUR'])
    expect(tripCurrencies({ baseCurrency: 'EUR' })).toEqual(['EUR'])
  })
  it('normalizza maiuscole e spazi', () => {
    expect(tripCurrencies({ baseCurrency: ' eur ', localCurrency: 'jpy' })).toEqual(['EUR', 'JPY'])
  })
  it('tiene la valuta già salvata su una voce, se il viaggio non la prevede', () => {
    expect(tripCurrencies({ baseCurrency: 'EUR', localCurrency: 'JPY' }, 'USD')).toEqual(['EUR', 'JPY', 'USD'])
    expect(tripCurrencies({ baseCurrency: 'EUR', localCurrency: 'JPY' }, 'JPY')).toEqual(['EUR', 'JPY'])
  })
})

import { cleanRates, extraCurrencies, rateFor } from './money'

describe('valute extra del viaggio', () => {
  const trip = { baseCurrency: 'EUR', localCurrency: 'JPY', fxRate: 0.0056, fxRates: { KRW: 0.00065, THB: 0.026 } }
  it('le extra si scelgono dopo base e locale, in ordine alfabetico', () => {
    expect(extraCurrencies(trip)).toEqual(['KRW', 'THB'])
    expect(tripCurrencies(trip)).toEqual(['EUR', 'JPY', 'KRW', 'THB'])
    expect(tripCurrencies({ baseCurrency: 'EUR', localCurrency: 'JPY' })).toEqual(['EUR', 'JPY']) // senza extra: come prima
  })
  it('rateFor: base = 1, locale, extra, sconosciuta = nessun cambio', () => {
    expect(rateFor(trip, 'EUR')).toBe(1)
    expect(rateFor(trip, 'jpy')).toBe(0.0056)
    expect(rateFor(trip, 'KRW')).toBe(0.00065)
    expect(rateFor(trip, 'USD')).toBeUndefined()
    expect(rateFor({ baseCurrency: 'EUR', localCurrency: 'JPY' }, 'JPY')).toBeUndefined()
  })
  it('cleanRates scarta codici e tassi non validi', () => {
    expect(cleanRates({ krw: 0.00065, THB: '0.026', EU: 1, USD: -2, XXX: 'abc', JPY: 1e9 })).toEqual({ KRW: 0.00065, THB: 0.026 })
    expect(cleanRates(null)).toEqual({})
    expect(cleanRates([1, 2])).toEqual({})
  })
})
