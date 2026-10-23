import { describe, expect, it } from 'vitest'
import { allCurrencies, COMMON_CURRENCIES, currencyOptions } from './currencies'

describe('valute', () => {
  it('l\'elenco non ha doppioni e contiene le valute principali', () => {
    const all = allCurrencies()
    expect(new Set(all).size).toBe(all.length)
    for (const c of ['EUR', 'USD', 'JPY', 'GBP', 'ISK', 'KRW']) expect(all).toContain(c)
  })
  it('le più comuni vengono prima, poi le altre in ordine', () => {
    const codes = currencyOptions().map((o) => o.value)
    expect(codes.slice(0, COMMON_CURRENCIES.length)).toEqual(COMMON_CURRENCIES)
    const rest = codes.slice(COMMON_CURRENCIES.length)
    expect(rest).toEqual([...rest].sort())
  })
  it('ogni valuta ha un nome esteso e si cerca per nome', () => {
    const opts = currencyOptions()
    for (const o of opts) expect(o.hint, o.value).toBeTruthy()
    expect(opts.find((o) => o.value === 'JPY')?.hint?.toLowerCase()).toContain('yen')
  })
  it('un codice fuori elenco resta selezionabile', () => {
    const codes = currencyOptions('xyz').map((o) => o.value)
    expect(codes[0]).toBe('XYZ')
  })
  it('un codice non valido viene ignorato', () => expect(currencyOptions('euro', '').map((o) => o.value)).not.toContain('EURO'))
})
