import { describe, expect, it } from 'vitest'
import { completaResto, type PayRow } from './SpesaAvanzata'

const righe = (...r: PayRow[]) => r
const testi = (r: PayRow[]) => r.map((x) => x.text)

describe('versamenti: il resto va ai paganti senza cifra scritta (come le quote)', () => {
  it('scrivendo la cifra del primo, il secondo prende il resto', () => {
    const r = righe({ id: 'a', text: '330', manuale: true }, { id: 'b', text: '' })
    expect(testi(completaResto(r, 660))).toEqual(['330', '330'])
  })
  it('due righe libere: si dividono il totale in parti uguali (anche appena aggiunto il secondo pagante)', () => {
    expect(testi(completaResto(righe({ id: 'a', text: '660' }, { id: '', text: '' }), 660))).toEqual(['330', '330'])
    expect(testi(completaResto(righe({ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }), 100))).toEqual(['33,34', '33,33', '33,33'])
  })
  it('se il totale cambia il resto si ricalcola; se la cifra scritta copre tutto il resto è vuoto', () => {
    const r = righe({ id: 'a', text: '330', manuale: true }, { id: 'b', text: '330' })
    expect(completaResto(r, 800)[1].text).toBe('470')
    expect(completaResto(r, 330)[1].text).toBe('')
    expect(completaResto(r, 100)[1].text).toBe('')
  })
  it('decimali con la virgola e arrotondati ai centesimi', () => {
    const r = righe({ id: 'a', text: '10,10', manuale: true }, { id: 'b', text: '' })
    expect(completaResto(r, 25)[1].text).toBe('14,9')
  })
  it('non tocca niente se le righe sono tutte scritte o se manca il totale', () => {
    const tutte = righe({ id: 'a', text: '100', manuale: true }, { id: 'b', text: '5', manuale: true })
    expect(completaResto(tutte, 660)).toBe(tutte)
    const uno = righe({ id: 'a', text: '100', manuale: true }, { id: 'b', text: '' })
    expect(completaResto(uno, null)).toBe(uno)
  })
  it('con tre paganti: due scritti, il terzo prende il resto; uno scritto, gli altri due si dividono il resto', () => {
    const r = righe({ id: 'a', text: '100', manuale: true }, { id: 'b', text: '200', manuale: true }, { id: 'c', text: '' })
    expect(completaResto(r, 600)[2].text).toBe('300')
    const s = righe({ id: 'a', text: '100', manuale: true }, { id: 'b', text: '' }, { id: 'c', text: '' })
    expect(testi(completaResto(s, 600))).toEqual(['100', '250', '250'])
  })
  it('le righe già calcolate non cambiano di nuovo (nessun ciclo)', () => {
    const r = completaResto(righe({ id: 'a', text: '100', manuale: true }, { id: 'b', text: '' }, { id: 'c', text: '' }), 600)
    expect(completaResto(r, 600)).toBe(r)
  })
})
