import { describe, expect, it } from 'vitest'
import { testoVerso } from './testi'

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
