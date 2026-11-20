import { describe, expect, it } from 'vitest'
import { carteDelPagamento, chiaveCard, type DebitoSpesa } from './debitiSpese'

const card = (expenseId: string, otherId: string, cop: Partial<Pick<DebitoSpesa, 'confermati' | 'richieste' | 'contestati'>>) =>
  ({ expenseId, otherId, confermati: [], richieste: [], contestati: [], ...cop }) as unknown as DebitoSpesa

describe('«Controlla»: le card coperte da un pagamento', () => {
  const righe = [card('e1', 'g', { confermati: [{ id: 's1', amount: 10 }] }), card('e2', 'g', { confermati: [{ id: 's2', amount: 5 }, { id: 's3', amount: 5 }] }), card('e3', 'g', { contestati: [{ id: 's4', amount: 3 }] })]
  const pagamenti = [{ id: 's1' }, { id: 's2', groupId: 'b1' }, { id: 's3', groupId: 'b1' }, { id: 's4' }]

  it('un pagamento solo: la sua card', () => {
    expect(carteDelPagamento(righe, pagamenti, 's1')).toEqual([chiaveCard(righe[0])])
  })
  it('una «Bilancia»: tutte le card del gruppo, nell\'ordine dell\'elenco', () => {
    expect(carteDelPagamento([...righe, card('e4', 'g', { confermati: [{ id: 's3', amount: 1 }] })], pagamenti, 'b1')).toEqual(['e2:g', 'e4:g'])
  })
  it('anche se nel frattempo è stato contestato', () => {
    expect(carteDelPagamento(righe, pagamenti, 's4')).toEqual(['e3:g'])
  })
  it('un pagamento che non c\'è più: nessuna card', () => {
    expect(carteDelPagamento(righe, pagamenti, 'zzz')).toEqual([])
    expect(carteDelPagamento(righe, undefined, 's1')).toEqual([])
  })
})
