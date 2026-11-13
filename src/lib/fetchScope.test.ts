import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: string[] = []
let rpcCalls = 0
const rows: Record<string, unknown[]> = {
  trips: [
    {
      id: 't1',
      title: 'Giappone',
      destination: 'Giappone',
      start_date: '2026-11-21',
      end_date: '2026-11-22',
      timezone: 'Asia/Tokyo',
      home_timezone: 'Europe/Rome',
      base_currency: 'EUR',
      local_currency: 'JPY',
      theme: 'japan',
      center_lat: 35.68,
      center_lng: 139.69,
      fx_rate: null,
      trip_travelers: [],
      days: [],
    },
  ],
  places: [{ id: 'p1', trip_id: 't1', name: 'Senso-ji', city: 'Tokyo', status: 'idea', lat: 1, lng: 2 }],
}

vi.mock('./db', () => ({
  client: () => ({
    from: (table: string) => {
      calls.push(table)
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'is', 'order']) q[m] = () => q
      q.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve({ data: rows[table] ?? [], error: null }).then(ok, ko)
      return q
    },
    rpc: () => {
      rpcCalls++
      return Promise.resolve({ data: [], error: null })
    },
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) },
  }),
}))

import { fetchTrips, forgetFetched, scopeOfOps, scopeOfTable } from './tripApi'

describe('ricaricamento solo di ciò che cambia', () => {
  beforeEach(() => {
    calls.length = 0
    rpcCalls = 0
    forgetFetched()
  })

  it('il caricamento completo legge tutte le 29 tabelle (con i costi privati) e le persone di ogni viaggio', async () => {
    const trips = await fetchTrips()
    expect(calls).toHaveLength(29)
    expect(rpcCalls).toBe(2)
    expect(trips[0].places.map((p) => p.name)).toEqual(['Senso-ji'])
  })

  it('dopo una modifica ai luoghi si rileggono solo i luoghi (e i loro costi privati), senza le persone', async () => {
    await fetchTrips()
    calls.length = 0
    rpcCalls = 0
    rows.places = [...rows.places, { id: 'p2', trip_id: 't1', name: 'Ueno', city: 'Tokyo', status: 'idea', lat: 1, lng: 2 }]
    const trips = await fetchTrips(['places'])
    expect(calls).toEqual(['places', 'trip_costs'])
    expect(rpcCalls).toBe(0)
    expect(trips[0].places.map((p) => p.name)).toEqual(['Senso-ji', 'Ueno'])
  })

  it('più gruppi insieme: solo le loro tabelle', async () => {
    await fetchTrips()
    calls.length = 0
    await fetchTrips(['money', 'expenseCategories'])
    expect(calls.sort()).toEqual(['budget_item_shares', 'budget_items', 'expense_categories', 'expense_files', 'expense_payers', 'expense_shares', 'expenses', 'settlements'])
  })

  it('senza una copia già scaricata ricarica tutto, anche se si chiede una parte', async () => {
    await fetchTrips(['places'])
    expect(calls).toHaveLength(29)
  })

  it('le tabelle sconosciute non hanno un gruppo (quindi si ricarica tutto)', () => {
    expect(scopeOfTable('places')).toBe('places')
    expect(scopeOfTable('checklist_items')).toBe('planning')
    expect(scopeOfTable('boh')).toBeNull()
  })

  it('dalle modifiche in coda si ricavano i gruppi da ricaricare', () => {
    expect(scopeOfOps([{ k: 'update', table: 'checklist_items', id: 'a', patch: {} }, { k: 'updateMany', table: 'checklist_items', ids: ['b'], patch: {} }])).toEqual(['planning'])
    expect(scopeOfOps([{ k: 'upsert', table: 'expenses', row: {} }, { k: 'expenseShares', tripId: 't', expenseId: 'e', travelerIds: [] }, { k: 'update', table: 'day_items', id: 'i', patch: {} }])).toEqual(['money', 'items'])
    expect(scopeOfOps([{ k: 'update', table: 'tabella_nuova', id: 'a', patch: {} }])).toBeUndefined()
    expect(scopeOfOps([])).toBeUndefined()
  })
})

describe('costi privati (0049)', () => {
  beforeEach(() => forgetFetched())
  it('i costi di trip_costs prendono il posto delle colonne; senza riga resta la colonna', async () => {
    rows.places = [{ id: 'p1', trip_id: 't1', name: 'Senso-ji', city: 'Tokyo', status: 'idea', lat: 1, lng: 2, est_cost: null }, { id: 'p3', trip_id: 't1', name: 'Ueno', city: 'Tokyo', status: 'idea', est_cost: 5 }]
    rows.trip_costs = [{ kind: 'place', ref_id: 'p1', data: { est_cost: 12 } }, { kind: 'trip', ref_id: 't1', data: { budget_limit: 2000 } }]
    const [trip] = await fetchTrips()
    expect(trip.places.map((p) => [p.name, p.estCost])).toEqual([['Senso-ji', 12], ['Ueno', 5]])
    expect(trip.budgetLimit).toBe(2000)
    delete rows.trip_costs
  })
})
