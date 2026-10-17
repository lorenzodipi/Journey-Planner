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
}
interface Extras {
  places: PlaceRow[]
  categories: CategoryRow[]
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
    stays: mapStays(extras.stays, row.id),
    transports: mapTransports(extras.transports, row.id),
    flights: mapFlights(extras.flights, extras.legs, row.id),
    budget: mapBudget(extras.budgetItems, extras.budgetShares, row.id),
    expenses: mapExpenses(extras.expenses, extras.expenseShares, row.id),
    checklist: mapChecklist(extras.checklist, row.id),
    bookings: mapBookings(extras.bookings, row.id),
    fxRate: row.fx_rate == null ? undefined : Number(row.fx_rate),
  }
}

export async function fetchTrips(): Promise<Trip[]> {
  const db = client()
  // Richieste separate e in parallelo: più semplici e robuste degli "embed" annidati.
  const [trips, places, categories, items, [stays, transports, flights, legs], [budgetItems, budgetShares, expenses, expenseShares], [checklist, bookings]] = await Promise.all([
    db
      .from('trips')
      .select('*, trip_travelers(*), days(*)')
      .is('deleted_at', null)
      .order('start_date', { ascending: true, nullsFirst: false }),
    db.from('places').select('*').is('deleted_at', null),
    db.from('categories').select('*').is('deleted_at', null),
    db.from('day_items').select('*').is('deleted_at', null),
    queryLogistics(db),
    queryMoney(db),
    queryPlanning(db),
  ])
  for (const r of [trips, places, categories, items, stays, transports, flights, legs, budgetItems, budgetShares, expenses, expenseShares, checklist, bookings]) if (r.error) throw r.error
  const extras: Extras = {
    places: places.data as PlaceRow[],
    categories: categories.data as CategoryRow[],
    items: items.data as ItemRow[],
    stays: stays.data as StayRow[],
    transports: transports.data as TransportRow[],
    flights: flights.data as FlightRow[],
    legs: legs.data as FlightLegRow[],
    budgetItems: budgetItems.data as BudgetItemRow[],
    budgetShares: budgetShares.data as BudgetShareRow[],
    expenses: expenses.data as ExpenseRow[],
    expenseShares: expenseShares.data as ExpenseShareRow[],
    checklist: checklist.data as ChecklistRow[],
    bookings: bookings.data as BookingRow[],
  }
  const rows = trips.data as TripRow[]
  const myId = (await db.auth.getSession()).data.session?.user.id
  const people = await Promise.all(rows.map((r) => loadPeople(r.id)))
  return rows.map((row, i) => mapTrip(row, extras, people[i], myId))
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
  }
}

export async function createPlace(tripId: string, input: PlaceInput, known: Category[]): Promise<string> {
  const categoryId = await resolveCategory(tripId, input.category, known)
  const { data, error } = await client()
    .from('places')
    .insert({ trip_id: tripId, ...placeColumns(input, categoryId) })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function updatePlace(id: string, tripId: string, input: PlaceInput, known: Category[]): Promise<void> {
  const categoryId = await resolveCategory(tripId, input.category, known)
  const { error } = await client().from('places').update(placeColumns(input, categoryId)).eq('id', id)
  if (error) throw error
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

// ---------- tappe del giorno ----------

export interface ItemInput {
  title: string
  kind: ItemKind
  startTime: string // "HH:MM" oppure ''
  endTime: string
  notes: string
  placeId: string | null
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
  }
}

export async function createItem(tripId: string, dayId: string, input: ItemInput, position: number): Promise<void> {
  const { error } = await client()
    .from('day_items')
    .insert({ trip_id: tripId, day_id: dayId, position, ...itemColumns(input) })
  if (error) throw error
}

export async function updateItem(id: string, input: ItemInput): Promise<void> {
  const { error } = await client().from('day_items').update(itemColumns(input)).eq('id', id)
  if (error) throw error
}

export async function setItemPosition(id: string, position: number): Promise<void> {
  const { error } = await client().from('day_items').update({ position }).eq('id', id)
  if (error) throw error
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
