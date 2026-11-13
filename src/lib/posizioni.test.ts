import { describe, expect, it } from 'vitest'
import { eUnRitorno, posizioneDi, ricordaPosizione, segnaRitorno } from './posizioni'

describe('posizioni di scorrimento', () => {
  it('ricorda la posizione di ogni pagina e riparte da 0 per le pagine nuove', () => {
    ricordaPosizione('/altro', 412.4)
    expect(posizioneDi('/altro')).toBe(412)
    expect(posizioneDi('/altro/voli')).toBe(0)
  })
  it('non salva posizioni negative', () => {
    ricordaPosizione('/x', -30)
    expect(posizioneDi('/x')).toBe(0)
  })
  it('il ritorno vale una volta sola e solo per un secondo', () => {
    segnaRitorno(1000)
    expect(eUnRitorno(1500)).toBe(true)
    expect(eUnRitorno(1600)).toBe(false)
    segnaRitorno(2000)
    expect(eUnRitorno(3500)).toBe(false)
  })
  it('senza «Indietro» non è un ritorno', () => {
    expect(eUnRitorno(5000)).toBe(false)
  })
})
