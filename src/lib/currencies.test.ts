import { describe, expect, it } from 'vitest'
import { allCurrencies, COMMON_CURRENCIES, currencyGroups } from './currencies'

describe('valute', () => {
  it('l\'elenco non ha doppioni e contiene le valute principali', () => {
    const all = allCurrencies()
    expect(new Set(all).size).toBe(all.length)
    for (const c of ['EUR', 'USD', 'JPY', 'GBP', 'ISK', 'KRW']) expect(all).toContain(c)
  })
  it('una valuta ha il suo nome esteso', () => {
    expect(currencyGroups()[0].valute.find((v) => v.code === 'JPY')?.label.toLowerCase()).toContain('yen')
  })
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
