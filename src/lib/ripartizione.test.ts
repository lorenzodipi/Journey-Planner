import { describe, expect, it } from 'vitest'
import { puoModificareSpesa, checkFixed, checkPayers, checkPercents, checkSplit, expenseBalance, fxTrace, payersOf, scaleTo, splitAmounts } from './ripartizione'

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100

describe('versamenti', () => {
  it('quadrano solo se sommano al totale', () => {
    expect(checkPayers(100, [{ travelerId: 'a', amount: 60 }, { travelerId: 'b', amount: 40 }], 'EUR').ok).toBe(true)
    const c = checkPayers(100, [{ travelerId: 'a', amount: 60 }, { travelerId: 'b', amount: 30 }], 'EUR')
    expect(c.ok).toBe(false)
    expect(c.missing).toBe(10)
    expect(c.message).toMatch(/Mancano 10,00\s?€ ai versamenti/)
    expect(checkPayers(100, [{ travelerId: 'a', amount: 120 }], 'EUR').message).toMatch(/superano di 20,00/)
  })
  it('rifiuta negativi e doppioni; nessun pagante è ammesso', () => {
    expect(checkPayers(100, [{ travelerId: 'a', amount: -5 }, { travelerId: 'b', amount: 105 }], 'EUR').ok).toBe(false)
    expect(checkPayers(100, [{ travelerId: 'a', amount: 50 }, { travelerId: 'a', amount: 50 }], 'EUR').message).toMatch(/una sola volta/)
    expect(checkPayers(100, [], 'EUR').ok).toBe(true)
  })
  it('evita gli errori dei decimali (0,1 + 0,2)', () => {
    expect(checkPayers(0.3, [{ travelerId: 'a', amount: 0.1 }, { travelerId: 'b', amount: 0.2 }], 'EUR').ok).toBe(true)
  })
  it('payersOf: usa i versamenti, altrimenti chi ha anticipato', () => {
    expect(payersOf({ amount: 50, paidBy: 'a' })).toEqual([{ travelerId: 'a', amount: 50 }])
    expect(payersOf({ amount: 50 })).toEqual([])
    expect(payersOf({ amount: 50, paidBy: 'a', payers: [{ travelerId: 'b', amount: 50 }] })).toEqual([{ travelerId: 'b', amount: 50 }])
  })
})

describe('percentuali', () => {
  it('devono fare 100 esatto', () => {
    expect(checkPercents([{ percent: 60 }, { percent: 40 }]).ok).toBe(true)
    const c = checkPercents([{ percent: 50 }, { percent: 45 }])
    expect(c.ok).toBe(false)
    expect(c.message).toBe('Le quote fanno 95%: mancano 5 punti')
    expect(checkPercents([{ percent: 70 }, { percent: 40 }]).message).toBe('Le quote fanno 110%: 10 punti in più')
    expect(checkPercents([{ percent: 33.33 }, { percent: 33.33 }, { percent: 33.34 }]).ok).toBe(true)
    expect(checkPercents([{ percent: 33.3 }, { percent: 33.3 }]).message).toBe('Le quote fanno 66,6%: mancano 33,4 punti')
  })
  it('il resto dei centesimi va alla prima persona', () => {
    const shares = [
      { travelerId: 'a', weight: 1, percent: 33.33 },
      { travelerId: 'b', weight: 1, percent: 33.33 },
      { travelerId: 'c', weight: 1, percent: 33.34 },
    ]
    const parts = splitAmounts(100, 'percent', shares)
    expect(parts).toEqual([33.33, 33.33, 33.34])
    expect(sum(parts)).toBe(100)
    // 10,01 al 50% ciascuno: il centesimo che avanza va alla prima persona
    expect(splitAmounts(10.01, 'percent', [{ travelerId: 'a', weight: 1, percent: 50 }, { travelerId: 'b', weight: 1, percent: 50 }])).toEqual([5.01, 5])
    expect(splitAmounts(10, 'percent', [{ travelerId: 'a', weight: 1, percent: 50 }, { travelerId: 'b', weight: 1, percent: 50 }])).toEqual([5, 5])
  })
})

describe('importi fissi', () => {
  it('devono sommare il totale', () => {
    expect(checkFixed(100, [{ amount: 70 }, { amount: 30 }], 'EUR').ok).toBe(true)
    expect(checkFixed(100, [{ amount: 70 }, { amount: 20 }], 'EUR').message).toMatch(/Mancano 10,00/)
    expect(checkFixed(100, [{ amount: 90 }, { amount: 20 }], 'EUR').message).toMatch(/superano di 10,00/)
  })
  it('valgono quelli scritti', () => {
    expect(splitAmounts(100, 'fixed', [{ travelerId: 'a', weight: 1, amount: 70 }, { travelerId: 'b', weight: 1, amount: 30 }])).toEqual([70, 30])
  })
})

describe('parti uguali e controllo complessivo', () => {
  it('divide con i pesi e il resto parte dalla prima persona', () => {
    const three = ['a', 'b', 'c'].map((travelerId) => ({ travelerId, weight: 1 }))
    expect(splitAmounts(100, 'equal', three)).toEqual([33.34, 33.33, 33.33])
    expect(splitAmounts(0.02, 'equal', three)).toEqual([0.01, 0.01, 0])
    expect(sum(splitAmounts(99.99, 'equal', [{ travelerId: 'a', weight: 2 }, { travelerId: 'b', weight: 1 }]))).toBe(99.99)
    expect(splitAmounts(10, 'equal', [])).toEqual([])
  })
  it('checkSplit chiede almeno una persona', () => {
    expect(checkSplit('equal', 10, [], 'EUR').ok).toBe(false)
    expect(checkSplit('equal', 10, [{ travelerId: 'a', weight: 1 }], 'EUR').ok).toBe(true)
  })
})

describe('saldo e cambio', () => {
  it('saldo per spesa = versato − quota', () => {
    const b = expenseBalance([{ travelerId: 'a', amount: 60 }, { travelerId: 'b', amount: 40 }], [{ travelerId: 'a', amount: 50 }, { travelerId: 'b', amount: 50 }])
    expect(b).toEqual([
      { travelerId: 'a', paid: 60, owed: 50, net: 10 },
      { travelerId: 'b', paid: 40, owed: 50, net: -10 },
    ])
    expect(expenseBalance([], [{ travelerId: 'c', amount: 5 }])[0].net).toBe(-5)
  })
  it('scaleTo riporta i versamenti nella valuta base senza perdere centesimi', () => {
    const out = scaleTo([{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.34 }], 100, 61.37)
    expect(sum(out.map((o) => o.amount))).toBe(61.37)
    expect(scaleTo([{ amount: 0 }, { amount: 10 }], 10, 5).map((o) => o.amount)).toEqual([0, 5])
  })
  it('fxTrace racconta fonte, ora e mano', () => {
    const at = '2026-10-30T09:10:00.000Z'
    expect(fxTrace({ fxRate: 0.0061, fxSource: 'BCE', fxAt: at }, undefined)).toMatch(/^BCE · 30 ott/)
    expect(fxTrace({ fxRate: 0.0061, fxManual: true, fxAt: at }, 'Anna')).toMatch(/^Scritto a mano da Anna · 30 ott/)
    expect(fxTrace({ fxRate: 0.0061 }, undefined)).toBe('Cambio del viaggio')
    expect(fxTrace({}, undefined)).toBe('')
  })
})

describe('chi può modificare una spesa', () => {
  it('creatore e paganti sì, gli altri no; senza autore tutti', () => {
    const e = { createdBy: 'u1', paidBy: 't2', payers: [{ travelerId: 't3', amount: 5 }] }
    expect(puoModificareSpesa(e, 'u1', 't1')).toBe(true)
    expect(puoModificareSpesa(e, 'u9', 't2')).toBe(true)
    expect(puoModificareSpesa(e, 'u9', 't3')).toBe(true)
    expect(puoModificareSpesa(e, 'u9', 't4')).toBe(false)
    expect(puoModificareSpesa(e, undefined, undefined)).toBe(false)
    expect(puoModificareSpesa({ paidBy: 't2' }, 'u9', 't4')).toBe(true)
  })
})
