import type { Trip } from '../types'
import { client } from './db'
import { buildSteps, tripRow } from './restore'

// Scrive nel database un viaggio letto da un file di esportazione, come viaggio NUOVO.
// Si crea prima il viaggio, poi le tabelle nell'ordine delle dipendenze. Se un passaggio fallisce
// il viaggio appena creato viene cancellato (con tutto ciò che contiene): niente ripristini a metà.

const CHUNK = 200

export async function restoreTrip(trip: Trip, title: string): Promise<string> {
  const db = client()
  const { data, error } = await db.from('trips').insert(tripRow(trip, title)).select('id').single()
  if (error) throw error
  const tripId = (data as { id: string }).id

  try {
    for (const step of buildSteps(trip, tripId, () => crypto.randomUUID())) {
      if (step.table === 'trip_travelers') {
        // le persone tornano senza account (non si inventano): si collegano poi da Altro
        if (step.rows.length === 0) continue
        const res = await db.rpc('restore_travelers', { _trip: tripId, _travelers: step.rows })
        if (res.error) throw res.error
        continue
      }
      for (let i = 0; i < step.rows.length; i += CHUNK) {
        const res = await db.from(step.table).insert(step.rows.slice(i, i + CHUNK))
        if (res.error) throw res.error
      }
    }
  } catch (e) {
    // le righe figlie si eliminano a cascata; se non è permesso, almeno si nasconde il viaggio
    const del = await db.from('trips').delete().eq('id', tripId)
    if (del.error) await db.from('trips').update({ deleted_at: new Date().toISOString() }).eq('id', tripId)
    throw e
  }
  return tripId
}
