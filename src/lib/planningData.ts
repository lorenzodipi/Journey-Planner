import type { Booking, BookingType, ChecklistItem, ChecklistKind, DocKind, Documento, Scope, TicketCode, TicketKind } from '../types'
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
  // dalla migrazione 0026
  owner_id?: string | null
  description?: string | null
  unit?: string | null
  category?: string | null
}

export interface CheckRow {
  item_id: string
  trip_id: string
  traveler_id: string
  done: boolean
  quantity_done: number | null
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

const BASE_CATEGORY: Record<ChecklistKind, string> = { docs: 'Documenti', packing: 'Valigia', todo: 'Altro' }

/**
 * Voci visibili a me. Con la migrazione 0026 (`checks` presente) la spunta di una voce comune è la MIA riga di
 * `checklist_checks` e le altre righe sono le spunte degli altri; senza, valgono `done` / `quantity_done` della voce.
 */
export function mapChecklist(rows: ChecklistRow[], tripId: string, checks?: CheckRow[] | null, myTravelerId?: string): ChecklistItem[] {
  const byItem = new Map<string, CheckRow[]>()
  for (const c of checks ?? []) byItem.set(c.item_id, [...(byItem.get(c.item_id) ?? []), c])
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => {
      const quantity = r.quantity && r.quantity > 1 ? r.quantity : undefined
      const priv = !!r.owner_id
      const list = byItem.get(r.id) ?? []
      const mine = checks && !priv && myTravelerId ? list.find((c) => c.traveler_id === myTravelerId) : undefined
      const useChecks = !!checks && !priv && !!myTravelerId
      const done = useChecks ? !!mine?.done : r.done
      const qd = useChecks ? (mine?.quantity_done ?? undefined) : (r.quantity_done ?? undefined)
      const others = checks && !priv ? list.filter((c) => c.traveler_id !== myTravelerId).map((c) => ({ travelerId: c.traveler_id, done: c.done, ...(c.quantity_done ? { quantityDone: c.quantity_done } : {}) })) : undefined
      return {
        id: r.id,
        kind: r.kind,
        text: r.text,
        done,
        travelerId: r.traveler_id ?? undefined,
        dueDate: r.due_date ?? undefined,
        quantity,
        quantityDone: quantity && qd && qd > 0 && qd < quantity ? qd : undefined,
        url: r.url?.trim() || undefined,
        position: r.position,
        description: r.description?.trim() || undefined,
        unit: r.unit?.trim() || undefined,
        category: r.category?.trim() || BASE_CATEGORY[r.kind],
        ...(priv ? { private: true } : {}),
        ...(others ? { others } : {}),
      } satisfies ChecklistItem
    })
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
  /** Con la migrazione 0026: descrizione, unità, categoria e proprietario (vuoto = voce comune). */
  v2?: boolean
  description?: string
  unit?: string
  category?: string
  ownerId?: string
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
    // colonne della migrazione 0026: solo se il database le ha
    ...(i.v2 ? { description: i.description?.trim() || null, unit: i.unit?.trim() || null, category: i.category?.trim() || null, owner_id: i.ownerId ?? null } : {}),
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

export interface DocumentRow {
  id: string
  trip_id: string
  file_path: string
  name: string
  mime_type: string | null
  size_bytes: number | null
  owner_id: string | null
  visibility: Documento['visibility']
  created_at: string
  visibility_changed_at: string | null
}
export interface DocumentAccessRow {
  document_id: string
  traveler_id: string
}
export interface DocumentLinkRow {
  document_id: string
  kind: DocKind
  ref_id: string
}

export function mapDocuments(rows: DocumentRow[], access: DocumentAccessRow[], links: DocumentLinkRow[], tripId: string): Documento[] {
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      path: r.file_path,
      name: r.name,
      visibility: r.visibility,
      access: access.filter((a) => a.document_id === r.id).map((a) => a.traveler_id),
      links: links.filter((l) => l.document_id === r.id).map((l) => ({ kind: l.kind, refId: l.ref_id })),
      createdAt: r.created_at,
      ...(r.mime_type ? { mime: r.mime_type } : {}),
      ...(r.size_bytes ? { size: r.size_bytes } : {}),
      ...(r.owner_id ? { ownerId: r.owner_id } : {}),
      ...(r.visibility_changed_at ? { changedAt: r.visibility_changed_at } : {}),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
