import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: { table: string; patch: unknown; ids: string[] }[] = []
vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => ({
      update: (patch: unknown) => ({
        in: (_col: string, ids: string[]) => {
          calls.push({ table, patch, ids })
          return Promise.resolve({ error: null, status: 204 })
        },
      }),
    }),
  },
}))

import { execOp } from './outboxExec'

describe('modifica di più righe in una richiesta', () => {
  beforeEach(() => {
    calls.length = 0
  })
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i}`)

  it('100 voci selezionate = una sola richiesta', async () => {
    await execOp({ k: 'updateMany', table: 'checklist_items', ids: ids(100), patch: { deleted_at: 'x' } })
    expect(calls).toHaveLength(1)
    expect(calls[0].ids).toHaveLength(100)
  })

  it('solo oltre 200 righe si divide, per non superare la lunghezza dell\'indirizzo', async () => {
    await execOp({ k: 'updateMany', table: 'checklist_items', ids: ids(450), patch: {} })
    expect(calls.map((c) => c.ids.length)).toEqual([200, 200, 50])
  })
})
