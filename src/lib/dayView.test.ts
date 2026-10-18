import { describe, expect, it } from 'vitest'
import type { Booking, ChecklistItem, Expense, Stay, Transport } from '../types'
import { dayBookings, dayChecklist, dayExpenses, dayMovements, dayStays } from './dayView'

const day = { id: 'd2', date: '2026-11-23' }
const stay = (id: string, checkIn: string, checkOut: string): Stay => ({
  id, name: id, city: 'Tokyo', checkIn, checkOut, currency: 'JPY', breakfast: false, dinner: false, kitchen: false, booked: true, paid: true,
})
const tr = (over: Partial<Transport>): Transport => ({
  id: 't', from: 'Tokyo', to: 'Kyoto', mode: 'train', currency: 'JPY', scope: 'per_person', bought: false, ...over,
})

describe('dayStays', () => {
  const stays = [stay('A', '2026-11-22', '2026-11-23'), stay('B', '2026-11-23', '2026-11-26')]
  it('notte, check-in e check-out', () => {
    const r = dayStays(stays, '2026-11-23')
    expect(r.night?.name).toBe('B')
    expect(r.checkIn.map((s) => s.name)).toEqual(['B'])
    expect(r.checkOut.map((s) => s.name)).toEqual(['A'])
  })
  it('l\'ultimo giorno non si dorme più lì', () => {
    expect(dayStays(stays, '2026-11-26').night).toBeUndefined()
    expect(dayStays(stays, '2026-11-26').checkOut.map((s) => s.name)).toEqual(['B'])
  })
})

describe('dayMovements', () => {
  const trip = { timezone: 'Asia/Tokyo', flights: [], stays: [], transports: [] as Transport[] }
  it('treno con orario: partenza, arrivo, biglietto', () => {
    const ev = dayMovements(
      { ...trip, transports: [tr({ dayId: 'd2', departAt: '2026-11-23T00:00:00Z', arriveAt: '2026-11-23T02:30:00Z', bought: true })] },
      day,
    )
    expect(ev).toHaveLength(1)
    expect(ev[0]).toMatchObject({ kind: 'transport', time: '09:00', endTime: '11:30', mode: 'train', flag: { ok: true } })
  })
  it('senza orario va in fondo, con «Orario da definire»', () => {
    const ev = dayMovements(
      { ...trip, transports: [tr({ id: 'a', dayId: 'd2', departAt: '2026-11-23T00:00:00Z' }), tr({ id: 'b', dayId: 'd2', from: 'Nara', to: 'Osaka' })] },
      day,
    )
    expect(ev.map((e) => e.title)).toEqual(['Tokyo → Kyoto', 'Nara → Osaka'])
    expect(ev[1]).toMatchObject({ time: '', sub: 'Orario da definire', flag: { ok: false } })
  })
  it('non include i trasporti di altri giorni', () => {
    expect(dayMovements({ ...trip, transports: [tr({ dayId: 'd9' })] }, day)).toEqual([])
  })
})

describe('dayExpenses', () => {
  const e = (id: string, spentAt: string, dayId?: string): Expense => ({ id, label: id, amount: 1, currency: 'EUR', spentAt, dayId, shares: [] })
  it('per giorno collegato o per data nel fuso del viaggio', () => {
    const trip = {
      timezone: 'Asia/Tokyo',
      expenses: [
        e('collegata', '2026-11-30T03:00:00Z', 'd2'), // altro giorno ma collegata a d2
        e('per-data', '2026-11-22T16:00:00Z'), // 23/11 01:00 a Tokyo
        e('altro', '2026-11-24T03:00:00Z'),
        e('altro-collegata', '2026-11-23T03:00:00Z', 'd3'),
      ],
    }
    expect(dayExpenses(trip, day).map((x) => x.id)).toEqual(['per-data', 'collegata'])
  })
})

describe('dayBookings', () => {
  const b = (id: string, validFrom?: string, validTo?: string): Booking => ({ id, type: 'train', title: id, keepOffline: false, validFrom, validTo })
  it('valide nel giorno (intervallo o solo inizio)', () => {
    const trip = {
      timezone: 'Asia/Tokyo',
      bookings: [
        b('intervallo', '2026-11-21T15:00:00Z', '2026-11-25T14:59:00Z'),
        b('solo-inizio', '2026-11-23T00:00:00Z'),
        b('finito', '2026-11-20T00:00:00Z', '2026-11-22T00:00:00Z'),
        b('senza-date'),
      ],
    }
    expect(dayBookings(trip, day).map((x) => x.id)).toEqual(['intervallo', 'solo-inizio'])
  })
})

describe('dayChecklist', () => {
  const c = (id: string, dueDate: string | undefined, done: boolean, position: number): ChecklistItem => ({ id, kind: 'todo', text: id, done, dueDate, position })
  it('scadenza in quel giorno, prima quelle da fare', () => {
    const list = [c('fatta', '2026-11-23', true, 1), c('da-fare', '2026-11-23', false, 2), c('altro-giorno', '2026-11-24', false, 3), c('senza', undefined, false, 4)]
    expect(dayChecklist(list, day).map((x) => x.id)).toEqual(['da-fare', 'fatta'])
  })
})

describe('movimenti: da dove nascono', () => {
  it('ogni evento sa quale volo, alloggio o trasporto lo ha generato (per aprirlo e modificarlo)', () => {
    const trip = {
      timezone: 'Asia/Tokyo',
      stays: [{ id: 's1', name: 'Hotel', city: '', checkIn: '2026-11-23', checkOut: '2026-11-25', currency: 'JPY', breakfast: false, dinner: false, kitchen: false, booked: true, paid: false }],
      flights: [],
      transports: [
        { id: 't1', from: 'A', to: 'B', mode: 'train' as const, currency: 'JPY', scope: 'per_person' as const, bought: false, dayId: 'd2', departAt: '2026-11-23T01:00:00Z' },
        { id: 't2', from: 'C', to: 'D', mode: 'bus' as const, currency: 'JPY', scope: 'per_person' as const, bought: false, dayId: 'd2' },
      ],
    }
    const refs = dayMovements(trip, day).map((e) => e.ref)
    expect(refs).toEqual(expect.arrayContaining([{ type: 'stay', id: 's1' }, { type: 'transport', id: 't1' }, { type: 'transport', id: 't2' }]))
    expect(refs.every(Boolean)).toBe(true)
  })
})
