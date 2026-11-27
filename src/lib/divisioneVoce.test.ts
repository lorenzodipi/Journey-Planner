import { describe, expect, it } from 'vitest'
import { colonneDivisione, leggiDivisione, spesaDivisa } from './divisioneVoce'
import { tutteLeSpese } from './spese'
import { expenseOwed, expensePaid } from './budget'
import type { Transport } from '../types'

const tutti = ['lorenzo', 'gaia']

describe('versamenti e divisione delle voci (0059)', () => {
  it('senza scelte resta tutto come prima: un pagante, parti uguali, nessuna colonna scritta', () => {
    expect(colonneDivisione({})).toEqual({})
    const d = spesaDivisa({ paidBy: 'lorenzo' }, tutti, 100, tutti)
    expect(d).toEqual({ paidBy: 'lorenzo', shares: [{ travelerId: 'lorenzo', weight: 1 }, { travelerId: 'gaia', weight: 1 }] })
  })

  it('più paganti senza cifre: parti uguali, l\'ultimo prende i centesimi', () => {
    expect(spesaDivisa({ payerIds: ['lorenzo', 'gaia'] }, tutti, 100.01, tutti).payers).toEqual([{ travelerId: 'lorenzo', amount: 50 }, { travelerId: 'gaia', amount: 50.01 }])
  })

  it('versamenti con le cifre: valgono se tornano col totale, se no parti uguali', () => {
    const v = { payerIds: ['lorenzo', 'gaia'], payerAmounts: [{ travelerId: 'lorenzo', amount: 300 }, { travelerId: 'gaia', amount: 100 }] }
    expect(spesaDivisa(v, tutti, 400, tutti).payers).toEqual(v.payerAmounts)
    expect(spesaDivisa(v, tutti, 500, tutti).payers).toEqual([{ travelerId: 'lorenzo', amount: 250 }, { travelerId: 'gaia', amount: 250 }])
  })

  it('divisione in % e a importi; chi non c\'era nella divisione salvata ha 0', () => {
    const pc = spesaDivisa({ splitMode: 'percent', splitShares: [{ travelerId: 'lorenzo', weight: 1, percent: 70 }, { travelerId: 'gaia', weight: 1, percent: 30 }] }, tutti, 100, tutti)
    expect(pc.splitMode).toBe('percent')
    expect(pc.shares.map((s) => s.percent)).toEqual([70, 30])
    const fx = spesaDivisa({ splitMode: 'fixed', splitShares: [{ travelerId: 'lorenzo', weight: 1, amount: 80 }] }, ['lorenzo', 'gaia', 'luca'], 80, ['lorenzo', 'gaia', 'luca'])
    expect(fx.shares.map((s) => s.amount)).toEqual([80, 0, 0])
    // una sola persona: niente divisione
    expect(spesaDivisa({ splitMode: 'percent', splitShares: [{ travelerId: 'lorenzo', weight: 1, percent: 100 }] }, ['lorenzo'], 50, tutti).splitMode).toBeUndefined()
  })

  it('le colonne vanno e vengono; tornando alle scelte di sempre si svuotano', () => {
    const i = { splitMode: 'percent' as const, splitShares: [{ travelerId: 'lorenzo', weight: 1, percent: 60 }, { travelerId: 'gaia', weight: 1, percent: 40 }], payerAmounts: [{ travelerId: 'lorenzo', amount: 10 }, { travelerId: 'gaia', amount: 5 }] }
    const col = colonneDivisione(i)
    expect(col).toEqual({ split_mode: 'percent', split_shares: [{ travelerId: 'lorenzo', percent: 60 }, { travelerId: 'gaia', percent: 40 }], payer_amounts: [{ travelerId: 'lorenzo', amount: 10 }, { travelerId: 'gaia', amount: 5 }] })
    const letto = leggiDivisione(col)
    expect(letto.splitMode).toBe('percent')
    expect(letto.splitShares?.map((s) => s.percent)).toEqual([60, 40])
    expect(letto.payerAmounts).toEqual(i.payerAmounts)
    expect(colonneDivisione({}, letto)).toEqual({ split_mode: null, split_shares: null, payer_amounts: null })
  })

  it('valori sbagliati nel database si ignorano', () => {
    expect(leggiDivisione({ split_mode: 'boh', split_shares: [{ travelerId: 'a', percent: 50 }] })).toEqual({})
    expect(leggiDivisione({ split_mode: 'fixed', split_shares: 'x', payer_amounts: [{ travelerId: 'a', amount: 3 }] })).toEqual({})
  })

  it('in Spese: il trasporto da 400 € pagato 300/100 e diviso 70/30 dà i saldi giusti', () => {
    const t: Transport = {
      id: 'tr1', from: 'Tokyo', to: 'Kyoto', mode: 'train', currency: 'EUR', scope: 'total', bought: true, cost: 400,
      payerIds: ['lorenzo', 'gaia'], payerAmounts: [{ travelerId: 'lorenzo', amount: 300 }, { travelerId: 'gaia', amount: 100 }],
      splitMode: 'percent', splitShares: [{ travelerId: 'lorenzo', weight: 1, percent: 70 }, { travelerId: 'gaia', weight: 1, percent: 30 }],
    }
    const travelers = tutti.map((id) => ({ id, name: id, color: '' })) as unknown as import('../types').Traveler[]
    const [e] = tutteLeSpese({ expenses: [], stays: [], flights: [], transports: [t], bookings: [], travelers, timezone: 'Asia/Tokyo', startDate: '2026-11-22' })
    const fx = { base: 'EUR' }
    const di = (l: { travelerId: string; amount: number }[] | null, id: string) => l?.find((x) => x.travelerId === id)?.amount
    const deve = expenseOwed(e, travelers, fx)
    const pagato = expensePaid(e, fx)
    expect(di(deve, 'lorenzo')).toBeCloseTo(280)
    expect(di(deve, 'gaia')).toBeCloseTo(120)
    expect(di(pagato, 'lorenzo')).toBeCloseTo(300)
    expect(di(pagato, 'gaia')).toBeCloseTo(100)
  })
})
