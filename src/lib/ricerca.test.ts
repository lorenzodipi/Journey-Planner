import { describe, expect, it } from 'vitest'
import type { Trip } from '../types'
import { cercaNelViaggio } from './ricerca'

const trip = {
  places: [{ id: 'p1', name: 'Fushimi Inari', city: 'Kyoto', category: 'Tempio' }],
  days: [{ id: 'd1', city: 'Kyoto', items: [{ id: 'i1', title: 'Caffè Gion' }] }],
  bookings: [{ id: 'b1', title: 'Cena Kyoto' }],
  stays: [{ id: 's1', name: 'Hotel Gion', city: 'Kyoto' }],
  transports: [{ id: 't1', from: 'Osaka', to: 'Kyoto' }],
  flights: [{ id: 'f1', title: 'Roma-Tokyo', airline: 'ANA' }],
} as unknown as Trip
describe('ricerca (#63)', () => {
  it('cerca in tutte le sezioni, senza accenti', () => {
    const r = cercaNelViaggio(trip, 'cafFE')
    expect(r.map((x) => x.gruppo)).toEqual(['Tappe'])
    expect(cercaNelViaggio(trip, 'kyoto').map((x) => x.gruppo)).toEqual(['Luoghi', 'Prenotazioni', 'Alloggi', 'Trasporti'])
    expect(cercaNelViaggio(trip, 'gion').map((x) => x.to)).toEqual(['/giorni/d1', '/altro/alloggi'])
  })
  it('ignora ricerche troppo corte', () => expect(cercaNelViaggio(trip, 'k')).toEqual([]))
})
