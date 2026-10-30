import { describe, expect, it } from 'vitest'
import { fase, riepilogo, riepilogoPercorso, stimaSpostamento, statusOf, rigaOrario } from './tappa'
import { formatOpening, openingFor, type OpeningSpec } from './opening'
import { groupDays } from './dayGroups'
import type { Day, DayItem } from '../types'

const it0 = (o: Partial<DayItem>): DayItem => ({ id: o.id ?? 'x', title: 'T', kind: 'visit', ...o })

describe('stati della tappa', () => {
  it('ricava lo stato da done per le tappe vecchie', () => {
    expect(statusOf({ done: true })).toBe('done')
    expect(statusOf({})).toBe('todo')
    expect(statusOf({ status: 'late', done: false })).toBe('late')
  })
  it('riepilogo: chiuse, saltate e prossima', () => {
    const items = [it0({ id: 'a', time: '08:30', status: 'done' }), it0({ id: 'b', time: '09:30', status: 'skipped' }), it0({ id: 'c', time: '12:45' }), it0({ id: 'd', time: '15:30' })]
    const r = riepilogo(items, { isToday: true, nowMin: 13 * 60 })
    expect(r.line).toBe('2 di 4 tappe chiuse · 1 saltata')
    expect(r.next).toBe('15:30')
  })
  it('fase «now» solo dentro l\'intervallo di oggi', () => {
    const item = it0({ time: '12:45', durationMinutes: 75 })
    expect(fase(item, undefined, { isToday: true, isPast: false, nowMin: 13 * 60 })).toBe('now')
    expect(fase(item, undefined, { isToday: true, isPast: false, nowMin: 12 * 60 })).toBe('next')
    expect(fase(item, undefined, { isToday: false, isPast: false, nowMin: 13 * 60 })).toBe('next')
  })
  it('«Era previsto alle… / Saltata alle…»', () => {
    const r = rigaOrario(it0({ time: '09:30', status: 'skipped', statusChangedAt: '2026-11-26T00:20:00.000Z' }), undefined, { isToday: false, nowMin: 0, timeZone: 'Asia/Tokyo' })
    expect(r).toEqual({ main: 'Era previsto alle 09:30', sub: 'Saltata alle 09:20' })
  })
})

describe('spostamenti stimati', () => {
  it('a piedi sotto 1,2 km, in metro oltre', () => {
    const a = { lat: 35.0, lng: 135.76 }
    expect(stimaSpostamento(a, { lat: 35.005, lng: 135.76 }).text).toMatch(/^A piedi · \d+ min$/)
    expect(stimaSpostamento(a, { lat: 35.05, lng: 135.76 }).text).toMatch(/^In metro · \d+ min$/)
  })
  it('riepilogo del percorso', () => {
    const r = riepilogoPercorso(3, [
      { mode: 'walk', text: '', minutes: 8, meters: 600, icon: '' },
      { mode: 'metro', text: '', minutes: 9, meters: 3800, icon: '' },
    ])
    expect(r.title).toBe('3 tappe · 4,4 km')
    expect(r.sub).toBe('17 min tra metro e a piedi')
  })
})

describe('orari strutturati', () => {
  const spec = { w: { 1: [{ from: '11:30', to: '15:00' }, { from: '17:30', to: '21:00' }], 2: [{ from: '11:30', to: '15:00' }, { from: '17:30', to: '21:00' }], 4: [{ from: '11:30', to: '15:00' }, { from: '17:30', to: '21:00' }], 5: [{ from: '11:30', to: '15:00' }, { from: '17:30', to: '21:00' }], 6: [{ from: '11:30', to: '15:00' }, { from: '17:30', to: '21:00' }], 7: [{ from: '11:30', to: '15:00' }, { from: '17:30', to: '21:00' }] } } as OpeningSpec
  it('aperto, apre, chiuso oggi', () => {
    // 26/11/2026 è un giovedì, 25/11 un mercoledì
    expect(openingFor(spec, '2026-11-26', 13 * 60)?.text).toBe('Aperto fino alle 15:00')
    expect(openingFor(spec, '2026-11-26', 16 * 60)?.text).toBe('Apre alle 17:30')
    expect(openingFor(spec, '2026-11-25', 13 * 60)).toEqual({ text: 'Chiuso oggi', closed: true })
  })
  it('testo: «Gio–Mar · … · Chiuso il mercoledì»', () => {
    expect(formatOpening(spec)).toBe('Gio–Mar · 11:30–15:00 e 17:30–21:00 · Chiuso il mercoledì')
  })
})

describe('gruppi di Giorni', () => {
  const day = (id: string, date: string, city: string, items = 1): Day => ({ id, date, city, items: Array.from({ length: items }, (_, i) => it0({ id: `${id}${i}` })) })
  it('città consecutive, città che torna = gruppo nuovo, rientro', () => {
    const trip = {
      days: [day('a', '2026-11-23', 'Kyoto'), day('b', '2026-11-24', 'Kyoto'), day('c', '2026-11-25', 'Osaka'), day('d', '2026-11-26', 'Kyoto', 0), day('e', '2026-11-27', 'Kyoto', 0)],
      flights: [{ id: 'f', title: '', currency: 'EUR', scope: 'total' as const, paid: true, legs: [{ id: 'l', seq: 1, from: 'KIX', to: 'MXP', departAt: '2026-11-27T07:30:00.000Z', arriveAt: '2026-11-27T20:00:00.000Z', fromTz: 'Asia/Tokyo', toTz: 'Europe/Rome' }] }],
    }
    const g = groupDays(trip, '2026-11-24')
    expect(g.map((x) => x.title)).toEqual(['Kyoto', 'Osaka', 'Kyoto', 'Rientro'])
    expect(g[0].cells.map((c) => c.state)).toEqual(['past', 'today'])
    expect(g[2].meta).toBe('1 giorno · 26 nov · 1 libero')
  })
})
