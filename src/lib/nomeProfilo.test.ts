import { describe, expect, it } from 'vitest'
import { nomeProfiloDa } from './auth'

describe('nomeProfiloDa', () => {
  it('il Display name dell’account vince', () => {
    expect(nomeProfiloDa({ user_metadata: { display_name: ' Lorenzo ' } }, 'Altro')).toBe('Lorenzo')
    expect(nomeProfiloDa({ user_metadata: { display_name: 'Lorenzo', profile_name: 'Vecchio' } })).toBe('Lorenzo')
  })
  it('legge ancora la chiave della versione precedente', () => {
    expect(nomeProfiloDa({ user_metadata: { profile_name: 'Lorenzo' } })).toBe('Lorenzo')
  })
  it('senza account usa quello tenuto sul telefono', () => {
    expect(nomeProfiloDa(null, 'Lorenzo')).toBe('Lorenzo')
    expect(nomeProfiloDa({ user_metadata: {} }, '')).toBe('')
  })
  it('ignora valori che non sono testo', () => {
    expect(nomeProfiloDa({ user_metadata: { display_name: 5 } })).toBe('')
  })
})
