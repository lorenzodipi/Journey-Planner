import type { SupabaseClient } from '@supabase/supabase-js'
import type { Booking, ChecklistItem, TicketCode, TicketKind } from '../types'
import { cacheBookingFile, removeBookingFile, uploadBookingFile } from './bookingFiles'
import { client } from './db'
import { bookingColumns, checklistColumns, type BookingInput, type ChecklistInput } from './planningData'
import { templateToAdd } from './checklist'

// Scritture e letture per checklist e prenotazioni.

export function queryPlanning(db: SupabaseClient) {
  return Promise.all([
    db.from('checklist_items').select('*').is('deleted_at', null),
    db.from('bookings').select('*').is('deleted_at', null),
    // prima della migrazione 0023 la tabella non esiste: l'app funziona lo stesso, senza codici
    db.from('ticket_codes').select('*').then((r) => (r.error && /ticket_codes|schema cache|does not exist/i.test(r.error.message) ? { ...r, data: [], error: null } : r)),
  ])
}

const now = () => new Date().toISOString()

// ---------- checklist ----------

export async function createChecklistItem(tripId: string, input: ChecklistInput, position: number): Promise<void> {
  const { error } = await client().from('checklist_items').insert({ trip_id: tripId, position, ...checklistColumns(input) })
  if (error) throw error
}

export async function updateChecklistItem(id: string, input: ChecklistInput): Promise<void> {
  const { error } = await client().from('checklist_items').update(checklistColumns(input)).eq('id', id)
  if (error) throw error
}

export async function setChecklistDone(id: string, done: boolean): Promise<void> {
  const { error } = await client().from('checklist_items').update({ done }).eq('id', id)
  if (error) throw error
}

export async function setChecklistDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await client().from('checklist_items').update({ deleted_at: deleted ? now() : null }).eq('id', id)
  if (error) throw error
}

export async function addChecklistTemplate(tripId: string, existing: ChecklistItem[]): Promise<void> {
  const rows = templateToAdd(existing).map((r) => ({ trip_id: tripId, ...r }))
  if (rows.length === 0) return
  const { error } = await client().from('checklist_items').insert(rows)
  if (error) throw error
}

// ---------- prenotazioni ----------

const MIGRATION_0010 =
  "Manca la migrazione 0010 sul database: eseguila nell'SQL Editor di Supabase (file supabase/migrations/0010_booking_cost.sql). Senza, il costo di un documento non si può salvare."
const missingCostColumns = (error: { message?: string } | null) => /payer_ids|'cost'|'scope'|'currency'|\bcost\b/.test(error?.message ?? '')

export async function createBooking(tripId: string, input: BookingInput, timeZone: string): Promise<void> {
  const db = client()
  const filePath = input.file ? await uploadBookingFile(tripId, input.file) : null
  const { error } = await db.from('bookings').insert({ trip_id: tripId, file_path: filePath, ...bookingColumns(input, timeZone) })
  if (error) {
    if (filePath) await removeBookingFile(filePath).catch(() => undefined) // niente file orfani
    throw input.cost !== null && missingCostColumns(error) ? new Error(MIGRATION_0010) : error
  }
  if (filePath && input.keepOffline) await cacheBookingFile(filePath).catch(() => undefined)
}

export async function updateBooking(booking: Booking, tripId: string, input: BookingInput, timeZone: string): Promise<void> {
  const db = client()
  let filePath: string | null = booking.filePath ?? null
  let uploaded: string | null = null
  if (input.file) {
    uploaded = await uploadBookingFile(tripId, input.file)
    filePath = uploaded
  } else if (input.removeFile) filePath = null
  const { error } = await db.from('bookings').update({ file_path: filePath, ...bookingColumns(input, timeZone, booking.cost != null) }).eq('id', booking.id)
  if (error) {
    if (uploaded) await removeBookingFile(uploaded).catch(() => undefined)
    throw (input.cost !== null || booking.cost != null) && missingCostColumns(error) ? new Error(MIGRATION_0010) : error
  }
  // il vecchio file si toglie solo dopo che la modifica è stata salvata
  if (booking.filePath && booking.filePath !== filePath) await removeBookingFile(booking.filePath).catch(() => undefined)
  if (filePath && input.keepOffline) await cacheBookingFile(filePath).catch(() => undefined)
}

export async function setBookingDeleted(id: string, deleted: boolean): Promise<void> {
  // il file resta nello Storage: l'eliminazione si può annullare
  const { error } = await client().from('bookings').update({ deleted_at: deleted ? now() : null }).eq('id', id)
  if (error) throw error
}

// ---------- codici dei biglietti (#38) ----------

const MIGRATION_0023 = "Manca la migrazione 0023 sul database: eseguila nell'SQL Editor di Supabase (file supabase/migrations/0023_ticket_codes.sql). Senza, i codici dei biglietti non si possono salvare."

/** Salva (o sostituisce) l'immagine del codice di una voce per un passeggero; la copia resta sempre sul telefono. */
export async function saveTicketCode(tripId: string, kind: TicketKind, refId: string, travelerId: string | null, file: File, old?: TicketCode): Promise<void> {
  const db = client()
  const filePath = await uploadBookingFile(tripId, file)
  const row = { file_path: filePath }
  const res = old ? await db.from('ticket_codes').update(row).eq('id', old.id) : await db.from('ticket_codes').insert({ trip_id: tripId, kind, ref_id: refId, traveler_id: travelerId, ...row })
  if (res.error) {
    await removeBookingFile(filePath).catch(() => undefined)
    throw /ticket_codes|schema cache|does not exist/i.test(res.error.message) ? new Error(MIGRATION_0023) : res.error
  }
  await cacheBookingFile(filePath).catch(() => undefined)
  if (old) await removeBookingFile(old.filePath).catch(() => undefined)
}

export async function removeTicketCode(code: TicketCode): Promise<void> {
  const { error } = await client().from('ticket_codes').delete().eq('id', code.id)
  if (error) throw error
  await removeBookingFile(code.filePath).catch(() => undefined)
}
