import type { Booking, BookingType, ChecklistItem, ChecklistKind } from '../types'
import { zonedToInstant } from './zoned'

// Checklist e prenotazioni: righe del database <-> tipi dell'app, e colonne da salvare.

export interface ChecklistRow {
  id: string
  trip_id: string
  traveler_id: string | null
  kind: ChecklistKind
  text: string
  done: boolean
  due_date: string | null
  quantity?: number | null
  quantity_done?: number | null
  position: number
}

export interface BookingRow {
  id: string
  trip_id: string
  type: BookingType
  title: string
  confirmation_code: string | null
  url: string | null
  valid_from: string | null
  valid_to: string | null
  file_path: string | null
  keep_offline: boolean
  notes: string | null
}

export function mapChecklist(rows: ChecklistRow[], tripId: string): ChecklistItem[] {
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      text: r.text,
      done: r.done,
      travelerId: r.traveler_id ?? undefined,
      dueDate: r.due_date ?? undefined,
      quantity: r.quantity && r.quantity > 1 ? r.quantity : undefined,
      quantityDone: r.quantity && r.quantity > 1 && r.quantity_done && r.quantity_done > 0 && r.quantity_done < r.quantity ? r.quantity_done : undefined,
      position: r.position,
    }))
    .sort((a, b) => a.position - b.position)
}

export function mapBookings(rows: BookingRow[], tripId: string): Booking[] {
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      code: r.confirmation_code ?? undefined,
      url: r.url ?? undefined,
      validFrom: r.valid_from ?? undefined,
      validTo: r.valid_to ?? undefined,
      filePath: r.file_path ?? undefined,
      keepOffline: r.keep_offline,
      notes: r.notes ?? undefined,
    }))
    .sort((a, b) => (a.validFrom ?? '9999').localeCompare(b.validFrom ?? '9999') || a.title.localeCompare(b.title, 'it'))
}

export interface ChecklistInput {
  text: string
  kind: ChecklistKind
  travelerId: string | null
  dueDate: string
  /** Quanti pezzi; 1 = nessuna quantità. */
  quantity?: number
}

/**
 * Colonne da salvare. `quantity` viaggia solo quando serve (maggiore di 1, o per azzerare una quantità
 * già salvata): così le voci semplici si salvano anche se la colonna non esiste ancora nel database.
 */
export function checklistColumns(i: ChecklistInput, hadQuantity = false) {
  const qty = i.quantity && i.quantity > 1 ? i.quantity : null
  return {
    text: i.text.trim(),
    kind: i.kind,
    traveler_id: i.travelerId,
    due_date: i.dueDate || null,
    ...(qty !== null || hadQuantity ? { quantity: qty } : {}),
  }
}

export interface BookingInput {
  type: BookingType
  title: string
  code: string
  url: string
  /** date "YYYY-MM-DD" o vuote; valgono dall'inizio del primo giorno alla fine dell'ultimo, nel fuso del viaggio */
  validFrom: string
  validTo: string
  keepOffline: boolean
  notes: string
  /** nuovo file da caricare (sostituisce quello attuale) */
  file: File | null
  /** togliere il file attuale senza sostituirlo */
  removeFile: boolean
}

const orNull = (s: string) => s.trim() || null

/** Rende sicuro un indirizzo da aprire: solo http/https (niente `javascript:`). `null` se non valido. */
export function safeUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

export function bookingColumns(i: BookingInput, timeZone: string) {
  return {
    type: i.type,
    title: i.title.trim(),
    confirmation_code: orNull(i.code),
    url: safeUrl(i.url),
    valid_from: i.validFrom ? zonedToInstant(i.validFrom, '00:00', timeZone) : null,
    valid_to: i.validTo ? zonedToInstant(i.validTo, '23:59', timeZone) : null,
    keep_offline: i.keepOffline,
    notes: orNull(i.notes),
  }
}
