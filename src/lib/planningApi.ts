import type { SupabaseClient } from '@supabase/supabase-js'
import type { Booking, ChecklistItem, DocKind, TicketCode, TicketKind, Visibilita } from '../types'
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
    // prima della migrazione 0026 niente spunte personali: `data: null` dice all'app di usare le colonne di prima
    db.from('checklist_checks').select('*').then((r) => (r.error && /checklist_checks|schema cache|does not exist/i.test(r.error.message) ? { ...r, data: null, error: null } : r)),
    // prima della migrazione 0030 niente documenti con visibilità: `data: null` = l'app usa i file delle prenotazioni come prima
    db.from('documents').select('*').order('created_at').then((r) => (r.error && /documents|schema cache|does not exist/i.test(r.error.message) ? { ...r, data: null, error: null } : r)),
    db.from('document_access').select('*').then((r) => (r.error ? { ...r, data: [], error: null } : r)),
    db.from('document_links').select('*').then((r) => (r.error ? { ...r, data: [], error: null } : r)),
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
  const { error } = await db.from('bookings').update({ file_path: filePath, ...bookingColumns(input, timeZone, booking.cost != null, booking) }).eq('id', booking.id)
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

/** Copia le voci comuni e la mia lista privata di un altro viaggio: testo, descrizione, quantità, unità e categoria, senza spunte (LIST-009). */
export async function duplicateChecklist(tripId: string, from: ChecklistItem[], existing: ChecklistItem[], ownerId: string | undefined, v2: boolean): Promise<void> {
  const key = (i: ChecklistItem) => `${i.private ? 'p' : 'c'}:${(i.category ?? '').toLowerCase()}:${i.text.trim().toLowerCase()}`
  const have = new Set(existing.map(key))
  let pos = Math.max(0, ...existing.map((i) => i.position))
  const rows = from
    .filter((i) => !have.has(key(i)) && (!i.private || !!ownerId))
    .map((i) => {
      pos += 1000
      return {
        trip_id: tripId,
        kind: i.kind,
        text: i.text,
        position: pos,
        ...(i.quantity ? { quantity: i.quantity } : {}),
        ...(v2 ? { description: i.description ?? null, unit: i.unit ?? null, category: i.category ?? null, owner_id: i.private ? ownerId : null } : {}),
      }
    })
  if (rows.length === 0) return
  const { error } = await client().from('checklist_items').insert(rows)
  if (error) throw error
}

// ---------- documenti (#52) ----------

const MIGRATION_0030 = "Manca la migrazione 0030 sul database: eseguila nell'SQL Editor di Supabase (file supabase/migrations/0030_documenti.sql)."
const needs0030 = (e: { message: string }) => (/documents|document_access|document_links|schema cache|does not exist/i.test(e.message) ? new Error(MIGRATION_0030) : e)

export interface DocumentoInput {
  file: File
  name: string
  visibility: Visibilita
  access: string[]
  link?: { kind: DocKind; refId: string }
}

/** Carica il file una volta e crea il documento con visibilità e (se c'è) il primo collegamento. Serve la rete. */
export async function createDocument(tripId: string, input: DocumentoInput): Promise<void> {
  const db = client()
  const id = crypto.randomUUID()
  const path = await uploadBookingFile(tripId, input.file, `doc/${id}`)
  const fail = async (e: { message: string }) => {
    await removeBookingFile(path).catch(() => undefined) // niente file orfani
    throw needs0030(e)
  }
  const ins = await db.from('documents').insert({ id, trip_id: tripId, file_path: path, name: input.name.trim() || input.file.name, mime_type: input.file.type || null, size_bytes: input.file.size, visibility: input.visibility })
  if (ins.error) return fail(ins.error)
  if (input.visibility === 'selected' && input.access.length > 0) {
    const a = await db.from('document_access').insert(input.access.map((traveler_id) => ({ document_id: id, traveler_id })))
    if (a.error) return fail(a.error)
  }
  if (input.link) {
    const l = await db.from('document_links').insert({ document_id: id, kind: input.link.kind, ref_id: input.link.refId })
    if (l.error) return fail(l.error)
  }
}

/** Cambia la visibilità (solo chi ha caricato il file: lo garantisce il database); la modifica è registrata. */
export async function updateDocumentVisibility(id: string, visibility: Visibilita, access: string[], userId: string | undefined): Promise<void> {
  const db = client()
  const up = await db.from('documents').update({ visibility, visibility_changed_at: new Date().toISOString(), visibility_changed_by: userId ?? null }).eq('id', id)
  if (up.error) throw needs0030(up.error)
  const del = await db.from('document_access').delete().eq('document_id', id)
  if (del.error) throw del.error
  if (visibility === 'selected' && access.length > 0) {
    const ins = await db.from('document_access').insert(access.map((traveler_id) => ({ document_id: id, traveler_id })))
    if (ins.error) throw ins.error
  }
}

export async function renameDocument(id: string, name: string): Promise<void> {
  const { error } = await client().from('documents').update({ name: name.trim() }).eq('id', id)
  if (error) throw needs0030(error)
}

export async function deleteDocument(id: string, path: string): Promise<void> {
  const { error } = await client().from('documents').delete().eq('id', id)
  if (error) throw needs0030(error)
  await removeBookingFile(path).catch(() => undefined)
}

/** Collega un documento già caricato a un'altra voce: nessuna copia del file. */
export async function linkDocument(id: string, kind: DocKind, refId: string): Promise<void> {
  const { error } = await client().from('document_links').upsert({ document_id: id, kind, ref_id: refId }, { onConflict: 'document_id,kind,ref_id' })
  if (error) throw needs0030(error)
}

export async function unlinkDocument(id: string, kind: DocKind, refId: string): Promise<void> {
  const { error } = await client().from('document_links').delete().eq('document_id', id).eq('kind', kind).eq('ref_id', refId)
  if (error) throw needs0030(error)
}
