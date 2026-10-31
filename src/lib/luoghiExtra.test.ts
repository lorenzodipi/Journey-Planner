import { describe, expect, it } from 'vitest'
import type { Place, Trip } from '../types'
import { categorieUnite, possibiliDoppioni, prenotazioniDelLuogo, testoDoppione, visiteDelLuogo } from './luoghiExtra'

const pl = (id: string, name: string, lat: number | null, lng: number | null) => ({ id, name, lat, lng }) as Place
describe('luoghi (#61)', () => {
  it('trova i doppioni per nome e distanza', () => {
    const l = [pl('a', 'Fushimi Inari', 34.9671, 135.7727), pl('b', 'Gion', 35.0037, 135.7788), pl('c', 'Fushimi Inari lontano', 35.5, 135.7)]
    const r = possibiliDoppioni(l, { name: 'Fushimi Inari Taisha', lat: 34.9674, lng: 135.7729 })
    expect(r.map((x) => x.place.id)).toEqual(['a'])
    expect(testoDoppione('Fushimi Inari Taisha', r[0])).toMatch(/^«Fushimi Inari Taisha» somiglia a «Fushimi Inari», a \d+ m$/)
  })
  it('non segnala se stesso né nomi diversi', () => {
    expect(possibiliDoppioni([pl('a', 'Gion', null, null)], { id: 'a', name: 'Gion', lat: null, lng: null })).toEqual([])
    expect(possibiliDoppioni([pl('a', 'Gion', null, null)], { name: 'Osaka', lat: null, lng: null })).toEqual([])
  })
  it('unisce le categorie senza doppi', () => {
    expect(categorieUnite(['Tempio', 'Cibo'], ['tempio ', 'Onsen'])).toEqual(['Tempio', 'Cibo', 'Onsen'])
  })
  it('elenca visite (anche lo stesso giorno) e prenotazioni del luogo', () => {
    const trip = { days: [{ id: 'd1', date: '2026-11-22', city: 'Kyoto', items: [{ id: 'i1', placeId: 'p', title: 'Gion', time: '10:00' }, { id: 'i2', placeId: 'p', title: 'Gion di sera', time: '20:00' }] }],
      bookings: [{ id: 'b1', title: 'Cena', place: 'altro' }, { id: 'b2', title: 'Tè', place: 'GION' }], bookingLinks: [{ bookingId: 'b1', itemId: 'i2' }] } as unknown as Trip
    expect(visiteDelLuogo(trip, 'p').map((v) => v.itemId)).toEqual(['i1', 'i2'])
    expect(prenotazioniDelLuogo(trip, { id: 'p', name: 'Gion' }).map((b) => b.id)).toEqual(['b1', 'b2'])
  })
})
