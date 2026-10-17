import type { SupabaseClient } from '@supabase/supabase-js'
import type { Booking, ChecklistItem } from '../types'
import { cacheBookingFile, removeBookingFile, uploadBookingFile } from './bookingFiles'
import { client } from './db'
import { bookingColumns, checklistColumns, type BookingInput, type ChecklistInput } from './planningData'
import { templateToAdd } from './checklist'

// Scritture e letture per checklist e prenotazioni.

export function queryPlanning(db: SupabaseClient) {
  return Promise.all([
    db.from('checklist_items').select('*').is('deleted_at', null),
    db.from('bookings').select('*').is('deleted_at', null),
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

export async function createBooking(tripId: string, input: BookingInput, timeZone: string): Promise<void> {
  const db = client()
  const filePath = input.file ? await uploadBookingFile(tripId, input.file) : null
  const { error } = await db.from('bookings').insert({ trip_id: tripId, file_path: filePath, ...bookingColumns(input, timeZone) })
  if (error) {
    if (filePath) await removeBookingFile(filePath).catch(() => undefined) // niente file orfani
    throw error
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
  const { error } = await db.from('bookings').update({ file_path: filePath, ...bookingColumns(input, timeZone) }).eq('id', booking.id)
  if (error) {
    if (uploaded) await removeBookingFile(uploaded).catch(() => undefined)
    throw error
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
