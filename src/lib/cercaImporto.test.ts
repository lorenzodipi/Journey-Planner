import { describe, expect, it } from 'vitest'
import { corrispondeSpesa, decimaliValuta, importiDellaSpesa, type ImportoCercabile } from './cercaImporto'
import type { FxContext } from './budget'

// due valute: 1 EUR = 20 JPY (il cambio è «unità di base per 1 unità»: 1 JPY = 0,05 EUR)
const fx: FxContext = { base: 'EUR', local: 'JPY', rate: 0.05 }
const cerca = (q: string, importi: ImportoCercabile[], ...campi: string[]) => corrispondeSpesa(q, campi, importi)
const eur = (v: number): ImportoCercabile => ({ valore: v, decimali: 2 })

describe('ricerca delle spese per importo', () => {
  it('una spesa in una valuta si trova anche con l\'importo nell\'altra', () => {
    const imp = importiDellaSpesa({ amount: 1, currency: 'EUR' }, fx)
    expect(imp).toEqual([{ valore: 1, decimali: 2 }, { valore: 20, decimali: 0 }])
    expect(cerca('20', imp)).toBe(true)
    expect(cerca('1', imp)).toBe(true)
    const yen = importiDellaSpesa({ amount: 20, currency: 'JPY' }, fx)
    expect(cerca('1,', yen)).toBe(true)
    expect(cerca('20 ', yen)).toBe(true)
  })

  it('il cambio salvato sulla spesa vale più di quello del viaggio', () => {
    const imp = importiDellaSpesa({ amount: 1000, currency: 'JPY', fxRate: 0.006 }, fx)
    expect(imp.map((i) => i.valore)).toEqual([1000, 6])
  })

  it('«1» trova ogni importo con un 1 nella parte intera, anche 10 e 21', () => {
    expect(cerca('1', [eur(1)])).toBe(true)
    expect(cerca('1', [eur(10)])).toBe(true)
    expect(cerca('1', [eur(21.5)])).toBe(true)
    expect(cerca('1', [eur(0.15)])).toBe(false)
    expect(cerca('1', [eur(25)])).toBe(false)
  })

  it('«1,», «1.» e «1 » vogliono solo 1 unità intera', () => {
    for (const q of ['1,', '1.', '1 ']) {
      expect(cerca(q, [eur(1)])).toBe(true)
      expect(cerca(q, [eur(1.99)])).toBe(true)
      expect(cerca(q, [eur(11)])).toBe(false)
      expect(cerca(q, [eur(10)])).toBe(false)
      expect(cerca(q, [eur(21)])).toBe(false)
    }
  })

  it('«1,5» vuole parte intera 1 e decimali che cominciano con 5', () => {
    expect(cerca('1,5', [eur(1.5)])).toBe(true)
    expect(cerca('1,5', [eur(1.55)])).toBe(true)
    expect(cerca('1,5', [eur(1.05)])).toBe(false)
    expect(cerca('1,5', [eur(11.5)])).toBe(false)
    expect(cerca('1,50', [eur(1.5)])).toBe(true)
    // lo yen non ha decimali
    expect(cerca('1,5', [{ valore: 1, decimali: 0 }])).toBe(false)
  })

  it('migliaia e simboli attaccati', () => {
    expect(cerca('1.234', [{ valore: 1234, decimali: 0 }])).toBe(true)
    expect(cerca('1.234,5', [eur(1234.5)])).toBe(true)
    expect(cerca('€12', [eur(12)])).toBe(true)
    expect(cerca('12€', [eur(112)])).toBe(true)
  })

  it('numeri e parole insieme: tutte devono rispondere', () => {
    const imp = [eur(12)]
    expect(cerca('ramen 12', imp, 'Ramen a Shibuya')).toBe(true)
    expect(cerca('ramen 13', imp, 'Ramen a Shibuya')).toBe(false)
    expect(cerca('sushi 12', imp, 'Ramen a Shibuya')).toBe(false)
    expect(cerca('', imp, 'Ramen')).toBe(true)
  })

  it('le sole cifre si cercano anche nel testo, «1,» no', () => {
    expect(cerca('7', [eur(3)], '7-Eleven')).toBe(true)
    expect(cerca('7,', [eur(3)], '7-Eleven')).toBe(false)
  })

  it('decimali delle valute', () => {
    expect(decimaliValuta('JPY')).toBe(0)
    expect(decimaliValuta('EUR')).toBe(2)
    expect(decimaliValuta('XXX?')).toBe(2)
  })
})
