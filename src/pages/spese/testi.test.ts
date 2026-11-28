import { describe, expect, it } from 'vitest'
import type { Traveler } from '../../types'
import { righeSpesa, testoVerso } from './testi'

describe('testoVerso', () => {
  it('finché non è pagato dice cosa resta da fare', () => {
    expect(testoVerso({ verso: 'devo', stato: 'da_pagare' }, 'Lorenzo')).toBe('Da dare a Lorenzo')
    expect(testoVerso({ verso: 'devono', stato: 'in_attesa' }, 'Gaia')).toBe('Da ricevere da Gaia')
  })
  it('a conti chiusi dice cosa è successo', () => {
    expect(testoVerso({ verso: 'devo', stato: 'pagato' }, 'Lorenzo')).toBe('Dati a Lorenzo')
    expect(testoVerso({ verso: 'devono', stato: 'pagato' }, 'Gaia')).toBe('Ricevuti da Gaia')
  })
})

describe('righeSpesa', () => {
  const viaggiatori = [{ id: 'a', name: 'Lorenzo Rossi' }, { id: 'b', name: 'Gaia Verdi' }] as Traveler[]
  const trip = { travelers: viaggiatori, stays: [] }
  it('due linee fisse: chi ha pagato, poi per chi, senza il puntino in mezzo', () => {
    expect(righeSpesa({ paidBy: 'a', shares: [] } as never, trip, 'b')).toEqual(['Pagata da Lorenzo', 'Per tutti'])
    expect(righeSpesa({ payers: [{ travelerId: 'a', amount: 5 }, { travelerId: 'b', amount: 5 }], shares: [] } as never, trip, 'b')).toEqual(['Pagata da Lorenzo e te', 'Per tutti'])
  })
  it('una sola linea se manca chi ha pagato', () => {
    expect(righeSpesa({ shares: [] } as never, trip, 'b')).toEqual(['Per tutti'])
  })
})
