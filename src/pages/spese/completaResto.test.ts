import { describe, expect, it } from 'vitest'
import { completaResto, type PayRow } from './SpesaAvanzata'

const righe = (...r: PayRow[]) => r

describe('versamenti: il pagante senza cifra prende il resto', () => {
  it('scrivendo la cifra del primo, il secondo prende il resto', () => {
    const r = righe({ id: 'a', text: '330', manuale: true }, { id: 'b', text: '' })
    expect(completaResto(r, 660).map((x) => x.text)).toEqual(['330', '330'])
  })
  it('se il totale cambia il resto si ricalcola; se la cifra scritta copre tutto il resto è vuoto', () => {
    const r = righe({ id: 'a', text: '330', manuale: true }, { id: 'b', text: '330' })
    expect(completaResto(r, 800)[1].text).toBe('470')
    expect(completaResto(r, 330)[1].text).toBe('')
  })
  it('decimali con la virgola e arrotondati ai centesimi', () => {
    const r = righe({ id: 'a', text: '10,10', manuale: true }, { id: 'b', text: '' })
    expect(completaResto(r, 25)[1].text).toBe('14,9')
  })
  it('non tocca niente se le righe libere sono due, se sono tutte scritte o se manca il totale', () => {
    const due = righe({ id: 'a', text: '100' }, { id: 'b', text: '' })
    expect(completaResto(due, 660)).toBe(due)
    const tutte = righe({ id: 'a', text: '100', manuale: true }, { id: 'b', text: '5', manuale: true })
    expect(completaResto(tutte, 660)).toBe(tutte)
    const uno = righe({ id: 'a', text: '100', manuale: true }, { id: 'b', text: '' })
    expect(completaResto(uno, null)).toBe(uno)
  })
  it('con tre paganti, il terzo libero prende quel che resta dopo i due scritti', () => {
    const r = righe({ id: 'a', text: '100', manuale: true }, { id: 'b', text: '200', manuale: true }, { id: 'c', text: '' })
    expect(completaResto(r, 600)[2].text).toBe('300')
  })
})
