// Budget a persona (0055) e ricevuta «La mia parte».
import { describe, expect, it } from 'vitest'
import { budgetAltrui, budgetDi, budgetTotale } from './budgetPersona'
import { ricevuta } from './ricevuta'
import { tutteLeSpese } from './spese'
import { mapBudgets } from './tripApi'
import type { Trip } from '../types'

const travelers = [
  { id: 'a', name: 'Persona A', userId: 'u1' },
  { id: 'b', name: 'Persona B', userId: 'u2' },
  { id: 'c', name: 'Persona C' },
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

describe('budget a persona', () => {
  it('il budget del viaggio è la somma di quelli messi, con quante persone', () => {
    const trip = { ...base, budgets: { righe: { a: 1500 }, totale: 2700, persone: 2, viaggiatori: 3 } } as Trip
    expect(budgetTotale(trip)).toEqual({ importo: 2700, persone: 2, viaggiatori: 3 })
    expect(budgetDi(trip, 'a')).toBe(1500)
    expect(budgetDi(trip, 'b')).toBeUndefined() // quello degli altri non si vede
  })

  it('senza budget messi non c\'è un budget del viaggio', () => {
    expect(budgetTotale({ ...base, budgets: { righe: {}, totale: 0, persone: 0, viaggiatori: 3 } } as Trip)).toEqual({})
  })

  it('prima della migrazione vale il budget unico del viaggio, e da soli è anche il mio', () => {
    expect(budgetTotale({ ...base, budgetLimit: 4000 } as Trip)).toEqual({ importo: 4000 })
    expect(budgetDi({ ...base, budgetLimit: 4000 } as Trip, 'a')).toBeUndefined()
    expect(budgetDi({ ...base, travelers: [travelers[0]], budgetLimit: 4000 } as Trip, 'a')).toBe(4000)
    // con il budget a persona il vecchio budget unico non conta più
    expect(budgetTotale({ ...base, budgetLimit: 4000, budgets: { righe: {}, totale: 0, persone: 0, viaggiatori: 3 } } as Trip)).toEqual({})
  })

  it('il budget di chi non ha l\'account lo scrive chi può modificare il viaggio', () => {
    expect(budgetAltrui(base, 'a', true).map((t) => t.id)).toEqual(['c'])
    expect(budgetAltrui(base, 'a', false)).toEqual([])
  })

  it('dal database: le righe del viaggio e il suo totale; senza la migrazione niente', () => {
    const righe = [{ traveler_id: 'a', trip_id: 't1', amount: '1500.00' }, { traveler_id: 'x', trip_id: 't2', amount: 10 }]
    const totali = [{ trip_id: 't1', total: '2700.00', persone: 2, viaggiatori: 3 }]
    expect(mapBudgets(righe, totali, 't1')).toEqual({ righe: { a: 1500 }, totale: 2700, persone: 2, viaggiatori: 3 })
    expect(mapBudgets(null, null, 't1')).toBeUndefined()
    expect(mapBudgets(righe, totali, 'visto-da-visualizzatore')).toBeUndefined()
  })
})

describe('ricevuta «La mia parte»', () => {
  const trip = {
    ...base,
    expenseCategories: [{ id: 'k', label: 'Cibo', planned: 300 }],
    stays: [{ id: 's1', name: 'Casa', city: 'Città', checkIn: '2026-11-22', checkOut: '2026-11-24', totalCost: 300, currency: 'EUR', paid: true, paidBy: 'a', breakfast: false, dinner: false, kitchen: false, booked: true }],
    transports: [
      { id: 't1', from: 'X', to: 'Y', cost: 20, currency: 'EUR', scope: 'total', bought: false, forTravelers: ['a', 'b'] },
      { id: 't2', from: 'Y', to: 'Z', cost: 50, currency: 'EUR', scope: 'total', bought: false, forTravelers: ['b', 'c'] },
    ],
    expenses: [
      { id: 'e1', label: 'Cena', category: 'Cibo', amount: 90, currency: 'EUR', paidBy: 'b', spentAt: '2026-11-23T03:00:00Z', shares: [] },
      { id: 'e2', label: 'Gelato', category: 'Cibo', amount: 8, currency: 'EUR', paidBy: 'b', spentAt: '2026-11-23T05:00:00Z', shares: [{ travelerId: 'b', weight: 1 }] },
    ],
  } as unknown as Trip
  const spese = tutteLeSpese(trip)
  const tutti = ricevuta(trip, spese, fx)
  const mia = ricevuta(trip, spese, fx, 'a')

  it('per categoria la mia quota delle spese e delle voci che divido', () => {
    const cat = (r: typeof mia, l: string) => r.categorie.find((c) => c.label === l)!
    expect(cat(mia, 'Alloggi').spent).toBe(100) // 300 € in tre
    expect(cat(mia, 'Cibo').spent).toBe(30) // la cena in tre, il gelato non è mio
    expect(cat(mia, 'Cibo').nSpese).toBe(1)
    expect(cat(mia, 'Trasporti').unpaid).toBe(10) // solo il trasporto che divido con B
    expect(cat(mia, 'Trasporti').voci).toEqual({ tot: 1, paid: 0 })
    expect(cat(mia, 'Cibo').planned).toBe(100) // il previsto scritto, diviso per le persone del viaggio
    expect(cat(tutti, 'Cibo').planned).toBe(300)
  })

  it('totali miei e solo il mio saldo', () => {
    expect(mia.pagato).toBe(130)
    expect(mia.daPagare).toBe(10)
    expect(mia.persone.map((p) => p.travelerId)).toEqual(['a'])
    expect(mia.persone[0].net).toBe(tutti.persone.find((p) => p.travelerId === 'a')!.net)
    expect(mia.transfers.every((x) => x.from === 'a' || x.to === 'a')).toBe(true)
    expect(tutti.pagato).toBe(398)
  })
})
