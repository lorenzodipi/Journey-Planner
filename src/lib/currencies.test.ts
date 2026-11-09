import { describe, expect, it } from 'vitest'
import { allCurrencies, COMMON_CURRENCIES, currencyGroups, currencyOptions } from './currencies'

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

describe('valute raggruppate per la select', () => {
  it('prima le più usate, poi tutte le altre senza doppioni', () => {
    const [prime, altre] = currencyGroups()
    expect(prime.gruppo).toBe('Più usate')
    expect(prime.valute.map((v) => v.code)).toEqual(COMMON_CURRENCIES)
    const tutte = [...prime.valute, ...altre.valute].map((v) => v.code)
    expect(new Set(tutte).size).toBe(tutte.length)
    expect(altre.valute.map((v) => v.code)).toEqual([...altre.valute.map((v) => v.code)].sort())
    for (const c of ['EUR', 'USD', 'JPY', 'ISK', 'KRW', 'PLN', 'CZK']) expect(tutte).toContain(c)
  })
  it('ogni voce ha codice e nome, e un codice fuori elenco si tiene in cima', () => {
    const [prime] = currencyGroups('xyz')
    expect(prime.valute[0].code).toBe('XYZ')
    expect(currencyGroups()[0].valute.find((v) => v.code === 'EUR')?.label).toMatch(/^EUR · /)
  })
  it('un codice non valido viene ignorato', () => expect(currencyGroups('euro', '')[0].valute.map((v) => v.code)).toEqual(COMMON_CURRENCIES))
})
