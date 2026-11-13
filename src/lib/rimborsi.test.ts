import { describe, expect, it } from 'vitest'
import type { Expense } from '../types'
import { summarizeExpenses } from './budget'
import { controllaRimborso, cronologia, daDecidere, inAttesaMie, pagamentiNuovi, residuo, testoCronologia, testoRichiesta } from './rimborsi'

const people = [{ id: 'a', name: 'Anna' }, { id: 'g', name: 'Giorgio' }]
const fx = { base: 'EUR', local: 'JPY', rate: 0.005 }
const spesa = { id: '1', label: 'Hotel', amount: 100, currency: 'EUR', paidBy: 'a', spentAt: '2026-11-28T10:00:00Z', shares: [] } as Expense
const r = (o: object) => ({ id: 'r', fromId: 'g', toId: 'a', amount: 50, currency: 'EUR', paidOn: '2026-11-28', status: 'in_attesa' as const, createdAt: '2026-11-28T10:00:00Z', ...o })

describe('saldi con i rimborsi confermati', () => {
  it('senza rimborsi Giorgio deve 50 ad Anna', () => {
    expect(summarizeExpenses([spesa], people, fx).transfers).toEqual([{ from: 'g', to: 'a', amount: 50 }])
  })
  it('un rimborso confermato di 30 riduce una sola volta debito e credito', () => {
    const s = summarizeExpenses([spesa], people, fx, [{ fromId: 'g', toId: 'a', amount: 30 }])
    expect(s.balances.map((b) => b.net)).toEqual([20, -20])
    expect(s.transfers).toEqual([{ from: 'g', to: 'a', amount: 20 }])
  })
  it('rimborso totale: nessun trasferimento, saldi a zero', () => {
    const s = summarizeExpenses([spesa], people, fx, [{ fromId: 'g', toId: 'a', amount: 50 }])
    expect(s.transfers).toEqual([])
    expect(s.balances.map((b) => b.net)).toEqual([0, 0])
  })
  it('i rimborsi non cambiano il totale speso né le quote', () => {
    const s = summarizeExpenses([spesa], people, fx, [{ fromId: 'g', toId: 'a', amount: 50 }])
    expect(s.total).toBe(100)
    expect(s.spentBy.map((x) => x.amount)).toEqual([50, 50])
  })
})

describe('dichiarazione', () => {
  const plan = [{ from: 'g', to: 'a', amount: 50 }]
  it('il dovuto è il trasferimento del piano', () => {
    expect(residuo(plan, 'g', 'a')).toBe(50)
    expect(residuo(plan, 'a', 'g')).toBe(0)
  })
  it('accetta il parziale, rifiuta zero e oltre il dovuto', () => {
    expect(controllaRimborso(20, 50, 'EUR')).toBe('')
    expect(controllaRimborso(50, 50, 'EUR')).toBe('')
    expect(controllaRimborso(50.01, 50, 'EUR')).toMatch(/più di quanto devi: 50,00/)
    expect(controllaRimborso(0, 50, 'EUR')).toMatch(/importo non è chiaro/)
    expect(controllaRimborso(null, 50, 'EUR')).toMatch(/importo non è chiaro/)
  })
})

describe('testi e liste', () => {
  it('richiesta per il destinatario e cronologia', () => {
    expect(testoRichiesta(r({ amount: 604.72 }), people)).toMatch(/^Giorgio dice di averti dato 604,72\s?€ · 28\/11\/2026$/)
    expect(testoCronologia(r({}), people, 'g')).toMatch(/^Hai dato 50,00\s?€ a Anna · 28\/11\/2026$/)
    expect(testoCronologia(r({ corrects: 'x' }), people, 'a')).toMatch(/^Rettifica: Giorgio ti ha dato/)
  })
  it('chi deve decidere e chi aspetta', () => {
    const list = [r({ id: '1' }), r({ id: '2', status: 'confermato' }), r({ id: '3', fromId: 'a', toId: 'g' })]
    expect(daDecidere(list, 'a').map((x) => x.id)).toEqual(['1'])
    expect(inAttesaMie(list, 'a').map((x) => x.id)).toEqual(['3'])
    expect(daDecidere(undefined, 'a')).toEqual([])
  })
  it('cronologia dal più recente', () => {
    expect(cronologia([r({ id: '1', createdAt: '2026-01-01' }), r({ id: '2', createdAt: '2026-02-01' })]).map((x) => x.id)).toEqual(['2', '1'])
  })
})

describe('avviso dei pagamenti di altri', () => {
  const adesso = new Date('2026-11-13T12:00:00Z')
  const pag = (o: object) => r({ status: 'confermato', createdBy: 'u-g', createdAt: '2026-11-12T10:00:00Z', ...o })
  const nuovi = (list: object[], visti: string[] = []) => pagamentiNuovi(list as never, people, 'a', 'u-a', new Set(visti), adesso)
  it('un pagamento di Giorgio verso di me', () => {
    expect(nuovi([pag({ id: 'p1' })])).toEqual([{ key: 'p1', testo: 'Giorgio ti ha dato 50,00\u00a0€' }])
  })
  it('non avvisa dei miei, di quelli già visti, di quelli vecchi né di quelli non validi', () => {
    expect(nuovi([pag({ id: 'p1', createdBy: 'u-a' })])).toEqual([])
    expect(nuovi([pag({ id: 'p1' })], ['p1'])).toEqual([])
    expect(nuovi([pag({ id: 'p1', createdAt: '2026-10-01T10:00:00Z' })])).toEqual([])
    expect(nuovi([pag({ id: 'p1', status: 'contestato' }), pag({ id: 'p2', status: 'in_attesa' })])).toEqual([])
  })
  it('una «Bilancia» è un avviso solo, con compensati e netto', () => {
    const g = 'grp'
    const righe = [
      pag({ id: 'c1', groupId: g, compensation: true, fromId: 'g', toId: 'a', amount: 30 }),
      pag({ id: 'c2', groupId: g, compensation: true, fromId: 'a', toId: 'g', amount: 30 }),
      pag({ id: 'p', groupId: g, fromId: 'g', toId: 'a', amount: 10 }),
    ]
    expect(nuovi(righe)).toEqual([{ key: g, testo: 'Giorgio ha bilanciato le spese con te', dettaglio: 'Compensati 30,00\u00a0€ · Giorgio ti ha dato 10,00\u00a0€' }])
  })
})
