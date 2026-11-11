import { describe, expect, it } from 'vitest'
import { LARGHEZZA_MAPPA_ACCANTO, mappaAccanto } from './mappaAccanto'

describe('mappaAccanto', () => {
  it('sul telefono e sul pieghevole in verticale restano Elenco | Mappa', () => {
    for (const w of [320, 360, 390, 412, 600, 690, 839]) expect(mappaAccanto(w, false)).toBe(false)
  })
  it('da 840 px (pieghevole in orizzontale, computer) elenco e mappa stanno insieme', () => {
    for (const w of [LARGHEZZA_MAPPA_ACCANTO, 882, 1280, 1920]) expect(mappaAccanto(w, false)).toBe(true)
  })
  it('a libro mezzo aperto l’app sta in un segmento ed è un telefono', () => {
    expect(mappaAccanto(1800, true)).toBe(false)
  })
})

import { spostaADestra } from './shell'
import { giornoIniziale } from '../pages/Giorni'

describe('spostaADestra (gruppo mobile delle due colonne)', () => {
  it('passa a destra se sotto la colonna alta ci sta senza superare la sinistra', () => {
    expect(spostaADestra(900, 300, 400)).toBe(true)
    expect(spostaADestra(900, 484, 400)).toBe(true)
  })
  it('resta a sinistra se la destra diventerebbe più lunga', () => {
    expect(spostaADestra(900, 600, 400)).toBe(false)
    expect(spostaADestra(0, 0, 100)).toBe(false)
  })
})

describe('giornoIniziale (Giorni con il dettaglio accanto)', () => {
  const days = [{ id: 'd1', date: '2026-11-22' }, { id: 'd2', date: '2026-11-23' }, { id: 'd3', date: '2026-11-24' }]
  it('durante il viaggio: oggi', () => expect(giornoIniziale(days, '2026-11-23')).toBe('d2'))
  it('prima e dopo: il primo giorno', () => {
    expect(giornoIniziale(days, '2026-11-10')).toBe('d1')
    expect(giornoIniziale(days, '2026-12-02')).toBe('d1')
  })
  it('senza giorni: niente', () => expect(giornoIniziale([], '2026-11-10')).toBeUndefined())
})
