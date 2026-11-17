import { describe, expect, it } from 'vitest'
import { cercaVoci, normalizza } from './cerca'

const voci = [
  { id: 'NRT', codice: 'NRT', label: 'Narita International Airport', detail: 'Narita, Giappone', altro: 'TYO, Tokyo' },
  { id: 'HND', codice: 'HND', label: 'Tokyo Haneda International Airport', detail: 'Tokyo, Giappone' },
  { id: 'FCO', codice: 'FCO', label: 'Rome–Fiumicino Leonardo da Vinci International Airport', detail: 'Roma, Italia' },
  { id: 'FCN', codice: 'FCN', label: 'Nordholz', detail: 'Cuxhaven, Germania' },
  { id: 'IST', codice: 'IST', label: 'İstanbul Airport', detail: 'Istanbul, Turchia' },
]

describe('ricerca nei campi scrivibili', () => {
  it('ignora accenti, maiuscole e segni', () => {
    expect(normalizza('  İstanbul–Rome ')).toBe('istanbul rome')
  })
  it('mette per primo il codice esatto, poi chi comincia con il testo', () => {
    expect(cercaVoci(voci, 'fco').map((v) => v.id)).toEqual(['FCO'])
    expect(cercaVoci(voci, 'fc').map((v) => v.id)).toEqual(['FCO', 'FCN'])
  })
  it('cerca anche in città e parole chiave, con più parole in qualsiasi ordine', () => {
    expect(cercaVoci(voci, 'tokyo').map((v) => v.id)).toEqual(['HND', 'NRT'])
    expect(cercaVoci(voci, 'roma fiumicino').map((v) => v.id)).toEqual(['FCO'])
    expect(cercaVoci(voci, 'istanbul').map((v) => v.id)).toEqual(['IST'])
  })
  it('limita i risultati e non trova niente con il testo vuoto', () => {
    expect(cercaVoci(voci, 'a', 2)).toHaveLength(2)
    expect(cercaVoci(voci, '   ')).toEqual([])
  })
})
