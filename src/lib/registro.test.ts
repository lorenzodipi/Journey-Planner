import { describe, expect, it } from 'vitest'
import type { Trip } from '../types'
import { dipendenze, quandoModifica, rigaRegistro, ultimaModifica } from './registro'

const trip = {
  travelers: [{ id: 'g', name: 'Gaia Rossi', userId: 'u-g' }, { id: 'l', name: 'Lorenzo', userId: 'u-l' }],
  activity: [
    { id: 1, table: 'day_items', rowId: 'i1', action: 'insert', actor: 'u-l', at: '2026-11-22T08:00:00Z', title: 'Cena' },
    { id: 2, table: 'day_items', rowId: 'i1', action: 'update', actor: 'u-g', at: '2026-11-23T01:42:00Z', title: 'Cena' },
  ],
  days: [{ id: 'd1', items: [{ id: 'i1', placeId: 'p1' }] }, { id: 'd2', items: [{ id: 'i2', placeId: 'p1' }] }],
  stays: [{ id: 's1', checkIn: '2026-11-22', checkOut: '2026-11-24' }],
  bookings: [{ id: 'b1', filePath: 'x.pdf' }], bookingLinks: [{ bookingId: 'b1', itemId: 'i1' }], expenses: [],
  documents: [{ id: 'doc', links: [{ kind: 'stay', refId: 's1' }] }],
} as unknown as Trip
const now = new Date('2026-11-23T05:00:00Z')

describe('registro delle modifiche (#60)', () => {
  it('mostra autore e momento dell\'ultima modifica', () => {
    expect(ultimaModifica(trip, 'day_items', 'i1', now, 'Asia/Tokyo')).toBe('Modificato da Gaia · oggi 10:42')
    expect(ultimaModifica(trip, 'day_items', 'x', now, 'Asia/Tokyo')).toBeNull()
  })
  it('chiama «Tu» chi sono io e «ieri» il giorno prima', () => {
    expect(rigaRegistro(trip, trip.activity![0], 'u-l')).toBe('Tu ha aggiunto la tappa «Cena»')
    expect(quandoModifica('2026-11-22T08:00:00Z', now, 'Asia/Tokyo')).toBe('ieri 17:00')
  })
  it('elenca le dipendenze prima di eliminare', () => {
    expect(dipendenze(trip, 'alloggio', 's1')).toEqual(['2 notti di copertura', '1 documento'])
    expect(dipendenze(trip, 'luogo', 'p1')).toEqual(['2 tappe in 2 giorni'])
    expect(dipendenze(trip, 'prenotazione', 'b1')).toEqual(['1 tappa collegata', 'un file allegato'])
    expect(dipendenze(trip, 'tappa', 'i1')).toEqual(['1 prenotazione collegata'])
  })
})
