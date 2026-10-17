import { describe, expect, it } from 'vitest'
import type { Expense } from '../types'
import { budgetLines, expenseBase, expenseOwed, expensesOf, groupByCategory, involvesTraveler, personSummary, shareOf, logisticsLines, settle, shareAmounts, splitEvenly, summarizeExpenses, summarizeLines, toBase, type Line } from './budget'

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

describe('vista per persona', () => {
  const T3 = { id: 't3' }
  const three = [T1, T2, T3]
  const mk = (id: string, amount: number, paidBy: string | undefined, ids: string[]): Expense => ({
    id, label: id, amount, currency: 'EUR', paidBy, spentAt: '2026-11-22T10:00:00Z', shares: ids.map((travelerId) => ({ travelerId, weight: 1 })),
  })
  const list = [mk('a', 30, 't1', []), mk('b', 20, 't2', ['t2', 't3']), mk('c', 10, 't3', ['t3']), mk('d', 8, undefined, ['t1', 't2'])]

  it('una spesa riguarda chi paga, chi ha una quota, o tutti se non ci sono quote', () => {
    expect(involvesTraveler(list[0], 't2')).toBe(true) // nessuna quota = tutti
    expect(involvesTraveler(list[1], 't1')).toBe(false)
    expect(involvesTraveler(list[1], 't3')).toBe(true)
    expect(involvesTraveler(mk('x', 5, 't1', ['t2']), 't1')).toBe(true) // ha pagato per un altro
    expect(involvesTraveler({ paidBy: undefined, shares: [{ travelerId: 't1', weight: 0 }] }, 't1')).toBe(false)
  })

  it('filtra le spese di una persona; "all" le lascia tutte', () => {
    expect(expensesOf(list, 'all')).toHaveLength(4)
    expect(expensesOf(list, 't1').map((e) => e.id)).toEqual(['a', 'd'])
    expect(expensesOf(list, 't3').map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('quota di una persona in una spesa', () => {
    expect(shareOf(list[0], three, 't2', fx)).toBe(10)
    expect(shareOf(list[1], three, 't1', fx)).toBe(0)
    expect(shareOf({ ...list[0], currency: 'USD' }, three, 't1', fx)).toBeNull()
  })

  it('riepilogo di una persona: anticipato, quota, saldo e bonifici', () => {
    const s = summarizeExpenses(list, three, fx)
    const p1 = personSummary(s, 't1')
    expect(p1.paid).toBe(30)
    expect(p1.share).toBe(14) // 10 della spesa a + 4 della d
    expect(p1.net).toBe(20) // 30 - 10 (la d non ha pagante e non conta nel saldo)
    expect(p1.gives).toEqual([])
    expect(p1.receives.reduce((n, t) => n + t.amount, 0)).toBeCloseTo(20, 2)
    const total = ['t1', 't2', 't3'].reduce((n, id) => n + personSummary(s, id).net, 0)
    expect(total).toBeCloseTo(0, 2)
    expect(personSummary(s, 'zz')).toMatchObject({ paid: 0, share: 0, net: 0 })
  })
})
