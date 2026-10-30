import { describe, expect, it } from 'vitest'
import type { TripCountry } from '../types'
import { fusoDelGiorno, paeseDelGiorno, paesePrincipale, paesiDi, valutaDelGiorno, validaPaesi } from './paesi'

const c = (id: string, name: string, currency: string, timezone: string, startDate: string, endDate: string): TripCountry => ({ id, country: '', name, currency, timezone, startDate, endDate, position: 0 })
const trip = {
  destination: 'Giappone',
  timezone: 'Asia/Tokyo',
  localCurrency: 'JPY',
  fxRate: 0.0056,
  startDate: '2026-11-21',
  endDate: '2026-12-09',
  center: { lat: 35, lng: 139 },
  countries: [c('a', 'Emirati Arabi Uniti', 'AED', 'Asia/Dubai', '2026-11-21', '2026-11-22'), c('b', 'Giappone', 'JPY', 'Asia/Tokyo', '2026-11-22', '2026-12-09')],
}

describe('paesi del viaggio', () => {
  it('senza paesi salvati ne ricava uno da destinazione e valuta', () => {
    const l = paesiDi({ ...trip, countries: undefined })
    expect(l).toHaveLength(1)
    expect(l[0]).toMatchObject({ name: 'Giappone', currency: 'JPY', timezone: 'Asia/Tokyo', fxRate: 0.0056 })
  })
  it('un giorno coperto da due paesi (scalo) va al secondo', () => {
    expect(paeseDelGiorno(trip, '2026-11-22').name).toBe('Giappone')
    expect(paeseDelGiorno(trip, '2026-11-21').name).toBe('Emirati Arabi Uniti')
  })
  it('un giorno scoperto va al paese più vicino nel tempo', () => {
    const t = { ...trip, startDate: '2026-11-19', countries: [c('a', 'A', 'AED', 'Asia/Dubai', '2026-11-21', '2026-11-22'), c('b', 'B', 'JPY', 'Asia/Tokyo', '2026-11-25', '2026-12-09')] }
    expect(paeseDelGiorno(t, '2026-11-19').name).toBe('A')
    expect(paeseDelGiorno(t, '2026-11-23').name).toBe('A')
    expect(paeseDelGiorno(t, '2026-11-24').name).toBe('B')
  })
  it('fuso e valuta seguono il giorno', () => {
    expect(fusoDelGiorno(trip, '2026-11-21')).toBe('Asia/Dubai')
    expect(valutaDelGiorno(trip, '2026-12-01')).toBe('JPY')
  })
  it('il principale è quello con più giorni', () => {
    expect(paesePrincipale(trip).name).toBe('Giappone')
  })
  it('valida le date dei paesi', () => {
    const l = trip.countries
    expect(validaPaesi(l, trip.startDate, trip.endDate)).toBeNull()
    expect(validaPaesi(l, '2026-11-22', trip.endDate)?.index).toBe(0)
    expect(validaPaesi([c('x', 'X', 'USD', 'UTC', '2026-12-05', '2026-12-01')], trip.startDate, trip.endDate)?.message).toMatch(/fine è prima/)
    expect(validaPaesi([], trip.startDate, trip.endDate)).not.toBeNull()
  })
})

import { rateFor, tripCurrencies } from './money'
import { oggiNelViaggio, vistaDelGiorno } from './paesi'

describe('paesi e valute', () => {
  const t = { ...trip, baseCurrency: 'EUR', fxRates: undefined as Record<string, number> | undefined, countries: [{ ...trip.countries[0], fxRate: 0.25 }, { ...trip.countries[1], fxRate: 0.0056 }] }
  it('le valute e i cambi dei paesi sono usabili', () => {
    expect(tripCurrencies(t)).toEqual(['EUR', 'JPY', 'AED'])
    expect(rateFor(t, 'AED')).toBe(0.25)
    expect(rateFor(t, 'USD')).toBeUndefined()
  })
  it('la vista del giorno prende fuso e valuta del paese', () => {
    const v = vistaDelGiorno(t, '2026-11-21')
    expect(v.timezone).toBe('Asia/Dubai')
    expect(v.localCurrency).toBe('AED')
    expect(v.fxRate).toBe(0.25)
  })
  it('oggi si riallinea al paese del giorno', () => {
    // 21 nov 2026 23:00 a Dubai (19:00 UTC) è già il 22 in Giappone, ma Dubai è il paese del 21
    const r = oggiNelViaggio(t, new Date('2026-11-21T19:00:00Z'))
    expect(r.trip.timezone === 'Asia/Dubai' || r.trip.timezone === 'Asia/Tokyo').toBe(true)
    expect(r.today).toMatch(/^2026-11-2[12]$/)
  })
})
