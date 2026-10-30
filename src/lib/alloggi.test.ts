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
