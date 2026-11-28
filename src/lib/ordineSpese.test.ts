import { describe, expect, it } from 'vitest'
import { piuRecentiPrima, poiInseritaPrima } from './ordineSpese'

const s = (id: string, spentAt: string, createdAt?: string) => ({ id, spentAt, createdAt })

describe('ordine delle spese', () => {
  it('il giorno più recente sta sopra', () => {
    const l = [s('a', '2026-11-20T12:00:00Z'), s('b', '2026-11-22T12:00:00Z'), s('c', '2026-11-21T12:00:00Z')]
    expect(l.sort(piuRecentiPrima).map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('nello stesso giorno l\'ultima inserita sta sopra', () => {
    const g = '2026-11-20T12:00:00Z'
    const l = [s('uno', g, '2026-11-20T08:00:00Z'), s('tre', g, '2026-11-20T18:30:00Z'), s('due', g, '2026-11-20T10:00:00Z')]
    expect(l.sort(piuRecentiPrima).map((x) => x.id)).toEqual(['tre', 'due', 'uno'])
  })

  it('senza data di inserimento non si rompe: le spese di prima vanno in fondo al giorno', () => {
    const g = '2026-11-20T12:00:00Z'
    const l = [s('vecchia', g), s('nuova', g, '2026-11-20T10:00:00Z')]
    expect(l.sort(piuRecentiPrima).map((x) => x.id)).toEqual(['nuova', 'vecchia'])
    expect(poiInseritaPrima({}, {})).toBe(0)
  })
})
