import { describe, expect, it } from 'vitest'
import { paginaPermessa, soloLettura } from './ruolo'

describe('visualizzatore (0049)', () => {
  const v = { myRole: 'viewer' as const }
  it('solo il ruolo viewer è in sola lettura', () => {
    expect(soloLettura(v)).toBe(true)
    expect(soloLettura({ myRole: 'editor' })).toBe(false)
    expect(soloLettura({ myRole: undefined })).toBe(false)
    expect(soloLettura(null)).toBe(false)
  })
  it('vede Oggi, Giorni, Alloggi, Voli, Trasporti, Viaggiatori e Impostazioni', () => {
    for (const p of ['/', '/giorni', '/giorni/abc', '/altro', '/altro/alloggi', '/altro/voli', '/altro/trasporti', '/altro/viaggiatori', '/altro/impostazioni', '/altro/account', '/viaggi']) expect(paginaPermessa(p, v)).toBe(true)
  })
  it('non vede Luoghi, Spese, Budget, Checklist, Prenotazioni, Documenti, Registro', () => {
    for (const p of ['/luoghi', '/luoghi?vista=mappa', '/mappa', '/spese', '/spese/bilancio', '/spese/budget', '/altro/checklist?nuova=1', '/altro/prenotazioni', '/altro/documenti', '/altro/registro']) expect(paginaPermessa(p, v)).toBe(false)
  })
  it('chi fa parte del viaggio apre tutto', () => {
    expect(paginaPermessa('/spese', { myRole: 'editor' })).toBe(true)
  })
})
