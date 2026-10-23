import { describe, expect, it } from 'vitest'
import { BASE_ORDER, orderSections, type DaySectionKey } from './daySections'

const all = (v: boolean): Record<DaySectionKey, boolean> => ({ luce: v, meteo: v, spostamenti: v, alloggio: v, spese: v, prenotazioni: v })

describe('orderSections', () => {
  it('tutte piene: ordine di base, con il meteo prima degli spostamenti', () => {
    const order = orderSections(all(true))
    expect(order).toEqual(BASE_ORDER)
    expect(order.indexOf('meteo')).toBeLessThan(order.indexOf('spostamenti'))
  })
  it('meteo non disponibile: finisce in fondo, dopo le sezioni piene', () => {
    expect(orderSections({ ...all(true), meteo: false })).toEqual(['luce', 'spostamenti', 'alloggio', 'spese', 'prenotazioni', 'meteo'])
  })
  it('le vuote vanno dopo le piene senza rimescolare l\'ordine relativo', () => {
    expect(orderSections({ luce: true, meteo: false, spostamenti: false, alloggio: true, spese: false, prenotazioni: false })).toEqual([
      'luce', 'alloggio', 'meteo', 'spostamenti', 'spese', 'prenotazioni',
    ])
  })
  it('tutte vuote: ordine di base', () => expect(orderSections(all(false))).toEqual(BASE_ORDER))
})
