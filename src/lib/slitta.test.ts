import { describe, expect, it } from 'vitest'
import { annullaSlitta, orariSlitta, pianoSlitta, puoSlittare, scelteSlitta } from './slitta'
import type { DayItem, Trip } from '../types'

const it0 = (x: Partial<DayItem> & { id: string }): DayItem => ({ title: x.id, kind: 'visit', ...x }) as DayItem
const trip = { bookings: [], days: [], timezone: 'Asia/Tokyo' } as unknown as Trip
const h = (hh: number, mm = 0) => hh * 60 + mm
const oggi = (nowMin: number) => ({ isToday: true, nowMin })

describe('«Slitta» al posto di «In ritardo»', () => {
  const tempio = it0({ id: 'tempio', time: '08:30', durationMinutes: 60 })
  it('si offre solo oggi, da fare, con orario, dopo 15 minuti e se l\'orario non è fissato', () => {
    expect(puoSlittare(trip, tempio, oggi(h(8, 45)))).toBe(false)
    expect(puoSlittare(trip, tempio, oggi(h(8, 46)))).toBe(true)
    expect(puoSlittare(trip, tempio, { isToday: false, nowMin: h(10) })).toBe(false)
    expect(puoSlittare(trip, { ...tempio, status: 'done' }, oggi(h(10)))).toBe(false)
    expect(puoSlittare(trip, { ...tempio, status: 'late' }, oggi(h(10)))).toBe(true)
    expect(puoSlittare(trip, it0({ id: 'x' }), oggi(h(10)))).toBe(false)
    expect(puoSlittare(trip, { ...tempio, timeLock: 'locked' }, oggi(h(10)))).toBe(false)
  })

  it('le scelte: da adesso e +15, +30, +1 h che portano la tappa dopo adesso; niente che passi la mezzanotte', () => {
    expect(scelteSlitta(tempio, h(8, 46))).toEqual([{ minuti: 16, da: 'adesso' }, { minuti: 30, da: 'piu' }, { minuti: 60, da: 'piu' }])
    expect(scelteSlitta(tempio, h(8, 55))).toEqual([{ minuti: 25, da: 'adesso' }, { minuti: 30, da: 'piu' }, { minuti: 60, da: 'piu' }])
    // in ritardo di più di un'ora: resta «Da adesso»
    expect(scelteSlitta(tempio, h(9, 45))).toEqual([{ minuti: 75, da: 'adesso' }])
    expect(scelteSlitta(it0({ id: 'tardi', time: '23:20' }), h(23, 40)).map((s) => s.minuti)).toEqual([20, 30])
    expect(scelteSlitta(it0({ id: 'fine', time: '22:00', endTime: '23:30' }), h(22, 20)).map((s) => s.minuti)).toEqual([20])
  })

  it('anche le tappe dopo: si spostano quelle da fare con orario; vincolate e prenotate restano; le altre non si toccano', () => {
    const items = [
      it0({ id: 'prima', time: '07:00', status: 'done' }),
      tempio,
      it0({ id: 'pranzo', time: '12:30', timeLock: 'locked' }),
      it0({ id: 'senza' }),
      it0({ id: 'fatta', time: '13:00', status: 'done' }),
      it0({ id: 'parco', time: '15:00', endTime: '17:00' }),
    ]
    const p = pianoSlitta(trip, items, tempio, 30, true)
    expect(p.cambi.map((c) => [c.id, c.prima, c.dopo])).toEqual([['tempio', '08:30', '09:00'], ['parco', '15:00', '15:30']])
    expect(p.cambi[1].fine).toEqual({ prima: '17:00', dopo: '17:30' })
    expect(p.ferme.map((f) => f.id)).toEqual(['pranzo'])
    // solo questa tappa
    expect(pianoSlitta(trip, items, tempio, 30, false).cambi.map((c) => c.id)).toEqual(['tempio'])
  })

  it('una tappa legata a una prenotazione a ora fissa resta dov\'è', () => {
    const cena = it0({ id: 'cena', time: '19:00' })
    const conPrenotazione = { ...trip, bookings: [{ id: 'b', type: 'restaurant', title: 'Cena', validFrom: '2026-11-23T10:00:00Z', timeKind: 'fixed' }], bookingLinks: [{ bookingId: 'b', itemId: 'cena' }] } as unknown as Trip
    const p = pianoSlitta(conPrenotazione, [tempio, cena], tempio, 60, true)
    expect(p.cambi.map((c) => c.id)).toEqual(['tempio'])
    expect(p.ferme.map((f) => f.id)).toEqual(['cena'])
    // la tappa prenotata non offre «Slitta»
    expect(puoSlittare(conPrenotazione, { ...cena, time: '08:00' }, oggi(h(9)))).toBe(false)
    // con la prenotazione «a orario libero» invece si sposta
    const libera = { ...conPrenotazione, bookings: [{ ...conPrenotazione.bookings[0], timeKind: 'flexible' }] } as unknown as Trip
    expect(pianoSlitta(libera, [tempio, cena], tempio, 60, true).cambi.map((c) => c.id)).toEqual(['tempio', 'cena'])
  })

  it('«Annulla» rimette gli orari di prima', () => {
    const items = [tempio, it0({ id: 'parco', time: '15:00', endTime: '17:00' })]
    const p = pianoSlitta(trip, items, tempio, 60, true)
    expect(orariSlitta(p)).toEqual([{ id: 'tempio', start: '09:30', end: null }, { id: 'parco', start: '16:00', end: '18:00' }])
    expect(annullaSlitta(p)).toEqual([{ id: 'tempio', start: '08:30', end: null }, { id: 'parco', start: '15:00', end: '17:00' }])
  })
})
