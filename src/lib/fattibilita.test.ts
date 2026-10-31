import { describe, expect, it } from 'vitest'
import type { Stay, Trip } from '../types'
import { alloggiDelGiorno, margineDelGiorno, mezziDelGiorno, verificaGiorno } from './fattibilita'

const v = (id: string, start: number | null, end: number | null) => ({ id, title: id, start, end })
const base = { margine: 0, mezzi: [], spostamento: () => 0 }

describe('fattibilità del giorno (#55)', () => {
  it('segnala il conflitto con spostamento e margine', () => {
    const r2 = verificaGiorno({ ...base, voci: [v('A', 600, 660), v('B', 675, 700)], spostamento: () => 20, margine: 15 })
    expect(r2.conflitti.map((c) => c.testo)).toEqual(['Tra A e B servono 35 min, ne hai 15'])
  })
  it('non inventa durate: senza durata dice che non è verificato', () => {
    const r = verificaGiorno({ ...base, voci: [v('A', 600, null), v('B', 700, 760)] })
    expect(r.nonVerificate.map((x) => x.testo)).toEqual(['Fattibilità non verificata: manca la durata di A'])
    expect(r.conflitti).toEqual([])
  })
  it('segnala sovrapposizioni tra tappe e con i mezzi', () => {
    const r = verificaGiorno({ ...base, voci: [v('A', 600, 700), v('B', 650, 720), v('C', 900, 960)], mezzi: [{ label: 'Volo MXP → KIX', start: 930, end: 1100 }] })
    expect(r.sovrapposizioni.map((x) => x.testo)).toEqual(['C: si sovrappone a Volo MXP → KIX', 'B: si sovrappone a A'])
  })
  it('il margine è del giorno, poi del viaggio, poi zero', () => {
    expect(margineDelGiorno({ defaultMarginMin: 15 }, { marginMin: 30 })).toBe(30)
    expect(margineDelGiorno({ defaultMarginMin: 15 }, {})).toBe(15)
    expect(margineDelGiorno({}, {})).toBe(0)
  })
  it('l\'alloggio è partenza e arrivo in automatico, modificabile o escluso', () => {
    const s = (id: string, a: string, b: string) => ({ id, checkIn: a, checkOut: b }) as Stay
    const trip = { stays: [s('1', '2026-11-22', '2026-11-24'), s('2', '2026-11-24', '2026-11-27')] }
    expect(alloggiDelGiorno(trip, { date: '2026-11-24' })).toMatchObject({ partenza: { id: '1' }, arrivo: { id: '2' } })
    expect(alloggiDelGiorno(trip, { date: '2026-11-24', endStayId: '1' }).arrivo?.id).toBe('1')
    expect(alloggiDelGiorno(trip, { date: '2026-11-24', excludeStay: true })).toEqual({ escluso: true })
  })
  it('i voli del giorno diventano intervalli nel fuso del viaggio', () => {
    const trip = { timezone: 'Asia/Tokyo', transports: [], flights: [{ legs: [{ from: 'MXP', to: 'KIX', departAt: '2026-11-21T09:00:00Z', arriveAt: '2026-11-22T03:00:00Z' }] }] } as unknown as Pick<Trip, 'timezone' | 'flights' | 'transports'>
    expect(mezziDelGiorno(trip, '2026-11-22')).toEqual([{ label: 'Volo MXP → KIX', start: 0, end: 720 }])
    expect(mezziDelGiorno(trip, '2026-11-23')).toEqual([])
  })
})
