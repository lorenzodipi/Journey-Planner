import { describe, expect, it } from 'vitest'
import { bookingColumns, mapBookings, safeUrl, type BookingInput } from './planningData'

const base: BookingInput = {
  type: 'train', title: ' Shinkansen ', code: '', url: '', validFrom: '2026-11-26', validTo: '2026-11-26',
  keepOffline: true, notes: '', cost: null, currency: 'EUR', scope: 'per_person', payerIds: [], file: null, removeFile: false,
}

describe('prenotazioni', () => {
  it('senza costo le colonne del costo non viaggiano (funziona anche prima della migrazione 0010)', () => {
    expect(bookingColumns(base, 'Asia/Tokyo')).not.toHaveProperty('cost')
    expect(bookingColumns(base, 'Asia/Tokyo')).not.toHaveProperty('payer_ids')
  })

  it('con il costo salva importo, valuta, a persona/totale e chi ha pagato', () => {
    const c = bookingColumns({ ...base, type: 'insurance', cost: 42.5, currency: 'eur', scope: 'total', payerIds: ['a', 'b'] }, 'Asia/Tokyo')
    expect(c).toMatchObject({ cost: 42.5, currency: 'EUR', scope: 'total', payer_ids: ['a', 'b'] })
  })

  it('togliere un costo già salvato lo azzera', () => {
    const c = bookingColumns({ ...base, payerIds: ['a'] }, 'Asia/Tokyo', true)
    expect(c).toMatchObject({ cost: null, payer_ids: [] })
  })

  it('legge il costo dalla riga (numeric arriva come testo)', () => {
    const [b] = mapBookings(
      [{ id: '1', trip_id: 't', type: 'insurance', title: 'Polizza', confirmation_code: null, url: null, valid_from: null, valid_to: null, file_path: null, keep_offline: false, notes: null, cost: '42.50', currency: 'EUR', scope: 'total', payer_ids: ['a'] }],
      't',
    )
    expect(b).toMatchObject({ cost: 42.5, currency: 'EUR', scope: 'total', payerIds: ['a'] })
  })

  it('valido tutto il giorno, nel fuso del viaggio', () => {
    const c = bookingColumns(base, 'Asia/Tokyo')
    expect(c.valid_from).toBe('2026-11-25T15:00:00.000Z') // 00:00 a Tokyo
    expect(c.valid_to).toBe('2026-11-26T14:59:00.000Z') // 23:59 a Tokyo
    expect(c.title).toBe('Shinkansen')
    expect(c.confirmation_code).toBeNull()
  })

  it('date vuote restano nulle', () => {
    const c = bookingColumns({ ...base, validFrom: '', validTo: '' }, 'Asia/Tokyo')
    expect(c.valid_from).toBeNull()
    expect(c.valid_to).toBeNull()
  })

  it('accetta solo indirizzi http/https', () => {
    expect(safeUrl('example.com/biglietto')).toBe('https://example.com/biglietto')
    expect(safeUrl('http://example.com')).toBe('http://example.com/')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('data:text/html,x')).toBeNull()
    expect(safeUrl('  ')).toBeNull()
  })

  it('ordina per inizio validità', () => {
    const row = { trip_id: 't', type: 'other' as const, confirmation_code: null, url: null, valid_to: null, file_path: null, keep_offline: false, notes: null }
    const list = mapBookings([
      { ...row, id: 'b', title: 'B', valid_from: '2026-11-30T00:00:00Z' },
      { ...row, id: 'a', title: 'A', valid_from: '2026-11-22T00:00:00Z' },
      { ...row, id: 'c', title: 'C', valid_from: null },
    ], 't')
    expect(list.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})
