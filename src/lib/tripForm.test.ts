import { describe, expect, it } from 'vitest'
import type { TripInput } from './tripApi'
import { cleanTravelerNames, isValidTimezone, validateTrip } from './tripForm'

const ok: TripInput = {
  title: 'Giappone 2026',
  destination: 'Giappone',
  startDate: '2026-11-21',
  endDate: '2026-12-09',
  timezone: 'Asia/Tokyo',
  theme: 'japan',
  baseCurrency: 'EUR',
  localCurrency: 'JPY',
  center: { lat: 35.68, lng: 139.76 },
}

describe('validateTrip', () => {
  it('accetta un viaggio corretto', () => expect(validateTrip(ok)).toBeNull())
  it('richiede il titolo', () => expect(validateTrip({ ...ok, title: '  ' })).toMatch(/nome/))
  it('richiede le date', () => expect(validateTrip({ ...ok, startDate: '' })).toMatch(/date/))
  it('rifiuta la fine prima dell’inizio', () => expect(validateTrip({ ...ok, endDate: '2026-11-01' })).toMatch(/prima/))
  it('rifiuta un fuso inesistente', () => expect(validateTrip({ ...ok, timezone: 'Marte/Olympus' })).toMatch(/fuso/))
  it('la valuta locale può essere vuota ma non sbagliata', () => {
    expect(validateTrip({ ...ok, localCurrency: '' })).toBeNull()
    expect(validateTrip({ ...ok, localCurrency: 'YEN1' })).toMatch(/valuta locale/)
  })
  it('rifiuta una valuta base sbagliata', () => expect(validateTrip({ ...ok, baseCurrency: 'E' })).toMatch(/valuta base/))
})

describe('isValidTimezone', () => {
  it('riconosce i fusi IANA', () => {
    expect(isValidTimezone('Europe/Rome')).toBe(true)
    expect(isValidTimezone('Nope/Nope')).toBe(false)
    expect(isValidTimezone('')).toBe(false)
  })
})

describe('cleanTravelerNames', () => {
  it('toglie i vuoti e gli spazi', () => {
    expect(cleanTravelerNames([' Anna ', '', 'Luca'])).toEqual({ names: ['Anna', 'Luca'], error: null })
  })
  it('richiede almeno un nome', () => expect(cleanTravelerNames(['', ' ']).error).toMatch(/almeno/))
  it('segnala i doppioni senza badare alle maiuscole', () => {
    expect(cleanTravelerNames(['Anna', 'anna']).error).toMatch(/stesso nome/)
  })
})
