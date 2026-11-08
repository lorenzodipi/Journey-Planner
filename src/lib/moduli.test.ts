import { describe, expect, it } from 'vitest'
import { alterna, alternaPersona, compilati, conseguenzaCosto, durataTesto, modoPerChi, nottiTesto, selezionePerModo } from './moduli'

describe('durataTesto', () => {
  it('scrive minuti e ore', () => {
    expect(durataTesto(45)).toBe('45 min')
    expect(durataTesto(180)).toBe('3 h')
    expect(durataTesto(209)).toBe('3 h 29 min')
    expect(durataTesto(1565)).toBe('26 h 5 min')
  })
  it('tace se la durata non ha senso', () => {
    expect(durataTesto(0)).toBe('')
    expect(durataTesto(-30)).toBe('')
    expect(durataTesto(null)).toBe('')
    expect(durataTesto(Number.NaN)).toBe('')
  })
})

describe('nottiTesto', () => {
  it('conta le notti', () => {
    expect(nottiTesto('2026-11-29', '2026-12-04')).toBe('5 notti')
    expect(nottiTesto('2026-11-29', '2026-11-30')).toBe('1 notte')
  })
  it('tace con date mancanti o al contrario', () => {
    expect(nottiTesto('2026-11-29', '')).toBe('')
    expect(nottiTesto('2026-11-29', '2026-11-29')).toBe('')
    expect(nottiTesto('2026-12-04', '2026-11-29')).toBe('')
  })
})

describe('Per chi', () => {
  const due = ['lor', 'gai']
  const tre = ['lor', 'gai', 'ste']
  it('riconosce il riquadro dalla selezione', () => {
    expect(modoPerChi(due, due, 'lor', false)).toBe('all')
    expect(modoPerChi([], due, 'lor', false)).toBe('all')
    expect(modoPerChi(['lor'], due, 'lor', false)).toBe('me')
    expect(modoPerChi(['gai'], due, 'lor', false)).toBe('solo:gai')
    expect(modoPerChi(['gai'], due, null, false)).toBe('solo:gai')
    expect(modoPerChi(['lor', 'ste'], tre, 'lor', false)).toBe('pick')
    expect(modoPerChi(['gai'], tre, 'lor', false)).toBe('pick')
    expect(modoPerChi(tre, tre, 'lor', true)).toBe('pick')
    expect(modoPerChi(due, due, 'lor', true)).toBe('all')
  })
  it('dà le persone di ogni riquadro', () => {
    expect(selezionePerModo('all', ['lor'], tre, 'lor')).toEqual(tre)
    expect(selezionePerModo('me', tre, tre, 'lor')).toEqual(['lor'])
    expect(selezionePerModo('me', tre, tre, null)).toEqual(tre)
    expect(selezionePerModo('solo:gai', due, due, 'lor')).toEqual(['gai'])
    expect(selezionePerModo('pick', ['ste', 'lor'], tre, 'lor')).toEqual(['lor', 'ste'])
    expect(selezionePerModo('pick', [], tre, 'lor')).toEqual(tre)
  })
  it('non lascia mai la scelta vuota e tiene l’ordine del viaggio', () => {
    expect(alternaPersona(['lor'], 'lor', tre)).toEqual(['lor'])
    expect(alternaPersona(['ste', 'lor'], 'gai', tre)).toEqual(tre)
    expect(alternaPersona(tre, 'gai', tre)).toEqual(['lor', 'ste'])
  })
})

describe('conseguenzaCosto', () => {
  it('mostra l’altra lettura dello stesso numero', () => {
    const c = conseguenzaCosto(80, 2, 'EUR')
    expect(c.perPersona).toMatch(/^160,00\s€ in tutto$/)
    expect(c.totale).toMatch(/^40,00\s€ a testa$/)
  })
  it('tace senza importo o con una persona', () => {
    expect(conseguenzaCosto(null, 2, 'EUR')).toEqual({ perPersona: '', totale: '' })
    expect(conseguenzaCosto(80, 1, 'EUR')).toEqual({ perPersona: '', totale: '' })
  })
})

describe('compilati e alterna', () => {
  it('conta solo i campi pieni', () => {
    expect(compilati(['', '  ', 'T1', [], ['a'], null, undefined, 2, false, true])).toBe(4)
  })
  it('la stessa scelta toglie la scelta', () => {
    expect(alterna('1', '1')).toBe('')
    expect(alterna('', '2')).toBe('2')
    expect(alterna('1', '3')).toBe('3')
  })
})
