import { describe, expect, it } from 'vitest'
import { ricevuta, iconaSpesa, statoBudget } from './ricevuta'
import { sezioneSpesa, tutteLeSpese } from './spese'
import type { Trip } from '../types'
import { formatMoney } from './money'

const travelers = [
  { id: 'a', name: 'Lorenzo' },
  { id: 'b', name: 'Marta' },
]
const base = {
  travelers,
  stays: [],
  flights: [],
  transports: [],
  bookings: [],
  budget: [],
  expenses: [],
  expenseCategories: [],
  baseCurrency: 'EUR',
  timezone: 'Asia/Tokyo',
  startDate: '2026-11-22',
} as unknown as Trip
const fx = { base: 'EUR' }

describe('ricevuta', () => {
  it('categorie base sempre presenti, Altro solo se ha qualcosa', () => {
    const r = ricevuta(base, [], fx)
    expect(r.categorie.map((c) => c.label)).toEqual(['Voli', 'Alloggi', 'Trasporti', 'Cibo', 'Attività'])
    expect(r.categorie[3].sub).toBe('Ancora vuota · registra una spesa')
  })

  it('voci pagate diventano spese; da pagare e previsto calcolato', () => {
    const trip = {
      ...base,
      transports: [
        { id: 't1', from: 'Kyoto', to: 'Osaka', cost: 10, currency: 'EUR', scope: 'per_person', bought: true },
        { id: 't2', from: 'Osaka', to: 'Nara', cost: 5, currency: 'EUR', scope: 'total', bought: false },
      ],
      expenses: [{ id: 'e1', label: 'Ramen', category: 'Cibo', amount: 30, currency: 'EUR', paidBy: 'a', spentAt: '2026-11-23T03:00:00Z', shares: [] }],
    } as unknown as Trip
    const spese = tutteLeSpese(trip)
    expect(spese).toHaveLength(2)
    const r = ricevuta(trip, spese, fx)
    const tr = r.categorie.find((c) => c.label === 'Trasporti')!
    expect(tr.spent).toBe(20)
    expect(tr.planned).toBe(25)
    expect(tr.sub).toBe('1 di 2 pagati')
    expect(tr.previstoTesto).toBe(`Previsto ${formatMoney(25, 'EUR')}`)
    expect(r.pagato).toBe(50)
    expect(r.daPagare).toBe(5)
    expect(r.previsto).toBe(55)
    // il trasporto senza pagante non sposta i saldi: Marta deve 15 € a Lorenzo per il ramen
    expect(r.transfers).toEqual([{ from: 'b', to: 'a', amount: 15 }])
    const lor = r.persone.find((p) => p.travelerId === 'a')!
    expect(lor.quota).toBe(25)
    expect(lor.paid).toBe(40)
  })

  it('volo pagato da due persone: 311,50 € a testa su 623 €, saldi pari', () => {
    const trip = {
      ...base,
      flights: [{ id: 'f1', title: 'Andata', cost: 311.5, currency: 'EUR', scope: 'per_person', paid: true, legs: [], payerIds: ['a', 'b'] }],
    } as unknown as Trip
    const [spesa] = tutteLeSpese(trip)
    expect(spesa.amount).toBe(623)
    expect(spesa.payers).toEqual([{ travelerId: 'a', amount: 311.5 }, { travelerId: 'b', amount: 311.5 }])
    const r = ricevuta(trip, [spesa], fx)
    expect(r.transfers).toEqual([])
  })

  it('previsto scritto a mano vince', () => {
    const trip = { ...base, expenseCategories: [{ id: 'c', label: 'cibo', planned: 600 }] } as unknown as Trip
    const r = ricevuta(trip, [], fx)
    const cibo = r.categorie.find((c) => c.key === 'cibo')!
    expect(cibo.plannedSet).toBe(true)
    expect(cibo.id).toBe('c')
    expect(cibo.sub).toBe('Ancora vuota')
    expect(cibo.previstoTesto).toBe(`Previsto ${formatMoney(600, 'EUR')}`)
  })

  it('sezioni del Dettaglio spese', () => {
    const tre = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(sezioneSpesa({ shares: [], paidBy: 'c' }, tre, 'a')).toBe('tutti')
    expect(sezioneSpesa({ shares: [{ travelerId: 'a', weight: 1 }, { travelerId: 'b', weight: 1 }], paidBy: 'b' }, tre, 'a')).toBe('mie')
    expect(sezioneSpesa({ shares: [{ travelerId: 'c', weight: 1 }], paidBy: 'c' }, tre, 'a')).toBe(null)
  })

  it('icona della spesa dal nome o dalla categoria', () => {
    expect(iconaSpesa({ label: 'Caffè al mercato', category: 'Cibo' })).toBe('i-cat-cafe')
    expect(iconaSpesa({ label: 'Ingresso', category: 'Attività' })).toBe('i-sez-ticket')
  })
})

describe('statoBudget', () => {
  const c = (spent: number, planned: number, unpaid = 0, tot = 0, paid = 0) => ({ spent, planned, unpaid, voci: { tot, paid } })
  it('previsto raggiunto senza voci (assicurazione, connessione): pagati, non «quasi al limite»', () => {
    expect(statoBudget(c(154.24, 154.24))).toBe('paid')
    expect(statoBudget(c(89.82, 89.82))).toBe('paid')
  })
  it('previsto raggiunto con voci tutte pagate (voli, alloggi): pagati', () => {
    expect(statoBudget(c(1246, 1246, 0, 2, 2))).toBe('paid')
  })
  it('sotto il previsto o con voci ancora da pagare: nessun avviso', () => {
    expect(statoBudget(c(36, 292, 256, 2, 1))).toBe('ok')
    expect(statoBudget(c(0, 600))).toBe('ok')
    expect(statoBudget(c(95, 100))).toBe('ok')
    expect(statoBudget(c(100, 100, 0, 2, 1))).toBe('ok')
  })
  it('solo se supera il previsto: oltre il limite, anche di un centesimo', () => {
    expect(statoBudget(c(100.01, 100))).toBe('over')
    expect(statoBudget(c(120, 100, 0, 1, 1))).toBe('over')
  })
  it('senza previsto non c’è un limite da superare', () => {
    expect(statoBudget(c(50, 0))).toBe('ok')
  })
})
