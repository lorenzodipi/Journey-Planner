import { describe, expect, it } from 'vitest'
import { leggiCodici, scriviCodici } from './codiciAccesso'

describe('codici d\'accesso dell\'alloggio', () => {
  it('un alloggio salvato prima ha un codice semplice: si legge e si riscrive uguale', () => {
    expect(leggiCodici('4821')).toEqual([{ nome: '', codice: '4821' }])
    expect(scriviCodici([{ nome: '', codice: '4821' }])).toBe('4821')
  })

  it('niente codice, niente valore', () => {
    expect(leggiCodici(undefined)).toEqual([])
    expect(leggiCodici('  ')).toEqual([])
    expect(scriviCodici([])).toBe('')
    expect(scriviCodici([{ nome: 'Portone', codice: ' ' }])).toBe('')
  })

  it('più codici, con o senza nome, vanno e vengono', () => {
    const v = scriviCodici([{ nome: 'Portone', codice: '1234#' }, { nome: '', codice: '9876' }])
    expect(leggiCodici(v)).toEqual([{ nome: 'Portone', codice: '1234#' }, { nome: '', codice: '9876' }])
  })

  it('un codice solo ma con un nome si salva come elenco e non si perde il nome', () => {
    const v = scriviCodici([{ nome: 'Stanza', codice: '55' }])
    expect(v.startsWith('[')).toBe(true)
    expect(leggiCodici(v)).toEqual([{ nome: 'Stanza', codice: '55' }])
  })

  it('i codici vuoti in mezzo si scartano', () => {
    expect(scriviCodici([{ nome: 'A', codice: '' }, { nome: '', codice: '77' }])).toBe('77')
  })

  it('un codice che comincia con una parentesi quadra e non è un elenco resta un codice', () => {
    expect(leggiCodici('[1234]')).toEqual([{ nome: '', codice: '[1234]' }])
    expect(leggiCodici('[abc')).toEqual([{ nome: '', codice: '[abc' }])
    expect(scriviCodici([{ nome: '', codice: '[1234]' }])).toBe('[1234]')
  })
})
