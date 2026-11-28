import { describe, expect, it } from 'vitest'
import type { Expense } from '../types'
import { personeDelleSpese, scelteTappa, speseDellaTappa, totaleSpese } from './speseTappa'

const e = (id: string, amount: number, currency: string, itemId?: string, extra: Partial<Expense> = {}): Expense => ({
  id, label: id, amount, currency, spentAt: '2026-11-23T03:00:00Z', shares: [], ...(itemId ? { source: { kind: 'day_item', id: itemId } } : {}), ...extra,
})

describe('spese di una tappa', () => {
  it('trova tutte le spese collegate alla tappa, le più recenti in alto', () => {
    const trip = { expenses: [e('a', 1, 'EUR', 't1', { createdAt: '2026-11-23T01:00:00Z' }), e('b', 2, 'EUR', 't2'), e('c', 3, 'EUR', 't1', { createdAt: '2026-11-23T05:00:00Z' }), e('d', 4, 'EUR')] }
    expect(speseDellaTappa(trip, 't1').map((x) => x.id)).toEqual(['c', 'a'])
  })

  it('totale nella stessa valuta, altrimenti nella valuta base', () => {
    expect(totaleSpese([e('a', 1000, 'JPY'), e('b', 500, 'JPY')], { base: 'EUR' })).toEqual({ amount: 1500, currency: 'JPY' })
    expect(totaleSpese([e('a', 1000, 'JPY'), e('b', 10, 'EUR')], { base: 'EUR', local: 'JPY', rate: 0.006 })).toEqual({ amount: 16, currency: 'EUR' })
    expect(totaleSpese([e('a', 1000, 'JPY'), e('b', 10, 'EUR')], { base: 'EUR' })).toBeNull()
    expect(totaleSpese([], { base: 'EUR' })).toBeNull()
  })

  it('persone: chi divide almeno una spesa (vuoto = tutti)', () => {
    expect(personeDelleSpese([e('a', 1, 'EUR', 't', { shares: [{ travelerId: 'y', weight: 1 }] })], ['x', 'y', 'z'])).toEqual(['y'])
    expect(personeDelleSpese([e('a', 1, 'EUR'), e('b', 1, 'EUR', 't', { shares: [{ travelerId: 'y', weight: 1 }] })], ['x', 'y'])).toEqual(['x', 'y'])
  })

  it('scelte del campo «Tappa»: nessuna, poi le tappe per giorno', () => {
    const days = [
      { id: 'd1', date: '2026-11-22', items: [{ id: 'i1', title: 'Museo', kind: 'visit', time: '10:00:00' }] },
      { id: 'd2', date: '2026-11-23', items: [{ id: 'i2', title: 'Cena', kind: 'meal' }] },
    ] as never
    const s = scelteTappa({ days })
    expect(s.map((x) => x.value)).toEqual(['', 'i1', 'i2'])
    expect(s[1].label).toBe('10:00 · Museo')
    expect(s[1].group).toMatch(/^Giorno 1 · /)
    expect(s[2].group).toMatch(/^Giorno 2 · /)
    expect(s[0].group).toBeUndefined()
  })
})
