import type { Day, Flight, FlightLeg, Scope, Stay, Transport, TransportMode } from '../types'
import { formatDateInZone } from './flights'
import { instantToZoned, isCompleteZoned, zonedToInstant } from './zoned'

// Alloggi, trasporti e voli: righe del database <-> tipi dell'app, e costruzione delle colonne
// da salvare a partire dai moduli. Funzioni pure, provate nei test.

export interface StayRow {
  id: string
  trip_id: string
  city: string | null
  name: string
  check_in: string
  check_out: string
  check_in_info: string | null
  check_out_info: string | null
  address: string | null
  maps_url: string | null
  total_cost: number | string | null
  currency: string
  breakfast: boolean
  dinner?: boolean // assente finché non è applicata la migrazione 0004
  kitchen: boolean
  booked: boolean
  paid: boolean
  notes: string | null
}

export interface TransportRow {
  id: string
  trip_id: string
  day_id: string | null
  from_label: string
  to_label: string
  mode: TransportMode
  depart_at: string | null
  arrive_at: string | null
  depart_date?: string | null // assenti finché non è applicata la migrazione 0009
  arrive_date?: string | null
  from_lat?: number | null // assenti finché non è applicata la migrazione 0005
  from_lng?: number | null
  to_lat?: number | null
  to_lng?: number | null
  cost: number | string | null
  currency: string
  scope: Scope
  bought: boolean
  ref_code: string | null
  notes: string | null
}

export interface FlightRow {
  id: string
  trip_id: string
  title: string
  airline: string | null
  booking_ref: string | null
  cost: number | string | null
  currency: string
  scope: Scope
  paid: boolean
  notes: string | null
}

export interface FlightLegRow {
  id: string
  trip_id: string
  flight_id: string
  seq: number
  flight_number: string | null
  from_airport: string
  to_airport: string
  depart_at: string
  arrive_at: string
  from_tz: string
  to_tz: string
  cabin: string | null
  seats: string | null
  notes: string | null
}

const num = (v: number | string | null): number | undefined => (v == null ? undefined : Number(v))

export function mapStays(rows: StayRow[], tripId: string): Stay[] {
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city ?? '',
      checkIn: r.check_in,
      checkOut: r.check_out,
      checkInInfo: r.check_in_info ?? undefined,
      checkOutInfo: r.check_out_info ?? undefined,
      address: r.address ?? undefined,
      mapsUrl: r.maps_url ?? undefined,
      totalCost: num(r.total_cost),
      currency: r.currency.trim(),
      breakfast: r.breakfast,
      dinner: r.dinner ?? false,
      kitchen: r.kitchen,
      booked: r.booked,
      paid: r.paid,
      notes: r.notes ?? undefined,
    }))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.name.localeCompare(b.name, 'it'))
}

export function mapTransports(rows: TransportRow[], tripId: string): Transport[] {
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      from: r.from_label,
      to: r.to_label,
      mode: r.mode,
      departAt: r.depart_at ?? undefined,
      arriveAt: r.arrive_at ?? undefined,
      departDate: r.depart_at ? undefined : (r.depart_date ?? undefined),
      arriveDate: r.arrive_at ? undefined : (r.arrive_date ?? undefined),
      dayId: r.day_id ?? undefined,
      fromLat: r.from_lat ?? undefined,
      fromLng: r.from_lng ?? undefined,
      toLat: r.to_lat ?? undefined,
      toLng: r.to_lng ?? undefined,
      cost: num(r.cost),
      currency: r.currency.trim(),
      scope: r.scope,
      bought: r.bought,
      refCode: r.ref_code ?? undefined,
      notes: r.notes ?? undefined,
    }))
    .sort((a, b) => (a.departAt ?? '9999').localeCompare(b.departAt ?? '9999') || a.from.localeCompare(b.from, 'it'))
}

export function mapFlights(rows: FlightRow[], legs: FlightLegRow[], tripId: string): Flight[] {
  return rows
    .filter((r) => r.trip_id === tripId)
    .map((r) => ({
      id: r.id,
      title: r.title,
      airline: r.airline ?? undefined,
      bookingRef: r.booking_ref ?? undefined,
      cost: num(r.cost),
      currency: r.currency.trim(),
      scope: r.scope,
      paid: r.paid,
      notes: r.notes ?? undefined,
      legs: legs
        .filter((l) => l.flight_id === r.id)
        .sort((a, b) => a.seq - b.seq)
        .map<FlightLeg>((l) => ({
          id: l.id,
          seq: l.seq,
          flightNumber: l.flight_number ?? undefined,
          from: l.from_airport.trim(),
          to: l.to_airport.trim(),
          departAt: l.depart_at,
          arriveAt: l.arrive_at,
          fromTz: l.from_tz,
          toTz: l.to_tz,
          cabin: l.cabin ?? undefined,
          seats: l.seats ?? undefined,
          notes: l.notes ?? undefined,
        })),
    }))
    .sort((a, b) => (a.legs[0]?.departAt ?? '9999').localeCompare(b.legs[0]?.departAt ?? '9999'))
}

// ---------- moduli -> colonne ----------

export interface StayInput {
  name: string
  city: string
  checkIn: string
  checkOut: string
  checkInInfo: string
  checkOutInfo: string
  address: string
  mapsUrl: string
  totalCost: number | null
  currency: string
  breakfast: boolean
  dinner: boolean
  kitchen: boolean
  booked: boolean
  paid: boolean
  notes: string
}

const orNull = (s: string) => s.trim() || null

export function stayColumns(i: StayInput) {
  return {
    name: i.name.trim(),
    city: orNull(i.city),
    check_in: i.checkIn,
    check_out: i.checkOut,
    check_in_info: orNull(i.checkInInfo),
    check_out_info: orNull(i.checkOutInfo),
    address: orNull(i.address),
    maps_url: orNull(i.mapsUrl),
    total_cost: i.totalCost,
    currency: i.currency.trim().toUpperCase() || 'EUR',
    breakfast: i.breakfast,
    dinner: i.dinner,
    kitchen: i.kitchen,
    booked: i.booked,
    paid: i.paid,
    notes: orNull(i.notes),
  }
}

export interface TransportInput {
  from: string
  to: string
  mode: TransportMode
  departDate: string
  departTime: string
  arriveDate: string
  arriveTime: string
  fromPos: { lat: number; lng: number } | null // posizione sulla mappa (facoltativa)
  toPos: { lat: number; lng: number } | null
  cost: number | null
  currency: string
  scope: Scope
  bought: boolean
  refCode: string
  notes: string
}

/** Colonne di un trasporto. Gli orari sono locali nel fuso del viaggio; il giorno si ricava dalla data di partenza. */
export function transportColumns(i: TransportInput, timeZone: string, days: Pick<Day, 'id' | 'date'>[]) {
  const depart = isCompleteZoned(i.departDate, i.departTime) ? zonedToInstant(i.departDate, i.departTime, timeZone) : null
  const arrive = isCompleteZoned(i.arriveDate, i.arriveTime) ? zonedToInstant(i.arriveDate, i.arriveTime, timeZone) : null
  const day = i.departDate ? days.find((d) => d.date === i.departDate) : undefined
  return {
    from_label: i.from.trim(),
    to_label: i.to.trim(),
    mode: i.mode,
    depart_at: depart,
    arrive_at: arrive,
    // senza l'ora la data si conserva da sola
    depart_date: depart || !i.departDate ? null : i.departDate,
    // l'arrivo nello stesso giorno della partenza è il caso normale (e il modulo lo propone da solo): non serve salvarlo
    arrive_date: arrive || !i.arriveDate || i.arriveDate === i.departDate ? null : i.arriveDate,
    day_id: day?.id ?? null,
    from_lat: i.fromPos?.lat ?? null,
    from_lng: i.fromPos?.lng ?? null,
    to_lat: i.toPos?.lat ?? null,
    to_lng: i.toPos?.lng ?? null,
    cost: i.cost,
    currency: i.currency.trim().toUpperCase() || 'EUR',
    scope: i.scope,
    bought: i.bought,
    ref_code: orNull(i.refCode),
    notes: orNull(i.notes),
  }
}

/** Valori iniziali del modulo trasporto, dall'istante salvato (nel fuso del viaggio). */
export function transportToForm(t: Transport, timeZone: string, days: Pick<Day, 'id' | 'date'>[] = []) {
  const { depart, arrive } = transportWhen(t, timeZone, days)
  return { departDate: depart?.date ?? '', departTime: depart?.time ?? '', arriveDate: arrive?.date ?? '', arriveTime: arrive?.time ?? '' }
}

/** Data (e ora, se c'è) di un istante o di una data sola, nel fuso del viaggio. `time` è '' quando l'ora non è stata scritta. */
export interface When {
  date: string
  time: string
}

/**
 * Quando parte e quando arriva un trasporto. Con l'ora vale l'istante; senza, la data salvata a parte
 * (per la partenza, nei trasporti più vecchi, anche il giorno a cui sono legati).
 */
export function transportWhen(
  t: Pick<Transport, 'departAt' | 'arriveAt' | 'departDate' | 'arriveDate' | 'dayId'>,
  timeZone: string,
  days: Pick<Day, 'id' | 'date'>[] = [],
): { depart: When | null; arrive: When | null } {
  const depart: When | null = t.departAt
    ? instantToZoned(t.departAt, timeZone)
    : (t.departDate ?? days.find((d) => d.id === t.dayId)?.date)
      ? { date: (t.departDate ?? days.find((d) => d.id === t.dayId)?.date) as string, time: '' }
      : null
  const arrive: When | null = t.arriveAt ? instantToZoned(t.arriveAt, timeZone) : t.arriveDate ? { date: t.arriveDate, time: '' } : null
  return { depart, arrive }
}

/** «gio 26 nov» oppure «gio 26 nov · 09:00» se l'ora c'è. */
export function formatWhen(w: When, timeZone: string, separator = ' · '): string {
  const day = formatDateInZone(zonedToInstant(w.date, '12:00', timeZone), timeZone)
  return w.time ? `${day}${separator}${w.time}` : day
}

/** Dal più recente al meno recente (chiave testuale confrontata al contrario); chi non ha la chiave in fondo. */
export function newestFirst<T>(list: T[], key: (item: T) => string): T[] {
  return list
    .map((item) => ({ item, k: key(item) }))
    .sort((a, b) => (a.k && b.k ? b.k.localeCompare(a.k) : a.k ? -1 : b.k ? 1 : 0))
    .map(({ item }) => item)
}

/** Chiave per ordinare per data e ora (la data sola vale mezzanotte). Vuota se il trasporto non ha date. */
export function whenKey(w: When | null): string {
  return w ? `${w.date}T${w.time || '00:00'}` : ''
}

export interface LegInput {
  flightNumber: string
  from: string
  to: string
  departDate: string
  departTime: string // ora locale dell'aeroporto di partenza
  arriveDate: string
  arriveTime: string // ora locale dell'aeroporto di arrivo
  fromTz: string
  toTz: string
  cabin: string
  seats: string
  notes: string
}

export interface FlightInput {
  title: string
  airline: string
  bookingRef: string
  cost: number | null
  currency: string
  scope: Scope
  paid: boolean
  notes: string
  legs: LegInput[]
}

export function flightColumns(i: FlightInput) {
  return {
    title: i.title.trim(),
    airline: orNull(i.airline),
    booking_ref: orNull(i.bookingRef),
    cost: i.cost,
    currency: i.currency.trim().toUpperCase() || 'EUR',
    scope: i.scope,
    paid: i.paid,
    notes: orNull(i.notes),
  }
}

/** Tratte ordinate per partenza, con `seq` progressivo e orari convertiti in istanti. */
export function legColumns(legs: LegInput[]) {
  const rows = legs.map((l) => ({
    flight_number: orNull(l.flightNumber),
    from_airport: l.from.trim().toUpperCase(),
    to_airport: l.to.trim().toUpperCase(),
    depart_at: zonedToInstant(l.departDate, l.departTime, l.fromTz.trim()),
    arrive_at: zonedToInstant(l.arriveDate, l.arriveTime, l.toTz.trim()),
    from_tz: l.fromTz.trim(),
    to_tz: l.toTz.trim(),
    cabin: orNull(l.cabin),
    seats: orNull(l.seats),
    notes: orNull(l.notes),
  }))
  rows.sort((a, b) => a.depart_at.localeCompare(b.depart_at))
  return rows.map((r, idx) => ({ ...r, seq: idx + 1 }))
}

/** Tratta salvata -> valori del modulo (orari nel fuso di ciascun aeroporto). */
export function legToForm(l: FlightLeg): LegInput {
  const dep = instantToZoned(l.departAt, l.fromTz)
  const arr = instantToZoned(l.arriveAt, l.toTz)
  return {
    flightNumber: l.flightNumber ?? '',
    from: l.from,
    to: l.to,
    departDate: dep.date,
    departTime: dep.time,
    arriveDate: arr.date,
    arriveTime: arr.time,
    fromTz: l.fromTz,
    toTz: l.toTz,
    cabin: l.cabin ?? '',
    seats: l.seats ?? '',
    notes: l.notes ?? '',
  }
}
