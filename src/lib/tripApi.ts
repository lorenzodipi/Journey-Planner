import type { Day, ThemeName, Traveler, Trip } from '../types'
import { todayYmd } from './dates'
import { supabase } from './supabase'
import { DEFAULT_CENTER } from './tripForm'
import { enumerateDates, planDays } from './tripDays'

// Accesso ai dati dei viaggi. La sicurezza non dipende da questo codice ma dalla
// Row Level Security del database: qui si legge e si scrive come utente loggato.

export interface TravelerInput {
  name: string
  color: string
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
  center_lat: number | null
  center_lng: number | null
  trip_travelers: TravelerRow[]
  days: DayRow[]
}

function client() {
  if (!supabase) throw new Error('Supabase non è configurato.')
  if (!navigator.onLine) throw new Error('Sei offline: la modifica non è stata salvata. Riprova con la connessione.')
  return supabase
}

/** Messaggi comprensibili al posto degli errori grezzi del database. */
export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error)
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Connessione assente o instabile. Riprova.'
  if (/row-level security|permission denied/i.test(message)) return 'Non hai il permesso per questa operazione.'
  if (/duplicate key/i.test(message)) return 'Esiste già un elemento uguale.'
  if (/trips_dates_ok/i.test(message)) return 'La data di fine non può essere prima di quella di inizio.'
  return message
}

function mapTrip(row: TripRow): Trip {
  const travelers: Traveler[] = (row.trip_travelers ?? [])
    .filter((t) => !t.deleted_at)
    .sort((a, b) => a.position - b.position)
    .map((t) => ({ id: t.id, name: t.name, color: t.color, position: t.position }))

  const days: Day[] = (row.days ?? [])
    .filter((d) => !d.deleted_at)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      id: d.id,
      date: d.date,
      city: d.city ?? '',
      title: d.title ?? undefined,
      notes: d.notes ?? undefined,
      items: [], // le tappe arrivano nello Sprint 2
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
    days,
    places: [], // i luoghi arrivano nello Sprint 2
  }
}

export async function fetchTrips(): Promise<Trip[]> {
  const db = client()
  const { data, error } = await db
    .from('trips')
    .select('*, trip_travelers(*), days(*)')
    .is('deleted_at', null)
    .order('start_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data as TripRow[]).map(mapTrip)
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

/** Crea viaggio + viaggiatori + giorni. Se un passaggio fallisce, il viaggio viene annullato. */
export async function createTrip(input: TripInput, travelers: TravelerInput[]): Promise<string> {
  const db = client()
  const { data, error } = await db.from('trips').insert(tripColumns(input)).select('id').single()
  if (error) throw error
  const id = (data as { id: string }).id

  try {
    if (travelers.length > 0) {
      const rows = travelers.map((t, i) => ({
        trip_id: id,
        name: t.name.trim(),
        color: t.color,
        position: (i + 1) * 1000,
      }))
      const res = await db.from('trip_travelers').insert(rows)
      if (res.error) throw res.error
    }
    const dates = enumerateDates(input.startDate, input.endDate)
    if (dates.length > 0) {
      const res = await db.from('days').insert(dates.map((date) => ({ trip_id: id, date })))
      if (res.error) throw res.error
    }
  } catch (e) {
    await db.from('trips').update({ deleted_at: new Date().toISOString() }).eq('id', id)
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

export async function addTraveler(tripId: string, input: TravelerInput, position: number): Promise<void> {
  const { error } = await client()
    .from('trip_travelers')
    .insert({ trip_id: tripId, name: input.name.trim(), color: input.color, position })
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

/** Dà accesso al viaggio a un utente già creato in Supabase (solo l'owner può farlo). */
export async function addMember(tripId: string, email: string, role: 'editor' | 'viewer'): Promise<void> {
  const { error } = await client().rpc('add_member_by_email', { _trip: tripId, _email: email.trim(), _role: role })
  if (error) throw error
}
