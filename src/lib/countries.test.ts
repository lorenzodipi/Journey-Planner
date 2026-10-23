import { describe, expect, it } from 'vitest'
import { COUNTRIES, countryByCode, countryByName, themeForCountry, zonesOf } from './countries'
import { isValidTimezone, PRESETS } from './tripForm'

describe('elenco dei paesi', () => {
  it('ci sono tutti i paesi, senza codici doppi', () => {
    const codes = COUNTRIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(245)
  })
  it('ogni paese ha un nome in italiano (diverso dal codice) e nomi tutti diversi', () => {
    for (const c of COUNTRIES) expect(c.name, c.code).not.toBe(c.code)
    expect(new Set(COUNTRIES.map((c) => c.name)).size).toBe(COUNTRIES.length)
  })
  it('ogni paese ha una valuta di 3 lettere, un fuso valido e un centro mappa', () => {
    for (const c of COUNTRIES) {
      expect(c.currency, c.code).toMatch(/^[A-Z]{3}$/)
      expect(isValidTimezone(c.timezone), `${c.code} ${c.timezone}`).toBe(true)
      expect(Math.abs(c.center.lat)).toBeLessThanOrEqual(90)
      expect(Math.abs(c.center.lng)).toBeLessThanOrEqual(180)
    }
  })
  it('i fusi dei paesi grandi sono validi e cominciano dal principale', () => {
    for (const c of COUNTRIES) {
      const zones = zonesOf(c.code)
      expect(zones.length).toBeGreaterThan(0)
      for (const z of zones) expect(isValidTimezone(z), `${c.code} ${z}`).toBe(true)
      if (zones.length > 1) expect(zones[0], c.code).toBe(c.timezone)
    }
    expect(zonesOf('US').length).toBeGreaterThan(3)
    expect(zonesOf('IT')).toEqual(['Europe/Rome'])
  })
  it('è ordinato per nome', () => {
    const names = COUNTRIES.map((c) => c.name)
    expect(names).toEqual([...names].sort(new Intl.Collator('it').compare))
  })
})

describe('ricerca', () => {
  it('per nome, senza badare a maiuscole e accenti', () => {
    expect(countryByName('giappone')?.code).toBe('JP')
    expect(countryByName(' Islanda ')?.code).toBe('IS')
    expect(countryByName('Kyoto e dintorni')).toBeUndefined()
    expect(countryByName('')).toBeUndefined()
  })
  it('per codice', () => expect(countryByCode('it')?.name).toBe('Italia'))
  it('i preset coincidono con la select', () => {
    for (const p of PRESETS.filter((x) => x.id !== 'other')) {
      const c = countryByName(p.destination)
      expect(c, p.id).toBeDefined()
      expect(c?.timezone).toBe(p.timezone)
      expect(c?.currency).toBe(p.localCurrency)
      expect(themeForCountry(c!.code)).toBe(p.theme)
    }
  })
})
