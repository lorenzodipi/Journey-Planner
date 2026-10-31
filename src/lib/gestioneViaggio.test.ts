import { describe, expect, it } from 'vitest'
import type { Trip } from '../types'
import { cittaPreviste, doppi, impattoDate, spostaData } from './gestioneViaggio'

const trip = {
  timezone: 'Asia/Tokyo',
  days: [{ date: '2026-11-22', city: 'Tokyo', items: [{ id: 'a' }] }, { date: '2026-11-23', city: 'Tokyo', items: [] }, { date: '2026-11-24', city: 'Kyoto', items: [{ id: 'b' }, { id: 'c' }] }, { date: '2026-11-25', city: 'Tokyo', items: [] }],
  stays: [{ checkIn: '2026-11-22', checkOut: '2026-11-25' }], flights: [], transports: [], bookings: [],
} as unknown as Trip

describe('gestione viaggio (#59)', () => {
  it('riepiloga cosa si perde cambiando le date', () => {
    const r = impattoDate(trip, '2026-11-22', '2026-11-23')
    expect(r[0]).toContain('1 giorno con tappe verrà tolto')
    expect(r.some((x) => x.includes('1 giorno vuoto'))).toBe(true)
    expect(r.some((x) => x.includes('1 alloggio fuori'))).toBe(true)
    expect(impattoDate(trip, '2026-11-22', '2026-11-30').length).toBe(0)
  })
  it('elenca le città in ordine senza ripetizioni consecutive', () => {
    expect(cittaPreviste(trip)).toEqual(['Tokyo', 'Kyoto', 'Tokyo'])
  })
  it('sposta le date e trova i doppi', () => {
    expect(spostaData('2026-11-30', 2)).toBe('2026-12-02')
    expect(doppi(['a@x.it', 'A@x.it', 'b@x.it'])).toEqual(['a@x.it'])
  })
})
