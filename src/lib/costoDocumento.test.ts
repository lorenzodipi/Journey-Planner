import { describe, expect, it } from 'vitest'
import { spesaDaCosto } from '../pages/documenti/DocumentoSheet'
import type { Trip } from '../types'

const trip = { baseCurrency: 'EUR', localCurrency: 'JPY', fxRate: 0.0056, timezone: 'Europe/Rome', startDate: '2026-11-21', travelers: [{ id: 'a', name: 'Lorenzo' }, { id: 'b', name: 'Gaia' }] } as unknown as Trip
const c = { importo: '45,90', valuta: 'EUR', categoria: 'Altro', paidBy: 'a' }

describe('costo di un documento', () => {
  it('senza importo non crea nessuna spesa', () => {
    expect(spesaDaCosto(trip, { ...c, importo: '' }, 'Assicurazione', 'd1')).toBeNull()
  })
  it('con importo crea una spesa collegata al documento, divisa tra tutti', () => {
    const r = spesaDaCosto(trip, c, 'Assicurazione', 'd1')
    expect(r && 'input' in r && r.input).toMatchObject({ label: 'Assicurazione', amount: 45.9, currency: 'EUR', category: 'Altro', paidBy: 'a', source: { kind: 'document', id: 'd1' }, travelerIds: ['a', 'b'] })
  })
  it('importo non valido o pagante mancante: messaggio', () => {
    expect(spesaDaCosto(trip, { ...c, importo: 'abc' }, 'X', 'd1')).toHaveProperty('errore')
    expect(spesaDaCosto(trip, { ...c, paidBy: '' }, 'X', 'd1')).toHaveProperty('errore')
  })
  it('in yen usa il cambio del viaggio', () => {
    const r = spesaDaCosto(trip, { ...c, valuta: 'JPY', importo: '5000' }, 'X', 'd1')
    expect(r && 'input' in r && r.input.fxRate).toBe(0.0056)
  })
})
