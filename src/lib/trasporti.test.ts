import { describe, expect, it } from 'vitest'
import type { Transport } from '../types'
import { durataTrasporto, fermate, nomeTrasporto, perData, prezzoDi, riepilogoTrasporti } from './trasporti'

const t = (o: Partial<Transport>): Transport => ({ id: 'x', from: 'Kyoto', to: 'Osaka', mode: 'train', currency: 'EUR', scope: 'per_person', bought: false, ...o })

describe('trasporti', () => {
  it('nome e fermate', () => {
    expect(nomeTrasporto(t({ title: 'Haruka 33' }))).toBe('Haruka 33')
    expect(nomeTrasporto(t({}))).toBe('Treno Kyoto → Osaka')
    expect([fermate(t({})), fermate(t({ stops: 0 })), fermate(t({ stops: 1 })), fermate(t({ stops: 3 }))]).toEqual(['', 'diretto', 'una fermata', '3 fermate'])
  })
  it('prezzo a testa e totale', () => {
    expect(prezzoDi(t({ cost: 15.5, scope: 'per_person' }), 4)).toEqual({ totale: 62, aTesta: 15.5, persone: 4 })
    expect(prezzoDi(t({ cost: 62, scope: 'total' }), 4)).toEqual({ totale: 62, aTesta: 15.5, persone: 4 })
    expect(prezzoDi(t({}), 4).totale).toBeNull()
    expect(prezzoDi(t({ cost: 10, forTravelers: ['a', 'b'] }), 4).persone).toBe(2)
  })
  it('durata e riepilogo', () => {
    expect(durataTrasporto(t({ departAt: '2026-11-22T00:08:00Z', arriveAt: '2026-11-22T01:28:00Z' }))).toBe('1 h 20')
    expect(riepilogoTrasporti([t({ bought: true }), t({}), t({})])).toBe('3 trasporti · 2 da pagare')
  })
  it('raggruppa per data', () => {
    const g = perData({ timezone: 'Asia/Tokyo', days: [], transports: [t({ id: 'a', departAt: '2026-11-24T00:00:00Z' }), t({ id: 'b', departAt: '2026-11-22T00:08:00Z' }), t({ id: 'c' })] })
    expect(g.map((x) => x.title)).toEqual(['Dom 22 nov', 'Mar 24 nov', 'Senza data'])
  })
})
