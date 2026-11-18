import { describe, expect, it } from 'vitest'
import { etichettaLink, pezziConLink } from './link'

describe('link nelle note', () => {
  it('riconosce i link e lascia il resto del testo', () => {
    expect(pezziConLink('Check-in qui: https://esempio.it/app/check-in-guide/20F6. Grazie')).toEqual([
      { testo: 'Check-in qui: ' },
      { url: 'https://esempio.it/app/check-in-guide/20F6', etichetta: 'esempio.it/app/check-in-guide/20F6' },
      { testo: '. Grazie' },
    ])
  })
  it('accetta i link che cominciano con www e tiene le parentesi aperte nel link', () => {
    expect(pezziConLink('(vedi www.esempio.it)')).toEqual([{ testo: '(vedi ' }, { url: 'https://www.esempio.it', etichetta: 'esempio.it' }, { testo: ')' }])
    expect(pezziConLink('https://it.wikipedia.org/wiki/Tokyo_(città)')[0]).toEqual({ url: 'https://it.wikipedia.org/wiki/Tokyo_(città)', etichetta: 'it.wikipedia.org/wiki/Tokyo_(città)' })
  })
  it('senza link il testo resta com\'è', () => {
    expect(pezziConLink('Deposito bagagli dopo il check-out')).toEqual([{ testo: 'Deposito bagagli dopo il check-out' }])
    expect(etichettaLink('http://www.esempio.it/')).toBe('esempio.it')
  })
})
