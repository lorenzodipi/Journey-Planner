import { describe, expect, it } from 'vitest'
import { pickTrip } from './find-trip.mjs'

const rows = [
  { id: 'a', title: 'Giappone 2026', start: '2026-11-21', end: '2026-12-09', emails: ['io@example.com', 'gaia@example.com'] },
  { id: 'b', title: 'Giappone', start: null, end: null, emails: ['altro@example.com'] },
  { id: 'c', title: 'Cina 2027', start: null, end: null, emails: ['io@example.com'] },
]

describe('scelta del viaggio', () => {
  it('con il solo titolo ambiguo tra account diversi si ferma e li elenca', () => {
    expect(() => pickTrip(rows, { title: 'Giappone' })).toThrow(/altro@example\.com/)
  })

  it('l\'email esclude i viaggi degli altri account', () => {
    expect(pickTrip(rows, { title: 'Giappone', email: 'IO@example.com' }).id).toBe('a')
    expect(pickTrip(rows, { email: 'altro@example.com' }).id).toBe('b')
  })

  it('in scrittura serve l\'account (o l\'id)', () => {
    expect(() => pickTrip(rows, { title: 'Cina', needIdentity: true })).toThrow(/--email/)
    expect(pickTrip(rows, { title: 'Cina', email: 'io@example.com', needIdentity: true }).id).toBe('c')
    expect(pickTrip(rows, { tripId: 'b', needIdentity: true }).id).toBe('b')
  })

  it('con più viaggi dello stesso account chiede l\'id', () => {
    expect(() => pickTrip(rows, { email: 'io@example.com' })).toThrow(/--trip-id/)
  })

  it('l\'id non basta se l\'account non è del viaggio', () => {
    expect(() => pickTrip(rows, { tripId: 'b', email: 'io@example.com' })).toThrow(/non è dell'account/)
    expect(() => pickTrip(rows, { tripId: 'zzz' })).toThrow(/Nessun viaggio con id/)
  })

  it('segnala account o titolo inesistenti', () => {
    expect(() => pickTrip(rows, { email: 'nessuno@example.com' })).toThrow(/Nessun viaggio per l'account/)
    expect(() => pickTrip(rows, { title: 'Islanda', email: 'io@example.com' })).toThrow(/Nessun viaggio con «Islanda»/)
  })
})
