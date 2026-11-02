import { describe, expect, it } from 'vitest'
import { durataComeOra, oraComeDurata } from './durataOra'

describe('durata come orario', () => {
  it('converte i testi più comuni', () => {
    expect(durataComeOra('')).toBe('')
    expect(durataComeOra('90')).toBe('01:30')
    expect(durataComeOra('1h 30min')).toBe('01:30')
    expect(durataComeOra('45 min')).toBe('00:45')
    expect(durataComeOra('01:30')).toBe('01:30')
  })
  it('24 ore o più e testi poco chiari restano a mano', () => {
    expect(durataComeOra('24h')).toBeNull()
    expect(durataComeOra('boh')).toBeNull()
  })
  it('00:00 vuol dire nessuna durata', () => {
    expect(oraComeDurata('00:00')).toBe('')
    expect(oraComeDurata('02:15')).toBe('02:15')
    expect(oraComeDurata('')).toBe('')
  })
})
