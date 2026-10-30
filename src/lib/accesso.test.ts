import { describe, expect, it } from 'vitest'
import { erroreEmail } from './accesso'

describe('erroreEmail', () => {
  it('accetta indirizzi normali e il vuoto', () => {
    expect(erroreEmail('')).toBeNull()
    expect(erroreEmail(' nome@esempio.it ')).toBeNull()
  })
  it('spiega cosa manca', () => {
    expect(erroreEmail('nome')).toMatch(/Manca la chiocciola/)
    expect(erroreEmail('nome@')).toMatch(/dopo la chiocciola/)
    expect(erroreEmail('nome@esempio')).toMatch(/dopo la chiocciola/)
    expect(erroreEmail('@esempio.it')).toMatch(/prima della chiocciola/)
    expect(erroreEmail('a b@esempio.it')).toMatch(/non è scritto bene/)
  })
})
