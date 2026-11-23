import { describe, expect, it } from 'vitest'
import { calcola, eCalcolo, leggiImporto, premi } from './calcolo'
import { adattaQuote } from './quoteAdattive'

describe('calcoli nel campo dell\'importo', () => {
  it('le quattro operazioni, con × e ÷ prima di + e −', () => {
    expect(calcola('120+35,50')).toBe(155.5)
    expect(calcola('100−30')).toBe(70)
    expect(calcola('100-30')).toBe(70)
    expect(calcola('4×12,5')).toBe(50)
    expect(calcola('4*12,5')).toBe(50)
    expect(calcola('1000÷3')).toBe(333.33)
    expect(calcola('1000/3')).toBe(333.33)
    expect(calcola('2+3×4')).toBe(14)
    expect(calcola('10−2÷4+1')).toBe(10.5)
    expect(calcola('1.234,50+0,50')).toBe(1235)
  })
  it('un segno in fondo si ignora, due segni di fila vale l\'ultimo', () => {
    expect(calcola('100+')).toBe(100)
    expect(calcola('5+×2')).toBe(10)
  })
  it('divisione per zero, risultato negativo o numeri sbagliati: nessun valore', () => {
    expect(calcola('5÷0')).toBeNull()
    expect(calcola('5−10')).toBeNull()
    expect(calcola('5,,5+1')).toBeNull()
    expect(calcola('')).toBeNull()
  })
  it('un importo semplice resta un importo', () => {
    expect(eCalcolo('1.234,50')).toBe(false)
    expect(eCalcolo('12+3')).toBe(true)
    expect(leggiImporto('1.234,50')).toBe(1234.5)
    expect(leggiImporto('12+3')).toBe(15)
  })
  it('tastierino: cifre, virgola, segni e cancella', () => {
    let t = ''
    for (const k of ['+', '0', '0', '5', ',', ',', '5', '+', '−', '3', '⌫', '2']) t = premi(t, k)
    expect(t).toBe('5,5−2')
    expect(premi('12+', ',')).toBe('12+0,')
    expect(premi('12,', '×')).toBe('12×')
    expect(calcola('5,5−2')).toBe(3.5)
  })
})

describe('quote che si adattano (in % o a importi)', () => {
  const due = ['io', 'gaia']
  const tre = ['io', 'gaia', 'luca']
  it('due persone: scrivo la quota di una, l\'altra diventa il resto', () => {
    expect(adattaQuote('fixed', due, { io: '500', gaia: '400' }, new Set(['gaia']), 1000)).toEqual({ io: '600', gaia: '400' })
    expect(adattaQuote('percent', due, { io: '50', gaia: '30' }, new Set(['gaia']), 1000)).toEqual({ io: '70', gaia: '30' })
  })
  it('due persone, scritte tutte e due: non cambia più niente', () => {
    expect(adattaQuote('fixed', due, { io: '700', gaia: '400' }, new Set(['gaia', 'io']), 1000)).toEqual({ io: '700', gaia: '400' })
  })
  it('tre persone: le non toccate si dividono il resto, quelle scritte non si toccano', () => {
    const a = adattaQuote('fixed', tre, { io: '333,34', gaia: '400', luca: '333,33' }, new Set(['gaia']), 1000)
    expect(a).toEqual({ io: '300', gaia: '400', luca: '300' })
    const b = adattaQuote('fixed', tre, { ...a, luca: '100' }, new Set(['gaia', 'luca']), 1000)
    expect(b).toEqual({ io: '500', gaia: '400', luca: '100' })
    // ora sono tutte scritte: cambiare Gaia non sposta le altre
    expect(adattaQuote('fixed', tre, { ...b, gaia: '350', io: '500' }, new Set(['gaia', 'luca', 'io']), 1000)).toEqual({ io: '500', gaia: '350', luca: '100' })
  })
  it('il resto non divisibile va ai centesimi, la somma torna sempre', () => {
    const a = adattaQuote('fixed', tre, { io: '', gaia: '1', luca: '' }, new Set(['gaia']), 100)
    expect(a).toEqual({ io: '49,5', gaia: '1', luca: '49,5' })
    const p = adattaQuote('percent', tre, { io: '', gaia: '', luca: '10' }, new Set(['luca']), null)
    expect(p).toEqual({ io: '45', gaia: '45', luca: '10' })
    const q = adattaQuote('fixed', ['a', 'b', 'c', 'd'], { a: '10' }, new Set(['a']), 100)
    expect(Object.values(q).reduce((s, v) => s + Number(v.replace(',', '.')), 0)).toBeCloseTo(100)
  })
  it('se le quote scritte superano il totale, le altre vanno a 0 (il controllo dice quanto avanza)', () => {
    expect(adattaQuote('fixed', due, { io: '500', gaia: '1200' }, new Set(['gaia']), 1000)).toEqual({ io: '0', gaia: '1200' })
  })
  it('senza importo (a importi) o con parti uguali non si adatta niente', () => {
    expect(adattaQuote('fixed', due, { io: '', gaia: '400' }, new Set(['gaia']), null)).toEqual({ io: '', gaia: '400' })
    expect(adattaQuote('equal', due, {}, new Set(['gaia']), 1000)).toEqual({})
  })
  it('il totale cambia: con nessuna quota scritta si torna in parti uguali', () => {
    expect(adattaQuote('fixed', due, { io: '500', gaia: '500' }, new Set(), 1200)).toEqual({ io: '600', gaia: '600' })
  })
})
