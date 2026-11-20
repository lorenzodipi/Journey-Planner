import { describe, expect, it } from 'vitest'
import { ricevuta } from './ricevuta'
import { tutteLeSpese } from './spese'
import type { Trip } from '../types'

// Previsto a persona (0056): ognuno il suo, tra tutti la somma; chi non l'ha scritto conta la sua quota stimata.
const travelers = [
  { id: 'a', name: 'Lorenzo', userId: 'u1' },
  { id: 'b', name: 'Gaia', userId: 'u2' },
  { id: 'c', name: 'Senza account' },
]
const base = {
  travelers,
  stays: [],
  flights: [],
  // 30 € di treno per tutti e tre, da pagare: 10 € a testa
  transports: [{ id: 't1', from: 'Kyoto', to: 'Osaka', cost: 30, currency: 'EUR', scope: 'total', bought: false }],
  bookings: [],
  budget: [],
  expenses: [],
  expenseCategories: [
    { id: 'cat-tr', label: 'Trasporti' },
    { id: 'cat-cibo', label: 'Cibo' },
  ],
  baseCurrency: 'EUR',
  timezone: 'Asia/Tokyo',
  startDate: '2026-11-22',
} as unknown as Trip
const fx = { base: 'EUR' }
const cat = (r: ReturnType<typeof ricevuta>, label: string) => r.categorie.find((c) => c.label === label)!

describe('previsto a persona', () => {
  it('senza la migrazione tutto come prima: nessun campo a persona', () => {
    const r = ricevuta(base, tutteLeSpese(base), fx, undefined, 'a')
    expect(cat(r, 'Trasporti').planned).toBe(30)
    expect(cat(r, 'Trasporti').mio).toBeUndefined()
  })

  it('nessuno ha scritto il suo: tra tutti il calcolo di sempre, a me la mia quota stimata', () => {
    const trip = { ...base, previsti: { righe: {}, totali: {} } } as Trip
    const spese = tutteLeSpese(trip)
    const tutti = ricevuta(trip, spese, fx, undefined, 'a')
    expect(cat(tutti, 'Trasporti').planned).toBe(30)
    expect(cat(tutti, 'Trasporti').mio).toEqual({ travelerId: 'a', valore: undefined, stima: 10 })
    expect(cat(tutti, 'Trasporti').altri).toEqual([{ travelerId: 'c', valore: undefined, stima: 10 }])
    expect(cat(ricevuta(trip, spese, fx, 'a'), 'Trasporti').planned).toBe(10)
  })

  it('io scrivo il mio, Gaia no: tra tutti il mio più le quote stimate degli altri; nella mia parte solo il mio', () => {
    const trip = { ...base, previsti: { righe: { 'cat-tr': { a: 50 } }, totali: { 'cat-tr': { totale: 50, chi: ['a'] } } } } as Trip
    const spese = tutteLeSpese(trip)
    expect(cat(ricevuta(trip, spese, fx, undefined, 'a'), 'Trasporti').planned).toBe(70)
    const mia = ricevuta(trip, spese, fx, 'a')
    expect(cat(mia, 'Trasporti').planned).toBe(50)
    expect(cat(mia, 'Trasporti').plannedSet).toBe(true)
    // Gaia non ha scritto il suo: nella sua parte la sua quota stimata
    expect(cat(ricevuta(trip, spese, fx, 'b'), 'Trasporti').planned).toBe(10)
  })

  it('il previsto di Gaia non lo vedo, ma conta nella somma', () => {
    const trip = { ...base, previsti: { righe: { 'cat-cibo': { a: 300 } }, totali: { 'cat-cibo': { totale: 500, chi: ['a', 'b'] } } } } as Trip
    const spese = tutteLeSpese(trip)
    const tutti = ricevuta(trip, spese, fx, undefined, 'a')
    // 300 mio + 200 di Gaia + 0 di chi non ha l'account (niente costi di cibo)
    expect(cat(tutti, 'Cibo').planned).toBe(500)
    expect(tutti.previsto).toBe(530)
    expect(ricevuta(trip, spese, fx, 'a').previsto).toBe(310)
  })

  it('un previsto rimasto del viaggio (app vecchia) vale diviso tra tutti per chi non ha il suo', () => {
    const trip = {
      ...base,
      expenseCategories: [{ id: 'cat-cibo', label: 'Cibo', planned: 90 }],
      previsti: { righe: { 'cat-cibo': { a: 100 } }, totali: { 'cat-cibo': { totale: 100, chi: ['a'] } } },
    } as unknown as Trip
    const spese = tutteLeSpese(trip)
    expect(cat(ricevuta(trip, spese, fx, undefined, 'a'), 'Cibo').planned).toBe(160)
    expect(cat(ricevuta(trip, spese, fx, 'b'), 'Cibo').planned).toBe(30)
  })
})
