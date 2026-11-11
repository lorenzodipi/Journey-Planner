import { describe, expect, it } from 'vitest'
import { genitore } from './indietro'

describe('genitore', () => {
  it('Budget torna alla scheda da cui si è arrivati', () => {
    expect(genitore('/spese/budget', '/altro')).toBe('/altro')
    expect(genitore('/spese/budget', '/spese')).toBe('/spese')
    expect(genitore('/spese/budget')).toBe('/spese')
    expect(genitore('/spese/budget', '/giorni')).toBe('/spese')
  })
  it('sale alla scheda della sezione', () => {
    expect(genitore('/giorni/d3')).toBe('/giorni')
    expect(genitore('/spese/bilancio')).toBe('/spese')
    expect(genitore('/altro/trasporti?')).toBe('/altro')
    expect(genitore('/viaggi')).toBe('/altro')
  })
  it('le schede principali non hanno madre', () => {
    for (const p of ['/', '/giorni', '/luoghi', '/spese', '/altro', '/luoghi?vista=mappa']) expect(genitore(p)).toBeNull()
  })
})
