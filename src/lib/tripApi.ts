import type { Category, Day, DayItem, ItemKind, MemberRole, Place, PlaceStatus, ThemeName, Traveler, Trip } from '../types'
import { todayYmd } from './dates'
import { client } from './db'
import { queryLogistics } from './logisticsApi'
import { queryMoney } from './moneyApi'
import { queryPlanning } from './planningApi'
import { mapBookings, mapChecklist } from './planningData'
import type { BookingRow, ChecklistRow } from './planningData'
import { mapBudget, mapExpenses } from './moneyData'
import type { BudgetItemRow, BudgetShareRow, ExpenseRow, ExpenseShareRow } from './moneyData'
import { mapFlights, mapStays, mapTransports } from './logistics'
import type { FlightLegRow, FlightRow, StayRow, TransportRow } from './logistics'
import { cleanRates } from './money'
import type { Op } from './outbox'
import { DEFAULT_CENTER } from './tripForm'
import { enumerateDates, planDays } from './tripDays'

export { describeError } from './db'

// Accesso ai dati dei viaggi. La sicurezza non dipende da questo codice ma dalla
// Row Level Security del database: qui si legge e si scrive come utente loggato.

export interface TravelerInput {
  name: string
  color: string
}

/** Persona da aggiungere al viaggio: deve avere già un account con questa email. */
export interface InvitedInput extends TravelerInput {
  email: string
}

/** Chi viaggia alla creazione: chi crea (col proprio account) e gli altri, per email. */
export interface TripPeople {
  self: TravelerInput
  others: InvitedInput[]
}

interface PersonRow {
  user_id: string
  email: string
  role: MemberRole
}

export interface TripInput {
  title: string
  destination: string
  startDate: string
  endDate: string
  timezone: string
  theme: ThemeName
  baseCurrency: string
  localCurrency: string
  center: { lat: number; lng: number }
  /** Budget massimo nella valuta base: `undefined` = non toccare la colonna, `null` = toglierlo. */
  budgetLimit?: number | null
  /** Paese e fuso di casa: `undefined` = non toccare le colonne, `null` = toglierli. */
  originCountry?: string | null
  originTimezone?: string | null
}


interface TravelerRow {
  id: string
  name: string
  color: string
  user_id?: string | null
  position: number
  deleted_at: string | null
}
interface DayRow {
  id: string
  date: string
  city: string | null
  title: string | null
  notes: string | null
  deleted_at: string | null
}
interface CategoryRow {
  id: string
  trip_id: string
  label: string
  color: string | null
  position: number
}
interface PlaceRow {
  id: string
  trip_id: string
  category_id: string | null
  name: string
  name_local: string | null
  city: string | null
  address: string | null
  lat: number | null
  lng: number | null
  maps_url: string | null
  opening_hours: string | null
  est_cost: number | string | null
  currency: string | null
  status: PlaceStatus
  notes: string | null
  visit_minutes?: number | null
}
interface ItemRow {
  id: string
  trip_id: string
  day_id: string
  place_id: string | null
  kind: ItemKind
  title: string
  start_time: string | null
  end_time: string | null
  notes: string | null
  done: boolean
  position: number
  duration_minutes?: number | null
}
interface Extras {
  places: PlaceRow[]
  categories: CategoryRow[]
  expenseCategories: CategoryRow[]
  items: ItemRow[]
  stays: StayRow[]
  transports: TransportRow[]
  flights: FlightRow[]
  legs: FlightLegRow[]
  budgetItems: BudgetItemRow[]
  budgetShares: BudgetShareRow[]
  expenses: ExpenseRow[]
  expenseShares: ExpenseShareRow[]
  checklist: ChecklistRow[]
  bookings: BookingRow[]
}

interface TripRow {
  id: string
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  timezone: string
  theme: string
  base_currency: string
  local_currency: string | null
  fx_rate?: number | string | null
  fx_rates?: Record<string, number | string> | null
  budget_limit?: number | string | null
  origin_country?: string | null
  origin_timezone?: string | null
  center_lat: number | null
  center_lng: number | null
  trip_travelers: TravelerRow[]
  days: DayRow[]
}

function mapTrip(row: TripRow, extras: Extras, people: PersonRow[] = [], myId?: string): Trip {
  const travelers: Traveler[] = (row.trip_travelers ?? [])
    .filter((t) => !t.deleted_at)
    .sort((a, b) => a.position - b.position)
    .map((t) => {
      const who = t.user_id ? people.find((p) => p.user_id === t.user_id) : undefined
      return { id: t.id, name: t.name, color: t.color, position: t.position, userId: t.user_id ?? undefined, email: who?.email }
    })

  const categories: Category[] = extras.categories
    .filter((c) => c.trip_id === row.id)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ id: c.id, label: c.label, color: c.color ?? undefined }))
  const categoryLabel = new Map(categories.map((c) => [c.id, c.label]))

  const expenseCategories: Category[] = extras.expenseCategories
    .filter((c) => c.trip_id === row.id)
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label, 'it'))
    .map((c) => ({ id: c.id, label: c.label, color: c.color ?? undefined }))
  const expenseCategoryLabel = new Map(expenseCategories.map((c) => [c.id, c.label]))

  const places: Place[] = extras.places
    .filter((p) => p.trip_id === row.id)
    .map((p) => ({
      id: p.id,
      name: p.name,
      nameLocal: p.name_local ?? undefined,
      city: p.city ?? '',
      category: p.category_id ? (categoryLabel.get(p.category_id) ?? '') : '',
      categoryId: p.category_id ?? undefined,
      status: p.status,
      note: p.notes ?? undefined,
      address: p.address ?? undefined,
      mapsUrl: p.maps_url ?? undefined,
      openingHours: p.opening_hours ?? undefined,
      estCost: p.est_cost == null ? undefined : Number(p.est_cost),
      currency: p.currency?.trim() || undefined,
      visitMinutes: p.visit_minutes ?? undefined,
      lat: p.lat,
      lng: p.lng,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))

  const itemsByDay = new Map<string, DayItem[]>()
  for (const it of extras.items.filter((i) => i.trip_id === row.id).sort((a, b) => a.position - b.position)) {
    const list = itemsByDay.get(it.day_id) ?? []
    list.push({
      id: it.id,
      time: it.start_time?.slice(0, 5),
      endTime: it.end_time?.slice(0, 5),
      title: it.title,
      kind: it.kind,
      placeId: it.place_id ?? undefined,
      note: it.notes ?? undefined,
      durationMinutes: it.duration_minutes ?? undefined,
      done: it.done,
      position: it.position,
    })
    itemsByDay.set(it.day_id, list)
  }

  const days: Day[] = (row.days ?? [])
    .filter((d) => !d.deleted_at)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      id: d.id,
      date: d.date,
      city: d.city ?? '',
      title: d.title ?? undefined,
      notes: d.notes ?? undefined,
      items: itemsByDay.get(d.id) ?? [],
    }))

  const today = todayYmd()
  return {
    id: row.id,
    title: row.title,
    destination: row.destination ?? '',
    startDate: row.start_date ?? days[0]?.date ?? today,
    endDate: row.end_date ?? days[days.length - 1]?.date ?? today,
    timezone: row.timezone,
    theme: (['default', 'japan', 'iceland'].includes(row.theme) ? row.theme : 'default') as ThemeName,
    baseCurrency: row.base_currency.trim(),
    localCurrency: row.local_currency?.trim() || undefined,
    center: {
      lat: row.center_lat ?? DEFAULT_CENTER.lat,
      lng: row.center_lng ?? DEFAULT_CENTER.lng,
    },
    travelers,
    myRole: myId ? people.find((p) => p.user_id === myId)?.role : undefined,
    days,
    places,
    categories,
    expenseCategories,
    stays: mapStays(extras.stays, row.id),
    transports: mapTransports(extras.transports, row.id),
    flights: mapFlights(extras.flights, extras.legs, row.id),
    budget: mapBudget(extras.budgetItems, extras.budgetShares, row.id, expenseCategoryLabel),
    expenses: mapExpenses(extras.expenses, extras.expenseShares, row.id, expenseCategoryLabel),
    checklist: mapChecklist(extras.checklist, row.id),
    bookings: mapBookings(extras.bookings, row.id),
    fxRate: row.fx_rate == null ? undefined : Number(row.fx_rate),
    fxRates: Object.keys(cleanRates(row.fx_rates)).length > 0 ? cleanRates(row.fx_rates) : undefined,
    budgetLimit: row.budget_limit != null && Number(row.budget_limit) > 0 ? Number(row.budget_limit) : undefined,
    originCountry: row.origin_country?.trim() || undefined,
    originTimezone: row.origin_timezone?.trim() || undefined,
  }
}

/**
 * Gruppi di dati che si possono ricaricare da soli. Dopo una modifica si ricarica solo il gruppo toccato
 * (es. dopo aver salvato un luogo solo i luoghi) invece di tutte le 15 tabelle.
 */
export type Scope = 'trips' | 'places' | 'categories' | 'expenseCategories' | 'items' | 'logistics' | 'money' | 'planning'

/** Il gruppo di una tabella; `null` se non si sa (allora si ricarica tutto, per sicurezza). */
export function scopeOfTable(table: string): Scope | null {
  switch (table) {
    case 'trips':
    case 'days':
      return 'trips'
    case 'places':
      return 'places'
    case 'categories':
      return 'categories'
    case 'expense_categories':
      return 'expenseCategories'
    case 'day_items':
      return 'items'
    case 'stays':
    case 'transports':
    case 'flights':
    case 'flight_legs':
      return 'logistics'
    case 'budget_items':
    case 'budget_item_shares':
    case 'expenses':
    case 'expense_shares':
      return 'money'
    case 'checklist_items':
    case 'bookings':
      return 'planning'
    default:
      return null
  }
}

/** Quali gruppi di dati toccano delle scritture in coda; `undefined` (= ricarica tutto) se una non è riconosciuta. */
export function scopeOfOps(ops: readonly Op[]): Scope[] | undefined {
  const set = new Set<Scope>()
  for (const op of ops) {
    const scope = op.k === 'expenseShares' ? 'money' : scopeOfTable(op.table)
    if (!scope) return undefined
    set.add(scope)
  }
  return set.size > 0 ? [...set] : undefined
}

/** Ultime righe scaricate, per ricaricare solo una parte e riusare il resto. */
let raw: { trips: TripRow[]; extras: Extras; people: Map<string, PersonRow[]> } | null = null

/** Da chiamare all'uscita dall'account: niente dati di un altro utente nella copia in memoria. */
export function forgetFetched(): void {
  raw = null
}

/**
 * Scarica i viaggi. Senza `only` (o se non c'è ancora una copia) ricarica tutto; con `only` ricarica
 * solo quei gruppi e riusa le righe già scaricate per gli altri.
 */
export async function fetchTrips(only?: Scope[]): Promise<Trip[]> {
  const db = client()
  const prev = only && raw ? raw : null
  const want = (s: Scope) => !prev || !!only?.includes(s)
  const keep = <T,>(fresh: { data: unknown } | null | undefined, old: T): T => (fresh ? (fresh.data as T) : old)
  // Richieste separate e in parallelo: più semplici e robuste degli "embed" annidati.
  const [trips, places, categories, expenseCategories, items, logisticsR, moneyR, planningR] = await Promise.all([
    want('trips')
      ? db
          .from('trips')
          .select('*, trip_travelers(*), days(*)')
          .is('deleted_at', null)
          .order('start_date', { ascending: true, nullsFirst: false })
      : null,
    want('places') ? db.from('places').select('*').is('deleted_at', null) : null,
    want('categories') ? db.from('categories').select('*').is('deleted_at', null) : null,
    // prima della migrazione 0008 la tabella non esiste: l'app funziona lo stesso, senza categorie di spesa
    want('expenseCategories')
      ? db.from('expense_categories').select('*').is('deleted_at', null).then((r) => (r.error && /expense_categories|schema cache|does not exist/i.test(r.error.message) ? { ...r, data: [], error: null } : r))
      : null,
    want('items') ? db.from('day_items').select('*').is('deleted_at', null) : null,
    want('logistics') ? queryLogistics(db) : null,
    want('money') ? queryMoney(db) : null,
    want('planning') ? queryPlanning(db) : null,
  ])
  const results = [trips, places, categories, expenseCategories, items, ...(logisticsR ?? []), ...(moneyR ?? []), ...(planningR ?? [])]
  for (const r of results) if (r?.error) throw r.error
  const [stays, transports, flights, legs] = logisticsR ?? []
  const [budgetItems, budgetShares, expenses, expenseShares] = moneyR ?? []
  const [checklist, bookings] = planningR ?? []
  const old = prev?.extras
  const extras: Extras = {
    places: keep(places, old?.places as PlaceRow[]),
    categories: keep(categories, old?.categories as CategoryRow[]),
    expenseCategories: keep(expenseCategories, old?.expenseCategories as CategoryRow[]),
    items: keep(items, old?.items as ItemRow[]),
    stays: keep(stays, old?.stays as StayRow[]),
    transports: keep(transports, old?.transports as TransportRow[]),
    flights: keep(flights, old?.flights as FlightRow[]),
    legs: keep(legs, old?.legs as FlightLegRow[]),
    budgetItems: keep(budgetItems, old?.budgetItems as BudgetItemRow[]),
    budgetShares: keep(budgetShares, old?.budgetShares as BudgetShareRow[]),
    expenses: keep(expenses, old?.expenses as ExpenseRow[]),
    expenseShares: keep(expenseShares, old?.expenseShares as ExpenseShareRow[]),
    checklist: keep(checklist, old?.checklist as ChecklistRow[]),
    bookings: keep(bookings, old?.bookings as BookingRow[]),
  }
  const rows = keep(trips, prev?.trips as TripRow[])
  const myId = (await db.auth.getSession()).data.session?.user.id
  // chi ha accesso: una richiesta per viaggio, solo per i viaggi che non conosco ancora
  const people = new Map<string, PersonRow[]>()
  await Promise.all(
    rows.map(async (r) => {
      const known = prev?.people.get(r.id)
      people.set(r.id, known ?? (await loadPeople(r.id)))
    }),
  )
  raw = { trips: rows, extras, people }
  return rows.map((row) => mapTrip(row, extras, people.get(row.id) ?? [], myId))
}

/** Chi ha accesso al viaggio, con email e ruolo. Se la funzione non c'è ancora (migrazione 0006) l'app funziona lo stesso. */
async function loadPeople(tripId: string): Promise<PersonRow[]> {
  try {
    const { data, error } = await client().rpc('trip_people', { _trip: tripId })
    return error ? [] : ((data ?? []) as PersonRow[])
  } catch {
    return []
  }
}

function tripColumns(input: TripInput) {
  return {
    title: input.title.trim(),
    destination: input.destination.trim() || null,
    start_date: input.startDate,
    end_date: input.endDate,
    timezone: input.timezone.trim() || 'UTC',
    theme: input.theme,
    base_currency: input.baseCurrency.trim().toUpperCase() || 'EUR',
    local_currency: input.localCurrency.trim().toUpperCase() || null,
    center_lat: input.center.lat,
    center_lng: input.center.lng,
    // solo se serve: senza la migrazione 0013 la colonna non esiste e la richiesta fallirebbe
    ...(input.budgetLimit !== undefined ? { budget_limit: input.budgetLimit } : {}),
    // idem per la migrazione 0014
    ...(input.originCountry !== undefined ? { origin_country: input.originCountry, origin_timezone: input.originTimezone ?? null } : {}),
  }
}

/**
 * Crea viaggio + viaggiatori + giorni. Chi crea è il primo viaggiatore (col proprio account);
 * gli altri si aggiungono con l'email di un account esistente. Se un passaggio fallisce
 * il viaggio appena creato viene annullato.
 */
export async function createTrip(input: TripInput, people: TripPeople): Promise<string> {
  const db = client()
  const uid = (await db.auth.getSession()).data.session?.user.id
  if (!uid) throw new Error('Sessione scaduta: esci e accedi di nuovo.')
  const { data, error } = await db.from('trips').insert(tripColumns(input)).select('id').single()
  if (error) throw error
  const id = (data as { id: string }).id

  try {
    const me = await db
      .from('trip_travelers')
      .insert({ trip_id: id, name: people.self.name.trim(), color: people.self.color, position: 1000, user_id: uid })
    if (me.error) throw me.error
    for (const o of people.others) {
      const res = await db.rpc('add_traveler_by_email', { _trip: id, _email: o.email.trim(), _name: o.name.trim(), _color: o.color })
      if (res.error) throw res.error
    }
    const dates = enumerateDates(input.startDate, input.endDate)
    if (dates.length > 0) {
      const res = await db.from('days').insert(dates.map((date) => ({ trip_id: id, date })))
      if (res.error) throw res.error
    }
  } catch (e) {
    // le righe figlie si eliminano a cascata; se non è permesso, almeno si nasconde il viaggio
    const del = await db.from('trips').delete().eq('id', id)
    if (del.error) await db.from('trips').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    throw e
  }
  return id
}

/** Aggiorna i dati del viaggio e riallinea i giorni alle nuove date senza perdere nulla. */
export async function updateTrip(id: string, input: TripInput): Promise<void> {
  const db = client()
  const { error } = await db.from('trips').update(tripColumns(input)).eq('id', id)
  if (error) throw error

  const { data, error: daysError } = await db.from('days').select('id, date, deleted_at').eq('trip_id', id)
  if (daysError) throw daysError
  const existing = (data as Pick<DayRow, 'id' | 'date' | 'deleted_at'>[]).map((d) => ({
    id: d.id,
    date: d.date,
    deleted: d.deleted_at !== null,
  }))
  const plan = planDays(existing, input.startDate, input.endDate)

  if (plan.create.length > 0) {
    const res = await db.from('days').insert(plan.create.map((date) => ({ trip_id: id, date })))
    if (res.error) throw res.error
  }
  if (plan.restore.length > 0) {
    const res = await db.from('days').update({ deleted_at: null }).in('id', plan.restore)
    if (res.error) throw res.error
  }
  if (plan.hide.length > 0) {
    const res = await db.from('days').update({ deleted_at: new Date().toISOString() }).in('id', plan.hide)
    if (res.error) throw res.error
  }
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await client().from('trips').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function updateDay(id: string, patch: { city: string; title: string; notes: string }): Promise<void> {
  const { error } = await client()
    .from('days')
    .update({
      city: patch.city.trim() || null,
      title: patch.title.trim() || null,
      notes: patch.notes.trim() || null,
    })
    .eq('id', id)
  if (error) throw error
}

/** Aggiunge una persona al viaggio dalla sua email: deve avere già un account (solo l'owner). */
export async function addTraveler(tripId: string, input: InvitedInput): Promise<void> {
  const { error } = await client().rpc('add_traveler_by_email', {
    _trip: tripId,
    _email: input.email.trim(),
    _name: input.name.trim(),
    _color: input.color,
  })
  if (error) throw error
}

/** Collega a un account un viaggiatore che non ne ha ancora uno (solo l'owner). */
export async function linkTraveler(id: string, email: string): Promise<void> {
  const { error } = await client().rpc('link_traveler_to_email', { _traveler: id, _email: email.trim() })
  if (error) throw error
}

export async function updateTraveler(id: string, input: TravelerInput): Promise<void> {
  const { error } = await client()
    .from('trip_travelers')
    .update({ name: input.name.trim(), color: input.color })
    .eq('id', id)
  if (error) throw error
}

export async function removeTraveler(id: string): Promise<void> {
  const { error } = await client()
    .from('trip_travelers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ---------- luoghi e categorie ----------

export interface PlaceInput {
  name: string
  nameLocal: string
  city: string
  category: string
  status: PlaceStatus
  notes: string
  address: string
  mapsUrl: string
  openingHours: string
  /** Quanto fermarsi, in minuti. `undefined` = non toccare la colonna, `null` = nessuna durata. */
  visitMinutes?: number | null
  lat: number | null
  lng: number | null
}

/** Trova la categoria per nome (senza badare alle maiuscole) o la crea. */
async function resolveCategory(tripId: string, label: string, known: Category[]): Promise<string | null> {
  const clean = label.trim()
  if (!clean) return null
  const hit = known.find((c) => c.label.toLowerCase() === clean.toLowerCase())
  if (hit) return hit.id
  const db = client()
  const position = (known.length + 1) * 1000
  const { data, error } = await db
    .from('categories')
    .insert({ trip_id: tripId, label: clean, position })
    .select('id')
    .single()
  if (!error) return (data as { id: string }).id
  // già esistente ma non ancora nella cache locale (o nascosta): la recupero
  const found = await db.from('categories').select('id').eq('trip_id', tripId).ilike('label', clean).limit(1)
  if (found.error || !found.data?.length) throw error
  const id = (found.data[0] as { id: string }).id
  await db.from('categories').update({ deleted_at: null }).eq('id', id)
  return id
}

const MIGRATION_0015 =
  "Manca la migrazione 0015 sul database: eseguila nell'SQL Editor di Supabase (file supabase/migrations/0015_visit_duration.sql). Senza, il tempo di permanenza non si può salvare."
const needs0015 = (error: { message: string }) => (/visit_minutes|duration_minutes/i.test(error.message) ? new Error(MIGRATION_0015) : error)

function placeColumns(input: PlaceInput, categoryId: string | null) {
  return {
    category_id: categoryId,
    name: input.name.trim(),
    name_local: input.nameLocal.trim() || null,
    city: input.city.trim() || null,
    address: input.address.trim() || null,
    lat: input.lat,
    lng: input.lng,
    maps_url: input.mapsUrl.trim() || null,
    opening_hours: input.openingHours.trim() || null,
    status: input.status,
    notes: input.notes.trim() || null,
    // solo se serve: senza la migrazione 0015 la colonna non esiste e la richiesta fallirebbe
    ...(input.visitMinutes !== undefined ? { visit_minutes: input.visitMinutes } : {}),
  }
}

export async function createPlace(tripId: string, input: PlaceInput, known: Category[]): Promise<string> {
  const categoryId = await resolveCategory(tripId, input.category, known)
  const { data, error } = await client()
    .from('places')
    .insert({ trip_id: tripId, ...placeColumns(input, categoryId) })
    .select('id')
    .single()
  if (error) throw needs0015(error)
  return (data as { id: string }).id
}

/**
 * Salva il luogo. Se è stato rinominato, le tappe che si chiamano ancora come il vecchio nome (cioè non
 * personalizzate) prendono il nuovo: il luogo e le sue tappe nei giorni restano la stessa cosa.
 */
export async function updatePlace(id: string, tripId: string, input: PlaceInput, known: Category[], oldName?: string): Promise<void> {
  const categoryId = await resolveCategory(tripId, input.category, known)
  const db = client()
  const { error } = await db.from('places').update(placeColumns(input, categoryId)).eq('id', id)
  if (error) throw needs0015(error)
  const newName = input.name.trim()
  if (oldName && newName && oldName !== newName) {
    const renamed = await db.from('day_items').update({ title: newName }).eq('place_id', id).eq('title', oldName)
    if (renamed.error) throw renamed.error
  }
}

// ---------- import da Google Maps (.kmz) ----------

export interface ImportResult {
  tripId: string
  /** Luoghi aggiunti. */
  created: string[]
  /** Valori di prima dei luoghi modificati, per annullare. */
  previous: { id: string; name: string; maps_url: string | null; lat: number | null; lng: number | null }[]
}

const UPSERT_CHUNK = 100

/**
 * Applica un piano di import: crea le categorie mancanti, aggiunge i luoghi nuovi e aggiorna link/posizione
 * di quelli esistenti. Si può rilanciare senza duplicare (l'abbinamento è per nome).
 */
export async function importPlaces(
  tripId: string,
  plan: { updates: { id: string; name: string; patch: { mapsUrl?: string; lat?: number; lng?: number } }[]; fresh: PlaceInput[] },
  known: Category[],
  current: { id: string; name: string; mapsUrl?: string; lat: number | null; lng: number | null }[],
): Promise<ImportResult> {
  const db = client()
  const result: ImportResult = { tripId, created: [], previous: [] }

  // categorie: quelle nuove si creano tutte insieme (una richiesta); se qualcosa non va (es. una categoria
  // nascosta con lo stesso nome) si ripiega sul metodo uno per uno, che sa recuperarla
  const labels = [...new Set(plan.fresh.map((i) => i.category.trim()).filter(Boolean))]
  const categoryId = new Map<string, string | null>()
  const have = [...known]
  for (const c of known) categoryId.set(c.label.toLowerCase(), c.id)
  const missing = labels.filter((l) => !categoryId.has(l.toLowerCase()))
  if (missing.length > 0) {
    const created = await db
      .from('categories')
      .insert(missing.map((label, i) => ({ trip_id: tripId, label, position: (known.length + i + 1) * 1000 })))
      .select('id,label')
    if (!created.error) {
      for (const c of created.data as { id: string; label: string }[]) {
        categoryId.set(c.label.toLowerCase(), c.id)
        have.push({ id: c.id, label: c.label })
      }
    }
  }
  for (const label of labels) {
    if (categoryId.has(label.toLowerCase())) continue
    const id = await resolveCategory(tripId, label, have)
    categoryId.set(label.toLowerCase(), id)
    if (id && !have.some((c) => c.id === id)) have.push({ id, label })
  }

  const rows = plan.fresh.map((i) => ({
    trip_id: tripId,
    ...placeColumns(i, categoryId.get(i.category.trim().toLowerCase()) ?? null),
    source: 'import:kmz',
  }))
  for (let i = 0; i < rows.length; i += 50) {
    const { data, error } = await db.from('places').insert(rows.slice(i, i + 50)).select('id')
    if (error) throw error
    result.created.push(...(data as { id: string }[]).map((r) => r.id))
  }

  // link e posizione dei luoghi esistenti: una richiesta ogni 100 luoghi (upsert su id, che aggiorna solo le colonne indicate)
  for (let i = 0; i < plan.updates.length; i += UPSERT_CHUNK) {
    const chunk = plan.updates.slice(i, i + UPSERT_CHUNK)
    // tutte e tre le colonne in ogni riga (con il valore attuale se non cambia): una colonna mancante verrebbe azzerata
    const rows = chunk.map((u) => {
      const now = current.find((p) => p.id === u.id)
      return {
        id: u.id,
        trip_id: tripId,
        name: u.name,
        maps_url: u.patch.mapsUrl ?? now?.mapsUrl ?? null,
        lat: u.patch.lat ?? now?.lat ?? null,
        lng: u.patch.lng ?? now?.lng ?? null,
      }
    })
    const { error } = await db.from('places').upsert(rows, { onConflict: 'id' })
    if (error) throw error
    for (const u of chunk) {
      const before = current.find((p) => p.id === u.id)
      result.previous.push({ id: u.id, name: before?.name ?? u.name, maps_url: before?.mapsUrl ?? null, lat: before?.lat ?? null, lng: before?.lng ?? null })
    }
  }
  return result
}

/** Imposta la posizione di più luoghi insieme (una richiesta ogni 100): usata quando le coordinate si cercano dopo l'import. */
export async function setPlacePositions(
  tripId: string,
  updates: { id: string; name: string; lat: number; lng: number }[],
  current: { id: string; name: string; mapsUrl?: string; lat: number | null; lng: number | null }[],
): Promise<void> {
  await importPlaces(tripId, { updates: updates.map((u) => ({ id: u.id, name: u.name, patch: { lat: u.lat, lng: u.lng } })), fresh: [] }, [], current)
}

/** Annulla un import: toglie i luoghi aggiunti e rimette link e posizione di prima. */
export async function undoImport(result: ImportResult): Promise<void> {
  const db = client()
  if (result.created.length > 0) {
    const { error } = await db.from('places').update({ deleted_at: new Date().toISOString() }).in('id', result.created)
    if (error) throw error
  }
  for (let i = 0; i < result.previous.length; i += UPSERT_CHUNK) {
    const rows = result.previous.slice(i, i + UPSERT_CHUNK).map((p) => ({ id: p.id, trip_id: result.tripId, name: p.name, maps_url: p.maps_url, lat: p.lat, lng: p.lng }))
    const { error } = await db.from('places').upsert(rows, { onConflict: 'id' })
    if (error) throw error
  }
}

export async function setPlaceStatus(id: string, status: PlaceStatus): Promise<void> {
  const { error } = await client().from('places').update({ status }).eq('id', id)
  if (error) throw error
}

export async function setPlaceDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await client()
    .from('places')
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

/** Elimina (o ripristina) più luoghi con UNA richiesta, non una per luogo. */
export async function setPlacesDeleted(ids: string[], deleted: boolean): Promise<void> {
  const at = deleted ? new Date().toISOString() : null
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await client().from('places').update({ deleted_at: at }).in('id', ids.slice(i, i + 200))
    if (error) throw error
  }
}

// ---------- tappe del giorno ----------

export interface ItemInput {
  title: string
  kind: ItemKind
  startTime: string // "HH:MM" oppure ''
  endTime: string
  notes: string
  placeId: string | null
  /** Durata propria. `undefined` = non toccare, `null` = come il luogo collegato. */
  durationMinutes?: number | null
}

const timeOrNull = (t: string) => (/^\d{2}:\d{2}$/.test(t) ? t : null)

function itemColumns(input: ItemInput) {
  return {
    title: input.title.trim(),
    kind: input.kind,
    start_time: timeOrNull(input.startTime),
    end_time: timeOrNull(input.endTime),
    notes: input.notes.trim() || null,
    place_id: input.placeId,
    ...(input.durationMinutes !== undefined ? { duration_minutes: input.durationMinutes } : {}),
  }
}

export async function createItem(tripId: string, dayId: string, input: ItemInput, position: number): Promise<void> {
  const { error } = await client()
    .from('day_items')
    .insert({ trip_id: tripId, day_id: dayId, position, ...itemColumns(input) })
  if (error) throw needs0015(error)
}

export async function updateItem(id: string, input: ItemInput): Promise<void> {
  const { error } = await client().from('day_items').update(itemColumns(input)).eq('id', id)
  if (error) throw needs0015(error)
}

export async function setItemPositions(list: { id: string; position: number }[]): Promise<void> {
  const db = client()
  const results = await Promise.all(list.map((x) => db.from('day_items').update({ position: x.position }).eq('id', x.id)))
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

export async function setItemDone(id: string, done: boolean): Promise<void> {
  const { error } = await client().from('day_items').update({ done }).eq('id', id)
  if (error) throw error
}

export async function setItemDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await client()
    .from('day_items')
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}
