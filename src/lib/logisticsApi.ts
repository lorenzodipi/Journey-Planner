import type { SupabaseClient } from '@supabase/supabase-js'
import type { Day, Flight } from '../types'
import { client } from './db'
import {
  flightColumns,
  legColumns,
  stayColumns,
  transportColumns,
  type FlightInput,
  type StayInput,
  type TransportInput,
} from './logistics'

// Scritture e letture per alloggi, trasporti e voli.

/** Letture in parallelo, usate da `fetchTrips`. */
export function queryLogistics(db: SupabaseClient) {
  return Promise.all([
    db.from('stays').select('*').is('deleted_at', null),
    db.from('transports').select('*').is('deleted_at', null),
    db.from('flights').select('*').is('deleted_at', null),
    db.from('flight_legs').select('*').is('deleted_at', null),
  ])
}

const now = () => new Date().toISOString()

// ---------- alloggi ----------

export async function createStay(tripId: string, input: StayInput): Promise<void> {
  const { error } = await client().from('stays').insert({ trip_id: tripId, ...stayColumns(input) })
  if (error) throw error
}

export async function updateStay(id: string, input: StayInput): Promise<void> {
  const { error } = await client().from('stays').update(stayColumns(input)).eq('id', id)
  if (error) throw error
}

export async function setStayFlag(id: string, flag: 'booked' | 'paid', value: boolean): Promise<void> {
  const { error } = await client().from('stays').update({ [flag]: value }).eq('id', id)
  if (error) throw error
}

export async function setStayDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await client().from('stays').update({ deleted_at: deleted ? now() : null }).eq('id', id)
  if (error) throw error
}

// ---------- trasporti ----------

const MIGRATION_0009 =
  "Manca la migrazione 0009 sul database: eseguila nell'SQL Editor di Supabase (file supabase/migrations/0009_transport_dates.sql). Senza, le date senza ora non si possono salvare."
const missingDateColumns = (error: { message?: string } | null) => /depart_date|arrive_date/.test(error?.message ?? '')

function withoutDateColumns<T extends { depart_date?: unknown; arrive_date?: unknown }>(columns: T): Omit<T, 'depart_date' | 'arrive_date'> {
  const { depart_date: _d, arrive_date: _a, ...rest } = columns
  return rest
}

/**
 * Prima della migrazione 0009 le colonne delle date senza ora non esistono. Se la data va salvata lì si dice di
 * eseguire la migrazione (meglio che perderla in silenzio); se non serve, si salva come prima.
 */
async function saveTransport(columns: ReturnType<typeof transportColumns>, write: (c: object) => PromiseLike<{ error: { message?: string } | null }>): Promise<void> {
  let { error } = await write(columns)
  if (missingDateColumns(error)) {
    if (columns.depart_date || columns.arrive_date) throw new Error(MIGRATION_0009)
    ;({ error } = await write(withoutDateColumns(columns)))
  }
  if (error) throw error
}

export async function createTransport(
  tripId: string,
  input: TransportInput,
  timeZone: string,
  days: Pick<Day, 'id' | 'date'>[],
): Promise<void> {
  await saveTransport(transportColumns(input, timeZone, days), (c) => client().from('transports').insert({ trip_id: tripId, ...c }))
}

export async function updateTransport(
  id: string,
  input: TransportInput,
  timeZone: string,
  days: Pick<Day, 'id' | 'date'>[],
): Promise<void> {
  await saveTransport(transportColumns(input, timeZone, days), (c) => client().from('transports').update(c).eq('id', id))
}

export async function setTransportBought(id: string, bought: boolean): Promise<void> {
  const { error } = await client().from('transports').update({ bought }).eq('id', id)
  if (error) throw error
}

export async function setTransportDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await client().from('transports').update({ deleted_at: deleted ? now() : null }).eq('id', id)
  if (error) throw error
}

// ---------- voli ----------

export async function createFlight(tripId: string, input: FlightInput): Promise<void> {
  const db = client()
  const legs = legColumns(input.legs) // calcola prima: se un orario è invalido non si crea nulla
  const { data, error } = await db.from('flights').insert({ trip_id: tripId, ...flightColumns(input) }).select('id').single()
  if (error) throw error
  const flightId = (data as { id: string }).id
  if (legs.length === 0) return
  const res = await db.from('flight_legs').insert(legs.map((l) => ({ ...l, trip_id: tripId, flight_id: flightId })))
  if (res.error) {
    await db.from('flights').update({ deleted_at: now() }).eq('id', flightId) // niente voli a metà
    throw res.error
  }
}

/**
 * Aggiorna volo e tratte. Le tratte si sostituiscono (la numerazione `seq` è unica per volo):
 * se l'inserimento fallisce, si rimettono quelle di prima.
 */
export async function updateFlight(old: Flight, tripId: string, input: FlightInput): Promise<void> {
  const db = client()
  const legs = legColumns(input.legs)
  const head = await db.from('flights').update(flightColumns(input)).eq('id', old.id)
  if (head.error) throw head.error
  const del = await db.from('flight_legs').delete().eq('flight_id', old.id)
  if (del.error) throw del.error
  if (legs.length === 0) return
  const res = await db.from('flight_legs').insert(legs.map((l) => ({ ...l, trip_id: tripId, flight_id: old.id })))
  if (res.error) {
    await db.from('flight_legs').insert(
      old.legs.map((l) => ({
        trip_id: tripId,
        flight_id: old.id,
        seq: l.seq,
        flight_number: l.flightNumber ?? null,
        from_airport: l.from,
        to_airport: l.to,
        depart_at: l.departAt,
        arrive_at: l.arriveAt,
        from_tz: l.fromTz,
        to_tz: l.toTz,
        cabin: l.cabin ?? null,
        seats: l.seats ?? null,
        notes: l.notes ?? null,
      })),
    )
    throw res.error
  }
}

export async function setFlightPaid(id: string, paid: boolean): Promise<void> {
  const { error } = await client().from('flights').update({ paid }).eq('id', id)
  if (error) throw error
}

export async function setFlightDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await client().from('flights').update({ deleted_at: deleted ? now() : null }).eq('id', id)
  if (error) throw error
}
