import { describe, expect, it } from 'vitest'
import { nomeProfiloDa } from './auth'

describe('nomeProfiloDa', () => {
  it('il nome scelto sull’account vince', () => {
    expect(nomeProfiloDa({ user_metadata: { profile_name: ' Lorenzo ' } }, 'Altro')).toBe('Lorenzo')
  })
  it('senza account usa quello tenuto sul telefono', () => {
    expect(nomeProfiloDa(null, 'Lorenzo')).toBe('Lorenzo')
    expect(nomeProfiloDa({ user_metadata: {} }, '')).toBe('')
  })
  it('ignora valori che non sono testo', () => {
    expect(nomeProfiloDa({ user_metadata: { profile_name: 5 } })).toBe('')
  })
})
