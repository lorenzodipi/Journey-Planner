import { describe, expect, it } from 'vitest'
import type { Attivita } from '../types'
import { modificaAltrui } from './conflitti'

const a = (over: Partial<Attivita>): Attivita => ({ id: 1, table: 'places', rowId: 'p', action: 'update', actor: 'altro', at: '2026-11-01T10:00:00Z', title: 'x', ...over })
describe('conflitti (#64)', () => {
  it('segnala solo le modifiche di altri dopo l’apertura', () => {
    const log = [a({}), a({ id: 2, actor: 'io' }), a({ id: 3, at: '2026-11-01T08:00:00Z' }), a({ id: 4, rowId: 'q' })]
    expect(modificaAltrui(log, 'places', 'p', '2026-11-01T09:00:00Z', 'io')?.id).toBe(1)
    expect(modificaAltrui(log, 'places', 'p', '2026-11-01T11:00:00Z', 'io')).toBeUndefined()
    expect(modificaAltrui(undefined, 'places', 'p', '', 'io')).toBeUndefined()
  })
})
