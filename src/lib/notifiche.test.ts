import { describe, expect, it } from 'vitest'
import * as n from './notifiche'

const trip = (o: object = {}) => ({ id: 't', timezone: 'Asia/Tokyo', baseCurrency: 'EUR', days: [{ id: 'd1', date: '2026-11-22', items: [{ id: 'i1', time: '09:00', title: 'Fushimi Inari' }, { id: 'i2', time: '12:00', title: 'Fatta', done: true }, { id: 'i3', title: 'Senza orario' }] }], checklist: [], ...o }) as never

describe('notifiche', () => {
  it('istante locale nel fuso del viaggio', () => {
    expect(n.istanteLocale('2026-11-22', '09:00', 'Asia/Tokyo').toISOString()).toBe('2026-11-22T00:00:00.000Z')
    expect(n.istanteLocale('2026-07-01', '12:00', 'Europe/Rome').toISOString()).toBe('2026-07-01T10:00:00.000Z')
  })
  it('prossima tappa: 30 minuti prima, solo con orario e non fatte', () => {
    const a = n.avvisiTappe(trip(), new Date('2026-11-21T00:00:00Z'))
    expect(a).toHaveLength(1)
    expect(a[0].at.toISOString()).toBe('2026-11-21T23:30:00.000Z')
    expect(a[0].title).toBe('Tra 30 min: Fushimi Inari')
    expect(a[0].route).toBe('/giorni/d1?tappa=i1')
    expect(n.avvisiTappe(trip(), new Date('2026-11-21T23:45:00Z'))).toHaveLength(0)
  })
  it('id stabili', () => {
    expect(n.idStabile('a')).toBe(n.idStabile('a'))
    expect(n.idStabile('a')).not.toBe(n.idStabile('b'))
  })
  it('checklist: una settimana prima, solo mie e non fatte', () => {
    const t = trip({ checklist: [{ id: 'c1', text: 'eSIM', dueDate: '2026-11-22' }, { id: 'c2', text: 'Fatta', dueDate: '2026-11-22', done: true }, { id: 'c3', text: 'Di altri', dueDate: '2026-11-22', travelerId: 'x' }] })
    const a = n.avvisiChecklist(t, new Date('2026-11-01T00:00:00Z'), 'me')
    expect(a).toHaveLength(1)
    expect(a[0].at.toISOString()).toBe('2026-11-15T00:00:00.000Z')
  })
  it('pioggia: un\'ora prima', () => {
    const ore = [{ date: '2026-11-22', h: 14, t: 10, code: 1, rain: 10 }, { date: '2026-11-22', h: 16, t: 10, code: 61, rain: 80, mm: 1 }] as never
    const a = n.avvisoPioggiaDelGiorno(ore, 'Kyoto', new Date('2026-11-22T03:00:00Z'), 'Asia/Tokyo')
    expect(a?.title).toBe('Pioggia dalle 16:00 a Kyoto')
    expect(a?.at.toISOString()).toBe('2026-11-22T06:00:00.000Z')
    expect(n.avvisoPioggiaDelGiorno([{ date: '2026-11-22', h: 14, t: 10, code: 1, rain: 0 }] as never, 'Kyoto', new Date(), 'Asia/Tokyo')).toBeNull()
  })
  it('budget: 80% poi 100%, una volta sola', () => {
    const t = { id: 't', baseCurrency: 'EUR' }
    const now = new Date()
    expect(n.avvisoBudget(t, 3900, 5000, 0, now).avviso).toBeNull()
    expect(n.avvisoBudget(t, 4000, 5000, 0, now).avviso?.title).toBe('Sei all’80% del budget')
    expect(n.avvisoBudget(t, 4100, 5000, 80, now).avviso).toBeNull()
    expect(n.avvisoBudget(t, 5000, 5000, 80, now).avviso?.title).toBe('Hai raggiunto il budget')
    expect(n.avvisoBudget(t, 6000, 5000, 100, now).avviso).toBeNull()
    expect(n.avvisoBudget(t, 100, 5000, 100, now).soglia).toBe(0)
  })
})

import { avvisiCheckin } from './notifiche'
describe('promemoria check-in (#58)', () => {
  const trip = {
    flights: [{ id: 'f1', title: 'MXP → KIX', checkinAt: '2026-11-20T09:00:00Z' }, { id: 'f2', title: 'Passato', checkinAt: '2026-01-01T09:00:00Z' }],
    transports: [{ id: 't1', from: 'Kyoto', to: 'Osaka', checkinAt: '2026-11-21T08:00:00Z' }, { id: 't2', from: 'A', to: 'B' }],
  } as never
  it('avvisa solo i check-in futuri, in ordine', () => {
    const r = avvisiCheckin(trip, new Date('2026-11-01T00:00:00Z'))
    expect(r.map((a) => a.title)).toEqual(['Check-in aperto: MXP → KIX', 'Check-in aperto: Kyoto → Osaka'])
  })
  it('non avvisa oltre i 30 giorni', () => {
    expect(avvisiCheckin(trip, new Date('2026-10-01T00:00:00Z'))).toEqual([])
  })
})
