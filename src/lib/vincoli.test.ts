import { describe, expect, it } from 'vitest'
import type { Booking, Trip } from '../types'
import { disallineamenti, oraFissa, prenotazioniFisse } from './vincoli'

const trip = {
  timezone: 'Asia/Tokyo',
  bookings: [
    { id: 'b1', type: 'restaurant', title: 'Cena', keepOffline: false, timeKind: 'fixed', validFrom: '2026-11-22T10:30:00Z' },
    { id: 'b2', type: 'activity', title: 'Museo', keepOffline: false, timeKind: 'window', validFrom: '2026-11-22T01:00:00Z' },
    { id: 'b3', type: 'restaurant', title: 'Annullata', keepOffline: false, timeKind: 'fixed', status: 'cancelled', validFrom: '2026-11-22T10:30:00Z' },
  ] as Booking[],
  bookingLinks: [{ bookingId: 'b1', itemId: 'i1' }, { bookingId: 'b2', itemId: 'i1' }, { bookingId: 'b3', itemId: 'i1' }],
} as unknown as Trip

describe('orari vincolati (#54)', () => {
  it('solo l\'ora prestabilita propone il vincolo', () => {
    expect(oraFissa(trip.bookings[0], 'Asia/Tokyo')).toBe('19:30')
    expect(oraFissa(trip.bookings[1], 'Asia/Tokyo')).toBe('')
  })
  it('ignora finestre e prenotazioni cancellate', () => {
    expect(prenotazioniFisse(trip, 'i1').map((b) => b.id)).toEqual(['b1'])
  })
  it('segnala il disallineamento solo se gli orari sono diversi', () => {
    expect(disallineamenti(trip, { id: 'i1', time: '19:00' }).map((d) => [d.oraTappa, d.oraPrenotazione])).toEqual([['19:00', '19:30']])
    expect(disallineamenti(trip, { id: 'i1', time: '19:30' })).toEqual([])
    expect(disallineamenti(trip, { id: 'i1' })).toEqual([])
  })
})
