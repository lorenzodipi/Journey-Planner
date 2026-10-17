import { describe, expect, it } from 'vitest'
import { bookingColumns, mapBookings, safeUrl, type BookingInput } from './planningData'

const base: BookingInput = {
  type: 'train', title: ' Shinkansen ', code: '', url: '', validFrom: '2026-11-26', validTo: '2026-11-26',
  keepOffline: true, notes: '', file: null, removeFile: false,
}

describe('prenotazioni', () => {
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
