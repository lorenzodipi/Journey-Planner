import { describe, expect, it } from 'vitest'
import type { Documento } from '../types'
import { allarga, anteprimaImmagine, chiVede, controllaVisibilita, dimensione, perRiferimento, proponi, puoCambiare, senzaCollegamenti } from './documenti'

const doc = (o: Partial<Documento>): Documento => ({ id: 'd', path: 'p', name: 'x.pdf', visibility: 'all', access: [], links: [], createdAt: '2026-11-01', ...o })
const people = [{ id: 'a', name: 'Anna Rossi', userId: 'ua' }, { id: 'g', name: 'Giorgio', userId: 'ug' }]

describe('visibilità', () => {
  it('propone in base al tipo', () => {
    expect(proponi('conferma')).toEqual({ visibility: 'all', access: [] })
    expect(proponi('biglietto', ['a', 'g'])).toEqual({ visibility: 'selected', access: ['a', 'g'] })
    expect(proponi('personale')).toEqual({ visibility: 'private', access: [] })
  })
  it('selezionati vuole almeno una persona', () => {
    expect(controllaVisibilita('selected', [])).toMatch(/almeno una persona/)
    expect(controllaVisibilita('selected', ['a'])).toBe('')
    expect(controllaVisibilita('private', [])).toBe('')
  })
  it('avvisa solo quando la platea si allarga', () => {
    expect(allarga({ visibility: 'private', access: [] }, { visibility: 'all', access: [] })).toBe(true)
    expect(allarga({ visibility: 'private', access: [] }, { visibility: 'selected', access: ['a'] })).toBe(true)
    expect(allarga({ visibility: 'selected', access: ['a'] }, { visibility: 'selected', access: ['a', 'g'] })).toBe(true)
    expect(allarga({ visibility: 'selected', access: ['a', 'g'] }, { visibility: 'selected', access: ['a'] })).toBe(false)
    expect(allarga({ visibility: 'all', access: [] }, { visibility: 'private', access: [] })).toBe(false)
  })
  it('solo chi ha caricato può cambiarla', () => {
    expect(puoCambiare({ ownerId: 'ua' }, 'ua')).toBe(true)
    expect(puoCambiare({ ownerId: 'ua' }, 'ug')).toBe(false)
    expect(puoCambiare({ ownerId: 'ua' }, undefined)).toBe(false)
  })
  it('dice chi lo vede', () => {
    expect(chiVede(doc({}), people, 'ua')).toBe('Tutti')
    expect(chiVede(doc({ visibility: 'private', ownerId: 'ua' }), people, 'ua')).toBe('Solo tu')
    expect(chiVede(doc({ visibility: 'selected', access: ['a', 'g'] }), people, 'ua')).toBe('Anna, Giorgio')
  })
})

describe('elenchi e formati', () => {
  it('un documento, più collegamenti', () => {
    const d = doc({ id: '1', links: [{ kind: 'flight', refId: 'f1' }, { kind: 'stay', refId: 's1' }] })
    const liberi = doc({ id: '2' })
    expect(perRiferimento([d, liberi], 'flight', 'f1')).toEqual([d])
    expect(perRiferimento([d, liberi], 'stay', 's1')).toEqual([d])
    expect(perRiferimento([d, liberi], 'stay', 'x')).toEqual([])
    expect(senzaCollegamenti([d, liberi])).toEqual([liberi])
  })
  it('dimensioni e anteprima', () => {
    expect(dimensione(2048)).toBe('2 KB')
    expect(dimensione(1.5 * 1024 * 1024)).toBe('1,5 MB')
    expect(dimensione(undefined)).toBe('')
    expect(anteprimaImmagine({ name: 'a.PNG' })).toBe(true)
    expect(anteprimaImmagine({ name: 'a.pdf', mime: 'application/pdf' })).toBe(false)
  })
})
