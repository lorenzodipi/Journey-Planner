import type { Booking, BookingType, ChecklistItem, ChecklistKind, Scope, TicketCode, TicketKind } from '../types'
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
  // dalla migrazione 0016
  url?: string | null
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
  // dalla migrazione 0010
  cost?: number | string | null
  currency?: string | null
  scope?: Scope | null
  payer_ids?: string[] | null
  // dalla migrazione 0019
  paid_by?: string | null
  for_travelers?: string[] | null
  // dalla migrazione 0025
  detail?: string | null
  party_size?: number | null
  place?: string | null
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
      url: r.url?.trim() || undefined,
      position: r.position,
    }))
    .sort((a, b) => a.position - b.position)
}

export interface TicketCodeRow {
  id: string
  trip_id: string
  kind: TicketKind
  ref_id: string
  traveler_id: string | null
  file_path: string
}

export function mapTicketCodes(rows: TicketCodeRow[] | undefined, tripId: string): TicketCode[] | undefined {
  const mine = (rows ?? []).filter((r) => r.trip_id === tripId)
  return mine.length ? mine.map((r) => ({ id: r.id, kind: r.kind, refId: r.ref_id, travelerId: r.traveler_id ?? undefined, filePath: r.file_path })) : undefined
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
      cost: r.cost == null ? undefined : Number(r.cost),
      currency: r.currency?.trim() || undefined,
      scope: r.scope ?? undefined,
      payerIds: r.payer_ids ?? undefined,
      paidBy: r.paid_by ?? undefined,
      forTravelers: r.for_travelers?.length ? r.for_travelers : undefined,
      detail: r.detail?.trim() || undefined,
      partySize: r.party_size && r.party_size > 0 ? r.party_size : undefined,
      place: r.place?.trim() || undefined,
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
  /** Link facoltativo; vuoto = nessuno. */
  url?: string
}

/** Rende utilizzabile un link scritto a mano: aggiunge https:// se manca, vuoto se non è un indirizzo web. */
export function cleanUrl(raw: string | undefined): string {
  const v = (raw ?? '').trim()
  if (!v) return ''
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : ''
  } catch {
    return ''
  }
}

/**
 * Colonne da salvare. `quantity` viaggia solo quando serve (maggiore di 1, o per azzerare una quantità
 * già salvata): così le voci semplici si salvano anche se la colonna non esiste ancora nel database.
 */
export function checklistColumns(i: ChecklistInput, hadQuantity = false, hadUrl = false) {
  const qty = i.quantity && i.quantity > 1 ? i.quantity : null
  const url = cleanUrl(i.url)
  return {
    text: i.text.trim(),
    kind: i.kind,
    traveler_id: i.travelerId,
    due_date: i.dueDate || null,
    ...(qty !== null || hadQuantity ? { quantity: qty } : {}),
    // il link si scrive solo se c'è (o per toglierlo): senza la colonna le voci semplici si salvano come prima
    ...(url || hadUrl ? { url: url || null } : {}),
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
  /** costo, o null se non c'è */
  cost: number | null
  currency: string
  scope: Scope
  /** chi lo ha pagato; vuoto = tutti */
  payerIds: string[]
  /** nuovo file da caricare (sostituisce quello attuale) */
  file: File | null
  /** togliere il file attuale senza sostituirlo */
  removeFile: boolean
  /** ora della prenotazione "HH:MM" (con `validFrom`); vuota = tutto il giorno */
  time?: string
  paidBy?: string
  forTravelers?: string[]
  detail?: string
  partySize?: number | null
  place?: string
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

/**
 * Colonne da salvare. Il costo viaggia solo quando serve (c'è un costo, o c'era e va tolto): così le prenotazioni
 * senza costo si salvano anche se la migrazione 0010 non è ancora stata eseguita.
 */
/** Colonne delle migrazioni 0019/0025: solo se servono (o se c'erano), così senza migrazione il salvataggio funziona come prima. */
export function bookingExtras(i: BookingInput, old?: Booking) {
  const out: Record<string, unknown> = {}
  const put = (key: string, value: unknown, had: unknown) => {
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
    if (!empty) out[key] = value
    else if (had !== undefined && had !== null && !(Array.isArray(had) && had.length === 0)) out[key] = Array.isArray(value) ? [] : null
  }
  put('paid_by', i.paidBy, old?.paidBy)
  put('for_travelers', i.forTravelers, old?.forTravelers)
  put('detail', i.detail?.trim(), old?.detail)
  put('party_size', i.partySize ?? undefined, old?.partySize)
  put('place', i.place?.trim(), old?.place)
  return out
}

export function bookingColumns(i: BookingInput, timeZone: string, hadCost = false, old?: Booking) {
  const hasCost = i.cost != null
  return {
    ...bookingExtras(i, old),
    type: i.type,
    title: i.title.trim(),
    confirmation_code: orNull(i.code),
    url: safeUrl(i.url),
    valid_from: i.validFrom ? zonedToInstant(i.validFrom, i.time || '00:00', timeZone) : null,
    valid_to: i.validTo ? zonedToInstant(i.validTo, '23:59', timeZone) : null,
    keep_offline: i.keepOffline,
    notes: orNull(i.notes),
    ...(hasCost || hadCost
      ? { cost: i.cost, currency: i.currency.trim().toUpperCase(), scope: i.scope, payer_ids: hasCost ? i.payerIds : [] }
      : {}),
  }
}
