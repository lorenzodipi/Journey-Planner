import { describe, expect, it } from 'vitest'
import { cifra, decifra } from './cifra'

describe('cifra (#64)', () => {
  it('cifra e decifra, e lascia passare le copie vecchie', async () => {
    const orig = new Blob(['biglietto 123'], { type: 'text/plain' })
    const c = await cifra(orig)
    if (c === orig) return // ambiente senza WebCrypto
    expect(await c.text()).not.toContain('biglietto')
    const d = (await decifra(c))!
    expect(await d.text()).toBe('biglietto 123')
    expect(d.type).toBe('text/plain')
    expect(await (await decifra(orig))!.text()).toBe('biglietto 123')
  })
})
