import { describe, expect, it } from 'vitest'
import { giornoAcquisto, tutteLeSpese } from './spese'
import type { Trip } from '../types'

const base = {
  travelers: [{ id: 'a', name: 'Lorenzo' }, { id: 'b', name: 'Marta' }],
  stays: [],
  flights: [],
  transports: [],
  bookings: [],
  expenses: [],
  timezone: 'Asia/Tokyo',
  startDate: '2026-11-22',
} as unknown as Trip

describe('giornoAcquisto', () => {
  it('una voce pagata conta nel giorno in cui è stata inserita, nel fuso del telefono', () => {
    const trip = {
      ...base,
      stays: [{ id: 's1', name: 'Hotel', city: 'Tokyo', checkIn: '2026-11-22', checkOut: '2026-11-26', totalCost: 400, currency: 'EUR', paid: true, createdAt: '2026-09-10T16:30:00.000Z' }],
    } as unknown as Trip
    const [e] = tutteLeSpese(trip)
    expect(e.acquistoAt).toBe('2026-09-10T16:30:00.000Z')
    // 18:30 a Roma = 01:30 del giorno dopo a Tokyo: vale il giorno di chi l'ha inserita
    expect(giornoAcquisto(e, 'Asia/Tokyo', 'Europe/Rome')).toBe('2026-09-10')
  })

  it('senza data di inserimento vale il giorno d’uso', () => {
    const trip = {
      ...base,
      flights: [{ id: 'f1', title: 'Roma → Tokyo', cost: 600, currency: 'EUR', scope: 'total', paid: true, legs: [{ departAt: '2026-11-21T10:30:00.000Z' }] }],
    } as unknown as Trip
    const [e] = tutteLeSpese(trip)
    expect(e.acquistoAt).toBeUndefined()
    expect(giornoAcquisto(e, 'Asia/Tokyo', 'Europe/Rome')).toBe('2026-11-21')
  })

  it('una spesa registrata a mano resta nel giorno scelto, nel fuso del viaggio', () => {
    const e = { spentAt: '2026-11-22T23:30:00.000Z' }
    expect(giornoAcquisto(e, 'Asia/Tokyo', 'Europe/Rome')).toBe('2026-11-23')
  })
})
