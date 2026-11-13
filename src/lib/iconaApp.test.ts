import { describe, expect, it } from 'vitest'
import { ICONE, idDaNome } from './iconaApp'

describe('icona dell’app', () => {
  it('riconosce le icone dal nome del sistema', () => {
    expect(idDaNome('IconaScura')).toBe('scura')
    expect(idDaNome('IconaBlu')).toBe('blu')
  })
  it('null o un nome sconosciuto sono l’icona di partenza', () => {
    expect(idDaNome(null)).toBe('chiara')
    expect(idDaNome(undefined)).toBe('chiara')
    expect(idDaNome('IconaChiara')).toBe('chiara')
    expect(idDaNome('Altra')).toBe('chiara')
  })
  it('i nomi nativi sono unici e non iniziano con «AppIcon» (iOS 26 mostra un segnaposto vuoto)', () => {
    const nomi = ICONE.map((i) => i.nativo).filter((n): n is string => n !== null)
    expect(new Set(nomi).size).toBe(nomi.length)
    expect(nomi.every((n) => !n.startsWith('AppIcon'))).toBe(true)
  })
})
