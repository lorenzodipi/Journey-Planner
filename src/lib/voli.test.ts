import { describe, expect, it } from 'vitest'
import type { Flight, FlightLeg } from '../types'
import { fasciaScali, raggruppaVoli, riepilogoVolo, durataLunga } from './voli'

const leg = (n: string, from: string, to: string, departAt: string, arriveAt: string, fromTz: string, toTz: string, seq = 1): FlightLeg => ({ id: n + seq, seq, flightNumber: n, from, to, departAt, arriveAt, fromTz, toTz })
const fl = (id: string, legs: FlightLeg[]): Flight => ({ id, title: id, currency: 'EUR', scope: 'per_person', paid: true, legs })
// MXP 12:40 (11:40Z) → DXB 21:50 (17:50Z, +4) → KIX 23:40 Dubai (19:40Z) → 13:20+1 Osaka (04:20Z)
const andata = fl('a', [
  leg('FA 206', 'MXP', 'DXB', '2026-11-21T11:40:00Z', '2026-11-21T17:50:00Z', 'Europe/Rome', 'Asia/Dubai'),
  leg('FA 316', 'DXB', 'KIX', '2026-11-21T19:40:00Z', '2026-11-22T04:20:00Z', 'Asia/Dubai', 'Asia/Tokyo', 2),
])
const ritorno = fl('r', [leg('FA 207', 'KIX', 'MXP', '2026-12-09T02:50:00Z', '2026-12-09T16:55:00Z', 'Asia/Tokyo', 'Europe/Rome')])

describe('voli', () => {
  it('raggruppa Andata e Ritorno', () => {
    const g = raggruppaVoli([ritorno, andata], { originCountry: 'IT' })
    expect(g.map((x) => x.title.split(' · ')[0])).toEqual(['Andata', 'Ritorno'])
  })
  it('un volo interno è «Volo»', () => {
    const interno = fl('i', [leg('JL 1', 'HND', 'ITM', '2026-12-01T00:00:00Z', '2026-12-01T01:15:00Z', 'Asia/Tokyo', 'Asia/Tokyo')])
    const g = raggruppaVoli([andata, interno, ritorno], { originCountry: 'IT' })
    expect(g.map((x) => x.title.split(' · ')[0])).toEqual(['Andata', 'Volo', 'Ritorno'])
  })
  it('riepiloga durata totale, scali e +1', () => {
    const r = riepilogoVolo(andata)
    expect(r.duration).toBe('16 h 40')
    expect(r.scali).toEqual([{ city: 'Dubai', minutes: 110 }])
    expect(r.plus).toBe(1)
    expect(r.numeri).toEqual(['FA 206', 'FA 316'])
    expect(fasciaScali(r.scali)).toEqual({ titolo: '1 scalo a Dubai', resto: '1 h 50 di attesa' })
  })
  it('più scali', () => {
    expect(fasciaScali([{ city: 'A', minutes: 60 }, { city: 'B', minutes: 70 }])).toEqual({ titolo: '2 scali', resto: '2 h 10 di attesa in tutto' })
    expect(durataLunga(45)).toBe('45 min')
  })
})
