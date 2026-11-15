import { describe, expect, it } from 'vitest'
import { chiediPasswordSalvata, proponiSalvaPassword, puoSalvarePassword } from './salvaPassword'

describe('salvaPassword', () => {
  it('sul sito non propone niente (ci pensa il browser)', async () => {
    expect(puoSalvarePassword()).toBe(false)
    await expect(proponiSalvaPassword('nome@esempio.it', 'segreta12')).resolves.toBeUndefined()
    await expect(chiediPasswordSalvata()).resolves.toBeNull()
  })
})
