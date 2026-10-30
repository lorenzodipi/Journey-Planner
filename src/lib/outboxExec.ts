import { supabase } from './supabase'
import type { Op } from './outbox'

/** Quante righe al massimo in una sola richiesta `in (...)`. */
export const MANY_CHUNK = 200

/** Invia una scrittura della coda a Supabase. Un errore ha `status` (HTTP) per distinguere temporaneo/definitivo. */
export async function execOp(op: Op): Promise<void> {
  if (!supabase) throw new Error('Supabase non è configurato.')
  const db = supabase
  const fail = (error: { message: string; code?: string }, status: number) => Object.assign(new Error(error.message), { code: error.code, status })

  if (op.k === 'upsert') {
    const { error, status } = await db.from(op.table).upsert(op.row, { onConflict: op.onConflict ?? 'id' })
    if (error) throw fail(error, status)
    return
  }
  if (op.k === 'update') {
    const { error, status } = await db.from(op.table).update(op.patch).eq('id', op.id)
    if (error) throw fail(error, status)
    return
  }
  if (op.k === 'updateMany') {
    // una richiesta per tutte le righe (a blocchi di 200 solo per non superare la lunghezza dell'indirizzo)
    for (let i = 0; i < op.ids.length; i += MANY_CHUNK) {
      const { error, status } = await db.from(op.table).update(op.patch).in('id', op.ids.slice(i, i + MANY_CHUNK))
      if (error) throw fail(error, status)
    }
    return
  }
  // quote di una spesa: aggiunge/aggiorna le scelte e toglie le altre
  if (op.travelerIds.length > 0) {
    const rows = op.travelerIds.map((id) => ({ trip_id: op.tripId, expense_id: op.expenseId, traveler_id: id, weight: 1, deleted_at: null }))
    const up = await db.from('expense_shares').upsert(rows, { onConflict: 'expense_id,traveler_id' })
    if (up.error) throw fail(up.error, up.status)
  }
  let del = db.from('expense_shares').delete().eq('expense_id', op.expenseId)
  if (op.travelerIds.length > 0) del = del.not('traveler_id', 'in', `(${op.travelerIds.join(',')})`)
  const res = await del
  if (res.error) throw fail(res.error, res.status)
}
