import { describe, expect, it } from 'vitest'
import { bigliettoPersona, linkFlightradar, modoPersone, nomiCorti, postoPersona, scaloDopo, statoCheckin, passeggeriVolo } from './cartaImbarco'
import { codiceAltraTratta, codicePer } from './codici'
import { durataLunga } from './voli'
import type { FlightLeg, TicketCode } from '../types'

const leg = (over: Partial<FlightLeg> = {}): FlightLeg => ({
  id: 'l1', seq: 1, from: 'FCO', to: 'IST', departAt: '2026-11-21T10:30:00.000Z', arriveAt: '2026-11-21T13:20:00.000Z', fromTz: 'Europe/Rome', toTz: 'Europe/Istanbul', ...over,
})

describe('carta d\'imbarco', () => {
  it('sceglie come mostrare le persone', () => {
    expect(modoPersone(['Marta'])).toBe('due')
    expect(modoPersone(['Marta', 'Davide'])).toBe('due')
    expect(modoPersone(['Marta', 'Davide', 'Luca'])).toBe('tre')
    expect(modoPersone(['Margherita', 'Massimiliano', 'Luca'])).toBe('iniziali')
    expect(modoPersone(['A', 'B', 'C', 'D'])).toBe('iniziali')
  })

  it('usa il primo nome, o il nome intero se due si chiamano uguale', () => {
    expect(nomiCorti([{ id: 'a', name: 'Marta Rossi' }, { id: 'b', name: 'Davide' }])).toEqual({ a: 'Marta', b: 'Davide' })
    expect(nomiCorti([{ id: 'a', name: 'Viaggiatore 1' }, { id: 'b', name: 'Viaggiatore 2' }])).toEqual({ a: 'Viaggiatore 1', b: 'Viaggiatore 2' })
  })

  it('ricava lo stato del check-in', () => {
    const l = leg()
    expect(statoCheckin(l, true, undefined, new Date('2026-11-21T14:00:00Z')).tipo).toBe('atterrato')
    expect(statoCheckin(l, false, undefined, new Date('2026-11-21T11:00:00Z')).tipo).toBe('involo')
    expect(statoCheckin(l, true, '2026-11-20T10:30:00Z', new Date('2026-11-19T10:00:00Z')).tipo).toBe('fatto')
    expect(statoCheckin(l, false, undefined, new Date('2026-11-10T10:00:00Z'))).toEqual({ tipo: 'dafare', testo: 'Check-in da fare' })
    const prima = statoCheckin(l, false, '2026-11-20T10:30:00Z', new Date('2026-11-19T10:00:00Z'))
    expect(prima).toEqual({ tipo: 'aprira', testo: 'Check-in da ven 20', apre: 'apre alle 11:30' })
    expect(statoCheckin(l, false, '2026-11-20T10:30:00Z', new Date('2026-11-20T12:00:00Z')).tipo).toBe('dafare')
  })

  it('trova il posto di una persona', () => {
    expect(postoPersona(leg({ seatsBy: { a: '23A', b: '23B' } }), 'b')).toBe('23B')
    expect(postoPersona(leg({ seatsBy: { a: '23A' } }), 'b')).toBeUndefined()
    expect(postoPersona(leg({ seats: ' 14C ' }), 'a')).toBe('14C')
    expect(postoPersona(leg(), 'a')).toBeUndefined()
  })

  it('calcola il biglietto di una persona', () => {
    expect(bigliettoPersona({ cost: 620, scope: 'per_person' }, 2)).toBe(620)
    expect(bigliettoPersona({ cost: 1000, scope: 'total' }, 3)).toBe(333.33)
    expect(bigliettoPersona({ cost: 0, scope: 'total' }, 2)).toBeUndefined()
    expect(bigliettoPersona({ scope: 'total' }, 2)).toBeUndefined()
  })

  it('descrive lo scalo dopo una tratta, solo se ne segue un\'altra', () => {
    const legs = [leg(), leg({ id: 'l2', seq: 2, from: 'IST', to: 'HND', departAt: '2026-11-21T15:35:00.000Z', arriveAt: '2026-11-22T04:05:00.000Z', fromTz: 'Europe/Istanbul', toTz: 'Asia/Tokyo' })]
    expect(scaloDopo({ legs }, 0, durataLunga)).toEqual({ titolo: 'Poi scalo a Istanbul: 2 h 15', testo: 'Atterri alle 16:20 e riparti alle 18:35.' })
    expect(scaloDopo({ legs }, 1, durataLunga)).toBeNull()
  })

  it('costruisce il link a Flightradar24 dal numero del volo', () => {
    expect(linkFlightradar('CA950')).toBe('https://www.flightradar24.com/data/flights/ca950')
    expect(linkFlightradar(' AU 784 ')).toBe('https://www.flightradar24.com/data/flights/au784')
    expect(linkFlightradar('U2-1234')).toBe('https://www.flightradar24.com/data/flights/u21234')
    expect(linkFlightradar('')).toBeUndefined()
    expect(linkFlightradar('volo di andata')).toBeUndefined()
  })

  it('sceglie il codice della tratta, poi quello che vale per tutte', () => {
    const c = (id: string, travelerId?: string, l?: number): TicketCode => ({ id, kind: 'flight', refId: 'f', filePath: `${id}.png`, travelerId, ...(l ? { leg: l } : {}) })
    const codes = [c('m1', 'm', 1), c('mtutte', 'm'), c('d1', 'd', 1), c('tutti2', undefined, 2)]
    expect(codicePer(codes, 'm', 1)?.id).toBe('m1')
    expect(codicePer(codes, 'm', 2)?.id).toBe('mtutte')
    expect(codicePer(codes, 'd', 2)?.id).toBe('tutti2')
    expect(codicePer(codes, 'd', 3)).toBeUndefined()
    expect(codicePer(codes, 'm')?.id).toBe('m1')
    expect(codiceAltraTratta([c('d1', 'd', 1)], 'd', 2)?.id).toBe('d1')
    expect(codiceAltraTratta([c('d1', 'd', 1)], 'm', 2)).toBeUndefined()
  })
})

describe('passeggeriVolo', () => {
  const viaggiatori = [{ id: 'a' }, { id: 'b' }]
  it('usa i passeggeri scelti, anche se il costo è di uno solo', () => {
    expect(passeggeriVolo({ passengerIds: ['a', 'b'], forTravelers: ['a'] }, viaggiatori)).toEqual(['a', 'b'])
  })
  it('nei voli vecchi (passeggeri non scelti) valgono quelli del costo', () => {
    expect(passeggeriVolo({ forTravelers: ['a'] }, viaggiatori)).toEqual(['a'])
  })
  it('vuoto o sconosciuto = tutti', () => {
    expect(passeggeriVolo({ passengerIds: [] }, viaggiatori)).toEqual(['a', 'b'])
    expect(passeggeriVolo({}, viaggiatori)).toEqual(['a', 'b'])
    expect(passeggeriVolo({ passengerIds: ['x'] }, viaggiatori)).toEqual(['a', 'b'])
  })
})
