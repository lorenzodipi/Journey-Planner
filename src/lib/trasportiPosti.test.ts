import { describe, expect, it } from 'vitest'
import { transportExtras, type TransportInput } from './logistics'
import type { Transport } from '../types'

const base = { from: 'A', to: 'B', mode: 'train', departDate: '', departTime: '', arriveDate: '', arriveTime: '', fromPos: null, toPos: null, cost: null, currency: 'EUR', scope: 'total', bought: false, refCode: '', notes: '' } as unknown as TransportInput

describe('posti a sedere dei trasporti (0058)', () => {
  it('senza posti la colonna non si manda: prima della migrazione il salvataggio funziona come prima', () => {
    expect('seats' in transportExtras(base)).toBe(false)
    expect('seats' in transportExtras({ ...base, seats: '   ' })).toBe(false)
  })
  it('con i posti si salvano senza spazi ai lati', () => {
    expect(transportExtras({ ...base, seats: ' Carrozza 7, posti 12A e 12B ' }).seats).toBe('Carrozza 7, posti 12A e 12B')
  })
  it('svuotando il campo i posti di prima si cancellano', () => {
    const prima = { seats: '12A' } as Transport
    expect(transportExtras({ ...base, seats: '' }, prima).seats).toBeNull()
  })
})
