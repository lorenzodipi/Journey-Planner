import { describe, expect, it } from 'vitest'
import { convert, outstanding, outstandingForPerson, perPerson, totalFor } from './money'

// Cifre FITTIZIE, solo per verificare la logica.
describe('soldi', () => {
  it('per persona e totale', () => {
    expect(perPerson(500, 'per_person', 2)).toBe(500)
    expect(perPerson(1000, 'total', 2)).toBe(500)
    expect(totalFor(500, 'per_person', 2)).toBe(1000)
    expect(totalFor(1000, 'total', 2)).toBe(1000)
  })

  it('residuo da pagare di una voce', () => {
    expect(outstanding({ amount: 100, scope: 'per_person', paidCount: 0 }, 2)).toBe(200)
    expect(outstanding({ amount: 100, scope: 'per_person', paidCount: 1 }, 2)).toBe(100)
    expect(outstanding({ amount: 100, scope: 'per_person', paidCount: 2 }, 2)).toBe(0)
    expect(outstanding({ amount: 90, scope: 'total', paidCount: 1 }, 3)).toBe(60)
  })

  it('residuo di una persona, come SUMIF(Pagato; FALSE; Prezzo) del foglio', () => {
    const lines = [
      { amount: 600, scope: 'per_person' as const, paid: true },
      { amount: 200, scope: 'per_person' as const, paid: false },
      { amount: 30, scope: 'per_person' as const, paid: false },
    ]
    expect(outstandingForPerson(lines, 2)).toBe(230)
  })

  it('conversione di valuta', () => {
    expect(convert(10_000, 0.0061)).toBe(61)
  })
})
