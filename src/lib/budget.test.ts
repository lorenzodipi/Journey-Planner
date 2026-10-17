import { describe, expect, it } from 'vitest'
import type { Expense } from '../types'
import { budgetLines, expenseBase, expenseOwed, groupByCategory, logisticsLines, settle, shareAmounts, splitEvenly, summarizeExpenses, summarizeLines, toBase, type Line } from './budget'

// Cifre FITTIZIE: servono solo a verificare i calcoli.
const T1 = { id: 't1' }
const T2 = { id: 't2' }
const travelers = [T1, T2]
const fx = { base: 'EUR', local: 'JPY', rate: 0.005 }

describe('conversioni', () => {
  it('base invariata, locale con tasso, altre valute senza tasso → null', () => {
    expect(toBase(10, 'EUR', fx)).toBe(10)
    expect(toBase(2000, 'JPY', fx)).toBe(10)
    expect(toBase(5, 'USD', fx)).toBeNull()
    expect(toBase(2000, 'JPY', { base: 'EUR', local: 'JPY' })).toBeNull()
  })

  it('divide i centesimi senza perderne', () => {
    expect(splitEvenly(100, 3)).toEqual([33.34, 33.33, 33.33])
    expect(splitEvenly(100, 3).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10)
    expect(splitEvenly(0.01, 2)).toEqual([0.01, 0])
    expect(splitEvenly(10, 0)).toEqual([])
  })

  it('quote: a persona = intero, totale = diviso', () => {
    expect(shareAmounts({ amount: 30, scope: 'per_person' }, 2)).toEqual([30, 30])
    expect(shareAmounts({ amount: 30, scope: 'total' }, 2)).toEqual([15, 15])
  })
})

describe('riepilogo budget', () => {
  const lines: Line[] = [
    { key: 'a', label: 'Treno', category: 'Trasporti', amount: 30, currency: 'EUR', scope: 'per_person', source: 'budget', shares: [{ travelerId: 't1', paid: true }, { travelerId: 't2', paid: false }] },
    { key: 'b', label: 'Hotel', category: 'Alloggi', amount: 600, currency: 'EUR', scope: 'total', source: 'budget', shares: [{ travelerId: 't1', paid: false }, { travelerId: 't2', paid: false }] },
    { key: 'c', label: 'Pass', category: 'Trasporti', amount: 2000, currency: 'JPY', scope: 'per_person', source: 'budget', shares: [] },
  ]

  it('somma previsto, pagato e residuo, per persona e totale', () => {
    const s = summarizeLines(lines, travelers, fx)
    // t1: 30 (pagato) + 300 + 10 (pass, senza quote = tutti) ; t2: 30 + 300 + 10
    expect(s.perTraveler[0]).toEqual({ travelerId: 't1', planned: 340, paid: 30, outstanding: 310 })
    expect(s.perTraveler[1]).toEqual({ travelerId: 't2', planned: 340, paid: 0, outstanding: 340 })
    expect(s).toMatchObject({ planned: 680, paid: 30, outstanding: 650, unconverted: [] })
  })

  it('senza tasso le voci in yen restano fuori e vengono segnalate', () => {
    const s = summarizeLines(lines, travelers, { base: 'EUR', local: 'JPY' })
    expect(s.planned).toBe(660)
    expect(s.unconverted).toEqual(['JPY'])
  })

  it('i costi di voli, alloggi e trasporti entrano come voci (pagato = per tutti)', () => {
    const l = logisticsLines({
      travelers: [{ id: 't1', name: 'A', color: '#000' }, { id: 't2', name: 'B', color: '#000' }],
      flights: [{ id: 'f', title: 'Andata', cost: 600, currency: 'EUR', scope: 'per_person', paid: true, legs: [] }],
      stays: [{ id: 's', name: 'Hotel', city: '', checkIn: '2026-11-22', checkOut: '2026-11-26', totalCost: 800, currency: 'EUR', breakfast: false, dinner: false, kitchen: false, booked: true, paid: false }],
      transports: [{ id: 'x', from: 'A', to: 'B', mode: 'train', cost: 20, currency: 'EUR', scope: 'per_person', bought: false }, { id: 'y', from: 'C', to: 'D', mode: 'bus', currency: 'EUR', scope: 'per_person', bought: false }],
    })
    expect(l.map((x) => x.category)).toEqual(['Voli', 'Alloggi', 'Trasporti'])
    const s = summarizeLines(l, travelers, fx)
    expect(s).toMatchObject({ planned: 2040, paid: 1200, outstanding: 840 }) // volo 600x2 pagato, hotel 800, treno 20x2
  })

  it('raggruppa per categoria con "Altro" in fondo', () => {
    const g = groupByCategory(budgetLines([
      { id: '1', label: 'x', amount: 1, currency: 'EUR', scope: 'total', shares: [] },
      { id: '2', label: 'y', category: 'Cibo', amount: 1, currency: 'EUR', scope: 'total', shares: [] },
      { id: '3', label: 'z', category: 'Alloggi', amount: 1, currency: 'EUR', scope: 'total', shares: [] },
    ]))
    expect(g.map((x) => x.category)).toEqual(['Alloggi', 'Cibo', 'Altro'])
  })
})

describe('spese', () => {
  const exp = (over: Partial<Expense>): Expense => ({ id: 'e', label: 'x', amount: 0, currency: 'EUR', spentAt: '2026-11-23T10:00:00Z', shares: [], ...over })

  it('tasso della spesa ha la precedenza su quello del viaggio', () => {
    expect(expenseBase(exp({ amount: 1000, currency: 'JPY', fxRate: 0.006 }), fx)).toBe(6)
    expect(expenseBase(exp({ amount: 1000, currency: 'JPY' }), fx)).toBe(5)
    expect(expenseBase(exp({ amount: 1000, currency: 'USD' }), fx)).toBeNull()
  })

  it('divide per pesi e la somma è esatta', () => {
    const owed = expenseOwed(exp({ amount: 100, shares: [{ travelerId: 't1', weight: 1 }, { travelerId: 't2', weight: 2 }] }), travelers, fx)!
    expect(owed.map((o) => o.amount)).toEqual([33.33, 66.67])
    expect(owed.reduce((n, o) => n + o.amount, 0)).toBeCloseTo(100, 10)
    expect(expenseOwed(exp({ amount: 10 }), travelers, fx)!.map((o) => o.amount)).toEqual([5, 5]) // senza quote: parti uguali
  })

  it('chi deve a chi: A paga 100 diviso in due, B paga 30 diviso in due', () => {
    const s = summarizeExpenses(
      [exp({ id: '1', amount: 100, paidBy: 't1' }), exp({ id: '2', amount: 30, paidBy: 't2' })],
      travelers,
      fx,
    )
    expect(s.total).toBe(130)
    expect(s.spentBy).toEqual([{ travelerId: 't1', amount: 65 }, { travelerId: 't2', amount: 65 }])
    expect(s.balances.map((b) => b.net)).toEqual([35, -35])
    expect(s.transfers).toEqual([{ from: 't2', to: 't1', amount: 35 }])
  })

  it('spese in yen con tasso, e quella in valuta ignota segnalata', () => {
    const s = summarizeExpenses(
      [exp({ id: '1', amount: 4000, currency: 'JPY', paidBy: 't2' }), exp({ id: '2', amount: 9, currency: 'USD', paidBy: 't1' })],
      travelers,
      fx,
    )
    expect(s.total).toBe(20)
    expect(s.transfers).toEqual([{ from: 't1', to: 't2', amount: 10 }])
    expect(s.unconverted).toEqual(['USD'])
  })

  it('spesa senza pagante: conta nel totale ma non nei bonifici', () => {
    const s = summarizeExpenses([exp({ amount: 50 })], travelers, fx)
    expect(s.total).toBe(50)
    expect(s.spentBy.map((x) => x.amount)).toEqual([25, 25])
    expect(s.transfers).toEqual([])
  })

  it('bonifici con tre persone: il minimo indispensabile', () => {
    expect(settle([{ travelerId: 'a', net: 30 }, { travelerId: 'b', net: -10 }, { travelerId: 'c', net: -20 }])).toEqual([
      { from: 'c', to: 'a', amount: 20 },
      { from: 'b', to: 'a', amount: 10 },
    ])
    expect(settle([{ travelerId: 'a', net: 0 }, { travelerId: 'b', net: 0 }])).toEqual([])
  })
})
