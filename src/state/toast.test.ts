import { describe, expect, it } from 'vitest'
import { codaAvvisi, dismissToast, showToast } from './toast'

describe('avvisi in basso', () => {
  it('uno alla volta: il nuovo prende il posto del precedente', () => {
    showToast('Primo')
    showToast('Secondo', { label: 'Annulla', run: () => {} })
    expect(codaAvvisi.visibleToasts.map((t) => t.content.message)).toEqual(['Secondo'])
    expect(codaAvvisi.visibleToasts[0].content.action?.label).toBe('Annulla')
  })
  it('la durata passa alla coda (5 s se non detta)', () => {
    showToast('Breve', undefined, 1500)
    expect(codaAvvisi.visibleToasts[0].timeout).toBe(1500)
    showToast('Normale')
    expect(codaAvvisi.visibleToasts[0].timeout).toBe(5000)
  })
  it('dismissToast toglie l’avviso', () => {
    showToast('Da chiudere')
    dismissToast()
    expect(codaAvvisi.visibleToasts).toEqual([])
  })
})
