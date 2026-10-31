import { describe, expect, it } from 'vitest'
import type { Booking, Trip } from '../types'
import { filtraArchivio, FILTRI_VUOTI, mancanti, prenotazioniDelGiorno, quando, tappeInAltroGiorno, tappePerScelta } from './prenotazioni'

const trip = {
  timezone: 'Asia/Tokyo', startDate: '2026-11-21', endDate: '2026-12-05', places: [{ id: 'p1', name: 'Gion Karyo' }],
  days: [
    { id: 'd1', date: '2026-11-22', city: 'Kyoto', items: [{ id: 'i1', title: 'Cena', time: '19:30', placeId: 'p1' }, { id: 'i2', title: 'Tempio' }] },
    { id: 'd2', date: '2026-11-23', city: 'Osaka', items: [{ id: 'i3', title: 'Acquario' }] },
  ],
  bookings: [] as Booking[],
  bookingLinks: [{ bookingId: 'b1', itemId: 'i1' }],
} as unknown as Trip
const b = (id: string, extra: Partial<Booking> = {}): Booking => ({ id, type: 'restaurant', title: id, keepOffline: false, ...extra })

describe('prenotazioni e tappe (#53)', () => {
  it('propone prima le tappe dello stesso giorno e luogo', () => {
    const s = tappePerScelta(trip, '2026-11-22', 'Gion')
    expect(s[0].itemId).toBe('i1') // stesso luogo
    expect(s.find((x) => x.itemId === 'i2')?.stessoGiorno).toBe(true)
  })
  it('segnala la tappa in un altro giorno dopo il cambio di data', () => {
    expect(tappeInAltroGiorno(trip, 'b1', '2026-11-23').map((t) => t.itemId)).toEqual(['i1'])
    expect(tappeInAltroGiorno(trip, 'b1', '2026-11-22')).toEqual([])
    expect(tappeInAltroGiorno(trip, 'b1', '')).toEqual([])
  })
  it('senza data = da pianificare, fuori periodo se oltre le date del viaggio', () => {
    expect(quando(b('x'), trip)).toBe('da-pianificare')
    expect(quando(b('x', { validFrom: '2026-12-20T03:00:00Z' }), trip)).toBe('fuori-periodo')
    expect(quando(b('x', { validFrom: '2026-11-25T03:00:00Z' }), trip)).toBe('ok')
  })
  it('filtra per testo, stato e allegati', () => {
    const l = [b('a', { provider: 'Gion', filePath: 'f' }), b('c', { status: 'cancelled' })]
    expect(filtraArchivio(l, { ...FILTRI_VUOTI, q: 'gion' }).map((x) => x.id)).toEqual(['a'])
    expect(filtraArchivio(l, { ...FILTRI_VUOTI, stato: 'cancelled' }).map((x) => x.id)).toEqual(['c'])
    expect(filtraArchivio(l, { ...FILTRI_VUOTI, allegati: 'senza' }).map((x) => x.id)).toEqual(['c'])
  })
  it('segnala i dati mancanti', () => {
    expect(mancanti(trip, b('z'))).toEqual(['Senza data', 'Senza tappa', 'Senza file'])
  })
  it('mostra nel giorno le prenotazioni della data e quelle della tappa, senza doppioni', () => {
    const t2 = { ...trip, bookings: [b('b1', { validFrom: '2026-11-22T10:30:00Z' }), b('b9', { validFrom: '2026-11-22T03:00:00Z' }), b('b8', { validFrom: '2026-11-25T03:00:00Z' })] } as Trip
    const r = prenotazioniDelGiorno(t2, t2.days[0])
    expect(r.map((x) => [x.booking.id, x.tappa?.id])).toEqual([['b9', undefined], ['b1', 'i1']])
  })
})
