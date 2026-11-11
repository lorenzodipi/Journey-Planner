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
