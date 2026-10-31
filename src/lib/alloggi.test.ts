import { describe, expect, it } from 'vitest'
import type { Stay } from '../types'
import { cameraDi, inclusi, orarioCheck, perCitta } from './alloggi'

const s = (id: string, city: string, checkIn: string, checkOut: string): Stay =>
  ({ id, name: id, city, checkIn, checkOut, currency: 'EUR', breakfast: false, dinner: false, kitchen: false, booked: true, paid: false }) as Stay

describe('alloggi', () => {
  it('raggruppa per città e somma le notti', () => {
    const g = perCitta([s('c', 'Osaka', '2026-11-26', '2026-11-28'), s('a', 'Kyoto', '2026-11-23', '2026-11-26'), s('b', 'kyoto', '2026-11-28', '2026-11-29')])
    expect(g.map((x) => [x.city, x.nights, x.stays.length])).toEqual([['Kyoto', 4, 2], ['Osaka', 2, 1]])
  })
  it('mette «Senza città» se manca', () => {
    expect(perCitta([s('a', '', '2026-11-23', '2026-11-24')])[0].city).toBe('Senza città')
  })
  it('scrive gli orari di check-in e check-out', () => {
    expect(orarioCheck('15:00', 'in')).toBe('dalle 15:00')
    expect(orarioCheck('11.00', 'out')).toBe('entro le 11:00')
    expect(orarioCheck('17:00–22:00', 'in')).toBe('17:00–22:00')
    expect(orarioCheck(undefined, 'out')).toBe('')
  })
  it('descrive camera e pasti', () => {
    expect(cameraDi({ room: '4', roomType: 'Washitsu' })).toBe('4 · Washitsu')
    expect(cameraDi({})).toBe('—')
    expect(inclusi({ breakfast: true, dinner: false, kitchen: true })).toBe('Colazione, Cucina')
  })
})

import { intervalliNotti, nottiScoperte } from './stays'
describe('notti scoperte (#57)', () => {
  const trip = {
    startDate: '2026-11-21', endDate: '2026-11-27', timezone: 'Asia/Tokyo', transports: [],
    flights: [{ legs: [{ departAt: '2026-11-21T09:00:00Z', arriveAt: '2026-11-22T03:00:00Z' }] }],
    stays: [{ checkIn: '2026-11-22', checkOut: '2026-11-24' }],
  } as never
  it('check-in incluso, check-out escluso, e la notte in volo non conta', () => {
    expect(nottiScoperte(trip)).toEqual(['2026-11-24', '2026-11-25', '2026-11-26'])
  })
  it('raggruppa le notti consecutive', () => {
    expect(intervalliNotti(['2026-11-24', '2026-11-25', '2026-11-27'])).toEqual([{ from: '2026-11-24', to: '2026-11-25', count: 2 }, { from: '2026-11-27', to: '2026-11-27', count: 1 }])
  })
})

describe('notti coperte da mezzi notturni', () => {
  const base = { startDate: '2026-11-21', endDate: '2026-12-09', timezone: 'Asia/Tokyo', transports: [] as never[] }
  const stays = [{ checkIn: '2026-11-22', checkOut: '2026-12-08' }]
  const volo = (departAt: string, arriveAt: string, fromTz: string, toTz: string) => ({ legs: [{ departAt, arriveAt, fromTz, toTz }] })
  it('volo di ritorno la notte dell’8/12: nessuna notte senza alloggio', () => {
    const trip = { ...base, stays, flights: [volo('2026-11-21T09:00:00Z', '2026-11-22T03:00:00Z', 'Europe/Rome', 'Asia/Tokyo'), volo('2026-12-08T14:00:00Z', '2026-12-09T06:00:00Z', 'Asia/Tokyo', 'Europe/Rome')] } as never
    expect(nottiScoperte(trip)).toEqual([])
  })
  it('ritorno che atterra lo stesso giorno: la notte a casa non è «senza alloggio»', () => {
    const trip = { ...base, stays, flights: [volo('2026-11-21T09:00:00Z', '2026-11-22T03:00:00Z', 'Europe/Rome', 'Asia/Tokyo'), volo('2026-12-07T23:30:00Z', '2026-12-08T11:00:00Z', 'Asia/Tokyo', 'Europe/Rome')] } as never
    expect(nottiScoperte(trip)).toEqual([])
  })
  it('un treno con le sole date copre la notte', () => {
    const trip = { ...base, endDate: '2026-11-25', stays: [{ checkIn: '2026-11-21', checkOut: '2026-11-23' }, { checkIn: '2026-11-24', checkOut: '2026-11-25' }], flights: [], transports: [{ mode: 'train', departDate: '2026-11-23', arriveDate: '2026-11-24' }] } as never
    expect(nottiScoperte(trip)).toEqual([])
  })
  it('un bus notturno con gli orari copre la notte', () => {
    const trip = { ...base, endDate: '2026-11-25', stays: [{ checkIn: '2026-11-21', checkOut: '2026-11-23' }, { checkIn: '2026-11-24', checkOut: '2026-11-25' }], flights: [], transports: [{ mode: 'bus', departAt: '2026-11-23T13:00:00Z', arriveAt: '2026-11-23T20:00:00Z' }] } as never
    expect(nottiScoperte(trip)).toEqual([])
  })
  it('senza mezzi la notte scoperta resta segnalata', () => {
    const trip = { ...base, endDate: '2026-11-25', stays: [{ checkIn: '2026-11-21', checkOut: '2026-11-23' }], flights: [] } as never
    expect(nottiScoperte(trip)).toEqual(['2026-11-23', '2026-11-24'])
  })
})

describe('scalo di notte in aeroporto', () => {
  it('arrivo in Cina alle 18:20 e ripartenza all’1:30: la notte dell’8/12 non è senza alloggio', () => {
    const trip = {
      startDate: '2026-11-21', endDate: '2026-12-09', timezone: 'Asia/Tokyo', transports: [],
      stays: [{ checkIn: '2026-11-22', checkOut: '2026-12-08' }],
      flights: [
        { legs: [{ departAt: '2026-11-21T09:00:00Z', arriveAt: '2026-11-22T03:00:00Z', fromTz: 'Europe/Rome', toTz: 'Asia/Tokyo' }] },
        { legs: [
          { departAt: '2026-12-08T07:30:00Z', arriveAt: '2026-12-08T10:20:00Z', fromTz: 'Asia/Tokyo', toTz: 'Asia/Shanghai' },
          { departAt: '2026-12-08T17:30:00Z', arriveAt: '2026-12-09T06:15:00Z', fromTz: 'Asia/Shanghai', toTz: 'Europe/Rome' },
        ] },
      ],
    } as never
    expect(nottiScoperte(trip)).toEqual([])
  })
})
