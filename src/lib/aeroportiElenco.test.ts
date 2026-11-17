import { describe, expect, it } from 'vitest'
import dati from '../data/aeroporti.json'
import { datiValidi } from './aeroportiElenco'

describe('elenco degli aeroporti nell\'app', () => {
  it('è valido e ha codice, nome, città, paese e fuso dei principali aeroporti', () => {
    expect(datiValidi(dati)).toBe(true)
    const fco = (dati.voci as string[][]).find((r) => r[0] === 'FCO')
    expect(fco?.[3]).toBe('IT')
    expect(fco?.[4]).toBe('Europe/Rome')
    expect((dati.voci as string[][]).find((r) => r[0] === 'HND')?.[4]).toBe('Asia/Tokyo')
  })
  it('scarta un file rotto o troppo corto', () => {
    expect(datiValidi({ aggiornato: '2026-12-01', voci: [['FCO', 'x', 'y', 'IT', 'Europe/Rome', '']] })).toBe(false)
    expect(datiValidi(null)).toBe(false)
  })
})
