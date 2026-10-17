import { describe, expect, it } from 'vitest'
import type { TripInput } from './tripApi'
import { cleanPeople, isValidTimezone, nameFromEmail, validateTrip } from './tripForm'

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

describe('cleanPeople', () => {
  it('richiede il proprio nome', () => {
    expect(cleanPeople(' ', []).error).toMatch(/tuo nome/)
    expect(cleanPeople(' Lorenzo ', [])).toEqual({ self: 'Lorenzo', others: [], error: null })
  })
  it('ignora le righe vuote e porta le email in minuscolo', () => {
    const r = cleanPeople('Lorenzo', [{ email: '', name: '' }, { email: ' Gaia.D@Mail.it ', name: '' }])
    expect(r.error).toBeNull()
    expect(r.others).toEqual([{ email: 'gaia.d@mail.it', name: 'Gaia d' }])
  })
  it('non ammette persone senza account (solo il nome)', () => {
    expect(cleanPeople('Lorenzo', [{ email: '', name: 'Gaia' }]).error).toMatch(/email/)
  })
  it('rifiuta email non valide, doppioni e la propria email', () => {
    expect(cleanPeople('L', [{ email: 'gaia', name: '' }]).error).toMatch(/non è un indirizzo/)
    expect(cleanPeople('L', [{ email: 'a@b.it', name: 'A' }, { email: 'A@b.it', name: 'B' }]).error).toMatch(/due volte/)
    expect(cleanPeople('L', [{ email: 'me@b.it', name: 'A' }], 'ME@b.it').error).toMatch(/due volte/)
  })
  it('rifiuta due persone con lo stesso nome', () => {
    expect(cleanPeople('Anna', [{ email: 'a@b.it', name: 'anna' }]).error).toMatch(/si chiamano/)
  })
})

describe('nameFromEmail', () => {
  it('ricava un nome dalla parte prima della chiocciola', () => {
    expect(nameFromEmail('gaia@mail.it')).toBe('Gaia')
    expect(nameFromEmail('lorenzo.di_palma@x.it')).toBe('Lorenzo di palma')
    expect(nameFromEmail('@x.it')).toBe('')
  })
})
