import { describe, expect, it } from 'vitest'
import * as a from './altro'

describe('riepiloghi di Altro', () => {
  it('città in ordine senza ripetizioni', () => {
    const days = [{ city: 'Kyoto' }, { city: 'Kyoto' }, { city: 'Osaka' }, { city: '' }, { city: 'Kyoto' }] as never
    expect(a.cittaDelViaggio({ days })).toBe('Kyoto · Osaka')
  })
  it('alloggi: primo per data e quanti altri', () => {
    const stays = [{ name: 'B', checkIn: '2026-11-25' }, { name: 'A', checkIn: '2026-11-21' }, { name: 'C', checkIn: '2026-11-28' }] as never
    expect(a.riepilogoAlloggi({ stays })).toBe('A e altri 2')
    expect(a.riepilogoAlloggi({ stays: [stays[0]] })).toBe('B')
  })
  it('budget in percentuale', () => {
    expect(a.riepilogoBudget(3300, 5000, 'EUR')).toMatch(/^66% di 5\.?000,00/)
    expect(a.riepilogoBudget(0, undefined, 'EUR')).toBe('Imposta un limite di spesa')
  })
  it('trasporti da acquistare e checklist', () => {
    expect(a.riepilogoTrasportiAltro({ transports: [{ bought: true }, { bought: false }] as never })).toBe('2 trasporti · 1 da acquistare')
    expect(a.riepilogoChecklist({ checklist: [{ done: true }, { done: false }] as never })).toBe('1 di 2 fatte')
  })
  it('cambio: 1 unità di casa in valuta locale', () => {
    expect(a.riepilogoCambio({ baseCurrency: 'EUR', localCurrency: 'JPY', fxRate: 1 / 164 })).toBe('1 € = 164 ¥')
    expect(a.riepilogoCambio({ baseCurrency: 'EUR' })).toMatch(/^Imposta/)
  })
})
