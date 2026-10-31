import { describe, expect, it } from 'vitest'
import { destinationClock, eventsForDay, formatDiffHours, homeCountry, homeTime, nextItem, tripToday } from './today'
import type { Day, Trip } from '../types'

const items = (list: [string, string?][]): Day['items'] =>
  list.map(([time, endTime], i) => ({ id: String(i), time, endTime, title: `T${i}`, kind: 'visit' as const }))

describe('prossima tappa', () => {
  const day = { items: items([['09:00'], ['12:30', '13:30'], ['16:00']]) }

  it('prima della prima tappa', () => expect(nextItem(day, 8 * 60)).toMatchObject({ status: 'next', item: { title: 'T0' } }))
  it('durante una tappa', () => expect(nextItem(day, 13 * 60)).toMatchObject({ status: 'now', item: { title: 'T1' } }))
  it('senza fine: vale un\'ora', () => expect(nextItem(day, 9 * 60 + 30)).toMatchObject({ status: 'now', item: { title: 'T0' } }))
  it('tra due tappe', () => expect(nextItem(day, 14 * 60)).toMatchObject({ status: 'next', item: { title: 'T2' } }))
  it('dopo l\'ultima: nessuna', () => expect(nextItem(day, 18 * 60)).toBeNull())
  it('salta le tappe già fatte', () => {
    const d = { items: items([['09:00'], ['12:00']]).map((i, n) => (n === 0 ? { ...i, done: true } : i)) }
    expect(nextItem(d, 7 * 60)?.item.title).toBe('T1')
  })
})

describe('eventi del giorno', () => {
  const trip = {
    timezone: 'Asia/Tokyo',
    flights: [
      {
        id: 'f', title: 'Andata', currency: 'EUR', scope: 'per_person', paid: true,
        legs: [
          { id: 'l1', seq: 1, flightNumber: 'CA950', from: 'MXP', to: 'PEK', departAt: '2026-11-21T11:30:00.000Z', arriveAt: '2026-11-21T21:35:00.000Z', fromTz: 'Europe/Rome', toTz: 'Asia/Shanghai' },
          { id: 'l2', seq: 2, flightNumber: 'CA167', from: 'PEK', to: 'HND', departAt: '2026-11-22T03:45:00.000Z', arriveAt: '2026-11-22T07:20:00.000Z', fromTz: 'Asia/Shanghai', toTz: 'Asia/Tokyo' },
        ],
      },
    ],
    stays: [{ id: 's', name: 'Hotel Asakusa', city: 'Tokyo', checkIn: '2026-11-22', checkOut: '2026-11-26', checkInInfo: '15:00–22:00', currency: 'JPY', breakfast: false, dinner: false, kitchen: false, booked: true, paid: true }],
    transports: [{ id: 't', from: 'Tokyo', to: 'Nikko', mode: 'train', departAt: '2026-11-26T00:30:00.000Z', currency: 'JPY', scope: 'per_person', bought: true, refCode: 'X1' }],
  } as unknown as Trip

  it('22/11: arrivo a Pechino 05:35, ripartenza 11:45, arrivo a Tokyo 16:20, check-in', () => {
    const ev = eventsForDay(trip, '2026-11-22')
    expect(ev.map((e) => `${e.time} ${e.title}`)).toEqual(['05:35 Arrivo a PEK', '11:45 Volo da PEK', '16:20 Arrivo a HND', ' Check-in · Hotel Asakusa'])
    expect(ev[3].sub).toBe('15:00–22:00')
  })

  it('21/11: partenza da Milano alle 12:30', () => {
    expect(eventsForDay(trip, '2026-11-21').map((e) => `${e.time} ${e.title}`)).toEqual(['12:30 Volo da MXP'])
  })

  it('26/11: check-out e treno (09:30 a Tokyo)', () => {
    expect(eventsForDay(trip, '2026-11-26').map((e) => `${e.time} ${e.title}`)).toEqual([' Check-out · Hotel Asakusa', '09:30 Tokyo → Nikko'])
  })

  it('giorno senza eventi', () => expect(eventsForDay(trip, '2026-12-01')).toEqual([]))
})

describe('ora a destinazione', () => {
  it('Tokyo rispetto a Roma a novembre: +8 h', () => {
    const c = destinationClock('Asia/Tokyo', 'Europe/Rome', new Date('2026-11-21T10:00:00Z'))
    expect(c).toEqual({ time: '19:00', diffHours: 8 })
    expect(formatDiffHours(c.diffHours)).toBe('+8 h')
  })
  it('ora e paese di casa', () => {
    expect(homeTime('Europe/Rome', new Date('2026-11-21T10:05:00Z'))).toBe('11:05')
    // mezzanotte resta «00:00», non «24:00»
    expect(homeTime('Europe/Rome', new Date('2026-11-21T23:00:00Z'))).toBe('00:00')
    expect(homeCountry('it-IT')).toBe('Italia')
    expect(homeCountry('en-GB')).toBe('Regno Unito')
    expect(homeCountry('it')).toBe('A casa')
    expect(homeCountry(undefined)).toBe('A casa')
  })
  it('stesso fuso: scarto zero', () => expect(destinationClock('Europe/Rome', 'Europe/Rome').diffHours).toBe(0))
  it('giorno del viaggio nel fuso della destinazione', () => {
    expect(tripToday({ timezone: 'Asia/Tokyo' }, new Date('2026-11-21T20:00:00Z'))).toBe('2026-11-22')
  })
})

describe('trasporti su più giorni (#58)', () => {
  it('un treno notturno compare nel giorno di partenza e in quello di arrivo', () => {
    const trip = { timezone: 'Asia/Tokyo', flights: [], stays: [], transports: [{ id: 't1', from: 'Tokyo', to: 'Osaka', mode: 'train', bought: true, departAt: '2026-11-22T13:00:00Z', arriveAt: '2026-11-22T21:00:00Z', currency: 'JPY', scope: 'total' }] } as never
    expect(eventsForDay(trip, '2026-11-22').map((e) => e.title)).toEqual(['Tokyo → Osaka'])
    expect(eventsForDay(trip, '2026-11-23').map((e) => e.title)).toEqual(['Arrivo a Osaka'])
  })
})
