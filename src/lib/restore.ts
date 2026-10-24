import type {
  Booking,
  BookingType,
  BudgetItem,
  ChecklistItem,
  ChecklistKind,
  Day,
  DayItem,
  Expense,
  Flight,
  FlightLeg,
  ItemKind,
  Place,
  PlaceStatus,
  Scope,
  Stay,
  ThemeName,
  Transport,
  TransportMode,
  Traveler,
  Trip,
} from '../types'
import { EXPORT_FORMAT, EXPORT_VERSION } from './exportData'
import { countryByCode } from './countries'
import { MAX_DURATION_MIN } from './duration'
import { cleanRates } from './money'
import { DEFAULT_CENTER } from './tripForm'
import { enumerateDates } from './tripDays'

// Ripristino da un file esportato dall'app. Due passaggi, entrambi funzioni pure:
//   1. `parseExport` legge il file, controlla ogni campo e scarta (con un avviso) ciò che il
//      database rifiuterebbe: un file modificato a mano non deve poter rompere il ripristino.
//   2. `buildSteps` trasforma un viaggio in righe da inserire, con id nuovi e riferimenti ricollegati.
// Il ripristino crea sempre un viaggio NUOVO: i dati esistenti non vengono toccati.

export interface RestorableTrip {
  trip: Trip
  /** Cose del file scartate o corrette: da mostrare prima di ripristinare. */
  warnings: string[]
}

export type ParseOutcome =
  | { ok: true; trips: RestorableTrip[]; skipped: { title: string; reason: string }[] }
  | { ok: false; error: string }

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const list = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : [])

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const optStr = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
/** Minuti interi da 1 a 24 ore; altro = nessuna durata. */
const minutes = (v: unknown): number | undefined => {
  const n = num(v)
  return n !== undefined && Number.isInteger(n) && n >= 1 && n <= MAX_DURATION_MIN ? n : undefined
}
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback)
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)

const ymd = (v: unknown): string | undefined => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined
  const d = new Date(`${v}T00:00:00Z`)
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? undefined : v
}
const hhmm = (v: unknown): string | undefined => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : undefined)
const instant = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined
  const t = Date.parse(v)
  return Number.isNaN(t) ? undefined : new Date(t).toISOString()
}
const currency = (v: unknown, fallback: string): string => (typeof v === 'string' && /^[A-Za-z]{3}$/.test(v.trim()) ? v.trim().toUpperCase() : fallback)
const money = (v: unknown): number | undefined => {
  const n = num(v)
  return n === undefined || Math.abs(n) >= 1e10 ? undefined : Math.round(n * 100) / 100
}
const validZone = (v: unknown): v is string => {
  if (typeof v !== 'string' || !v) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: v })
    return true
  } catch {
    return false
  }
}
const coords = (lat: unknown, lng: unknown): { lat: number; lng: number } | null => {
  const a = num(lat)
  const b = num(lng)
  return a !== undefined && b !== undefined && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? { lat: a, lng: b } : null
}

const STATUS = ['idea', 'planned', 'done', 'skipped'] as const satisfies readonly PlaceStatus[]
const KINDS = ['visit', 'meal', 'transport', 'free', 'note', 'flight'] as const satisfies readonly ItemKind[]
const MODES = ['train', 'metro', 'bus', 'taxi', 'walk', 'car', 'plane', 'ferry', 'other'] as const satisfies readonly TransportMode[]
/** Costo di una prenotazione dal file: solo se c'è un importo; i pagatori sono quelli che esistono ancora. */
function bookingCost(b: Obj, travelerIds: Set<string>, baseCurrency: string): Pick<Booking, 'cost' | 'currency' | 'scope' | 'payerIds'> {
  const cost = money(b.cost)
  if (cost === undefined) return {}
  return {
    cost,
    currency: currency(b.currency, baseCurrency),
    scope: oneOf(b.scope, SCOPES, 'per_person'),
    payerIds: Array.isArray(b.payerIds) ? Array.from(new Set(b.payerIds.filter((id): id is string => typeof id === 'string' && travelerIds.has(id)))) : [],
  }
}

const SCOPES = ['per_person', 'total'] as const satisfies readonly Scope[]
const CHECK_KINDS = ['todo', 'packing', 'docs'] as const satisfies readonly ChecklistKind[]
const BOOKING_TYPES = ['flight', 'hotel', 'train', 'ticket', 'insurance', 'esim', 'other'] as const satisfies readonly BookingType[]
const THEMES = ['default', 'japan', 'iceland'] as const satisfies readonly ThemeName[]

const MAX_ROWS = 5000
const MAX_DAYS = 400

/** Pulisce un viaggio letto dal file. Restituisce il messaggio d'errore se non è recuperabile. */
function cleanTrip(raw: Obj, warnings: string[]): Trip | string {
  const title = optStr(raw.title)
  if (!title) return 'manca il titolo'
  const startDate = ymd(raw.startDate)
  const endDate = ymd(raw.endDate)
  if (!startDate || !endDate) return 'le date di inizio e fine non sono valide'
  if (endDate < startDate) return 'la data di fine è prima di quella di inizio'
  if (enumerateDates(startDate, endDate, MAX_DAYS).length === 0) return `il viaggio supera i ${MAX_DAYS} giorni`

  let seq = 0
  const used = new Set<string>()
  const idOf = (v: unknown): string => {
    const id = typeof v === 'string' && v && !used.has(v) ? v : `auto-${++seq}`
    used.add(id)
    return id
  }
  const skip = (what: string, n: number) => {
    if (n > 0) warnings.push(`Scartati perché incompleti o non validi (${what}): ${n}`)
  }

  let timezone = str(raw.timezone, 'UTC')
  if (!validZone(timezone)) {
    warnings.push(`Fuso orario «${timezone}» non valido: usato UTC`)
    timezone = 'UTC'
  }
  const baseCurrency = currency(raw.baseCurrency, 'EUR')
  const localRaw = raw.localCurrency
  const localCurrency = typeof localRaw === 'string' && /^[A-Za-z]{3}$/.test(localRaw.trim()) ? localRaw.trim().toUpperCase() : undefined
  const center = coords(isObj(raw.center) ? raw.center.lat : undefined, isObj(raw.center) ? raw.center.lng : undefined) ?? DEFAULT_CENTER
  const fx = num(raw.fxRate)
  const limit = num(raw.budgetLimit)
  const origin = typeof raw.originCountry === 'string' ? countryByCode(raw.originCountry) : undefined

  // viaggiatori
  const travelers: Traveler[] = list(raw.travelers)
    .filter((t) => optStr(t.name))
    .slice(0, 50)
    .map((t, i) => ({ id: idOf(t.id), name: str(t.name).trim(), color: /^#[0-9a-fA-F]{6}$/.test(str(t.color)) ? str(t.color) : '#c8402f', position: num(t.position) ?? (i + 1) * 1000 }))
  const travelerIds = new Set(travelers.map((t) => t.id))

  // categorie e luoghi
  const seenLabels = new Set<string>()
  const categories = list(raw.categories)
    .filter((c) => optStr(c.label))
    .filter((c) => {
      const key = str(c.label).trim().toLowerCase()
      if (seenLabels.has(key)) return false
      seenLabels.add(key)
      return true
    })
    .slice(0, MAX_ROWS)
    .map((c) => ({ id: idOf(c.id), label: str(c.label).trim(), color: optStr(c.color) }))
  // categorie di spesa: quelle del file (nomi unici); le spese e le voci che ne citano una assente la ricreano all'import
  const seenExpenseLabels = new Set<string>()
  const expenseCategories = list(raw.expenseCategories)
    .filter((c) => optStr(c.label))
    .filter((c) => {
      const key = str(c.label).trim().toLowerCase()
      if (seenExpenseLabels.has(key)) return false
      seenExpenseLabels.add(key)
      return true
    })
    .slice(0, MAX_ROWS)
    .map((c) => ({ id: idOf(c.id), label: str(c.label).trim(), color: optStr(c.color) }))
  const rawPlaces = list(raw.places).slice(0, MAX_ROWS)
  const places: Place[] = rawPlaces
    .filter((p) => optStr(p.name))
    .map((p) => {
      const pos = coords(p.lat, p.lng)
      const est = money(p.estCost)
      return {
        id: idOf(p.id),
        name: str(p.name).trim(),
        nameLocal: optStr(p.nameLocal),
        city: str(p.city),
        category: str(p.category).trim(),
        categoryId: optStr(p.categoryId),
        status: oneOf(p.status, STATUS, 'idea'),
        note: optStr(p.note),
        address: optStr(p.address),
        mapsUrl: optStr(p.mapsUrl),
        openingHours: optStr(p.openingHours),
        estCost: est,
        currency: est === undefined ? undefined : currency(p.currency, localCurrency ?? baseCurrency),
        visitMinutes: minutes(p.visitMinutes),
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
      }
    })
  skip('luoghi', rawPlaces.length - places.length)
  const placeIds = new Set(places.map((p) => p.id))

  // giorni e tappe
  const seenDates = new Set<string>()
  let orphanItems = 0
  let badItems = 0
  const days: Day[] = []
  for (const d of list(raw.days).slice(0, MAX_DAYS)) {
    const date = ymd(d.date)
    if (!date || seenDates.has(date)) continue
    seenDates.add(date)
    const rawItems = list(d.items).slice(0, MAX_ROWS)
    const items: DayItem[] = rawItems
      .filter((it) => optStr(it.title))
      .map((it, i) => {
        const placeId = optStr(it.placeId)
        if (placeId && !placeIds.has(placeId)) orphanItems++
        return {
          id: idOf(it.id),
          time: hhmm(it.time),
          endTime: hhmm(it.endTime),
          title: str(it.title).trim(),
          kind: oneOf(it.kind, KINDS, 'visit'),
          placeId: placeId && placeIds.has(placeId) ? placeId : undefined,
          note: optStr(it.note),
          durationMinutes: minutes(it.durationMinutes),
          done: bool(it.done),
          position: num(it.position) ?? (i + 1) * 1000,
        }
      })
    badItems += rawItems.length - items.length
    days.push({ id: idOf(d.id), date, city: str(d.city), title: optStr(d.title), notes: optStr(d.notes), items })
  }
  // un giorno per ogni data del viaggio, come si aspetta l'app
  for (const date of enumerateDates(startDate, endDate, MAX_DAYS)) {
    if (!seenDates.has(date)) days.push({ id: idOf(undefined), date, city: '', items: [] })
  }
  days.sort((a, b) => a.date.localeCompare(b.date))
  skip('tappe', badItems)
  if (orphanItems > 0) warnings.push(`${orphanItems} tappe collegate a luoghi che non esistono più nel file: restano senza luogo`)
  const dayIds = new Set(days.map((d) => d.id))

  // alloggi
  const rawStays = list(raw.stays).slice(0, MAX_ROWS)
  const stays: Stay[] = rawStays
    .map((s) => ({ s, checkIn: ymd(s.checkIn), checkOut: ymd(s.checkOut) }))
    .filter(({ s, checkIn, checkOut }) => optStr(s.name) && checkIn && checkOut && checkOut >= checkIn)
    .map(({ s, checkIn, checkOut }) => ({
      id: idOf(s.id),
      name: str(s.name).trim(),
      city: str(s.city),
      checkIn: checkIn as string,
      checkOut: checkOut as string,
      checkInInfo: optStr(s.checkInInfo),
      checkOutInfo: optStr(s.checkOutInfo),
      address: optStr(s.address),
      mapsUrl: optStr(s.mapsUrl),
      totalCost: money(s.totalCost),
      currency: currency(s.currency, baseCurrency),
      breakfast: bool(s.breakfast),
      dinner: bool(s.dinner),
      kitchen: bool(s.kitchen),
      booked: bool(s.booked),
      paid: bool(s.paid),
      notes: optStr(s.notes),
    }))
  skip('alloggi', rawStays.length - stays.length)

  // trasporti
  const rawTransports = list(raw.transports).slice(0, MAX_ROWS)
  const transports: Transport[] = rawTransports
    .filter((t) => optStr(t.from) && optStr(t.to))
    .map((t) => {
      const from = coords(t.fromLat, t.fromLng)
      const to = coords(t.toLat, t.toLng)
      const dayId = optStr(t.dayId)
      return {
        id: idOf(t.id),
        from: str(t.from).trim(),
        to: str(t.to).trim(),
        mode: oneOf(t.mode, MODES, 'other'),
        departAt: instant(t.departAt),
        arriveAt: instant(t.arriveAt),
        departDate: t.departAt ? undefined : ymd(t.departDate),
        arriveDate: t.arriveAt ? undefined : ymd(t.arriveDate),
        dayId: dayId && dayIds.has(dayId) ? dayId : undefined,
        fromLat: from?.lat,
        fromLng: from?.lng,
        toLat: to?.lat,
        toLng: to?.lng,
        cost: money(t.cost),
        currency: currency(t.currency, baseCurrency),
        scope: oneOf(t.scope, SCOPES, 'per_person'),
        bought: bool(t.bought),
        refCode: optStr(t.refCode),
        notes: optStr(t.notes),
      }
    })
  skip('trasporti', rawTransports.length - transports.length)

  // voli
  let badLegs = 0
  const rawFlights = list(raw.flights).slice(0, MAX_ROWS)
  const flights: Flight[] = rawFlights
    .filter((f) => optStr(f.title))
    .map((f) => {
      const rawLegs = list(f.legs).slice(0, 50)
      const legs: FlightLeg[] = rawLegs
        .map((l) => ({ l, depart: instant(l.departAt), arrive: instant(l.arriveAt) }))
        .filter(
          ({ l, depart, arrive }) =>
            depart && arrive && arrive > depart && /^[A-Za-z]{3}$/.test(str(l.from)) && /^[A-Za-z]{3}$/.test(str(l.to)) && validZone(l.fromTz) && validZone(l.toTz),
        )
        .sort((a, b) => (num(a.l.seq) ?? 0) - (num(b.l.seq) ?? 0))
        .map(({ l, depart, arrive }, i) => ({
          id: idOf(l.id),
          seq: i + 1,
          flightNumber: optStr(l.flightNumber),
          from: str(l.from).toUpperCase(),
          to: str(l.to).toUpperCase(),
          departAt: depart as string,
          arriveAt: arrive as string,
          fromTz: str(l.fromTz),
          toTz: str(l.toTz),
          cabin: optStr(l.cabin),
          seats: optStr(l.seats),
          notes: optStr(l.notes),
        }))
      badLegs += rawLegs.length - legs.length
      return {
        id: idOf(f.id),
        title: str(f.title).trim(),
        airline: optStr(f.airline),
        bookingRef: optStr(f.bookingRef),
        cost: money(f.cost),
        currency: currency(f.currency, baseCurrency),
        scope: oneOf(f.scope, SCOPES, 'per_person'),
        paid: bool(f.paid),
        notes: optStr(f.notes),
        legs,
      }
    })
  skip('voli', rawFlights.length - flights.length)
  skip('tratte di volo', badLegs)

  // budget
  const rawBudget = list(raw.budget).slice(0, MAX_ROWS)
  const budget: BudgetItem[] = rawBudget
    .filter((b) => optStr(b.label))
    .map((b) => {
      const seen = new Set<string>()
      const shares = list(b.shares)
        .filter((s) => typeof s.travelerId === 'string' && travelerIds.has(s.travelerId) && !seen.has(s.travelerId as string) && seen.add(s.travelerId as string))
        .map((s) => ({ id: idOf(s.id), travelerId: s.travelerId as string, paid: bool(s.paid) }))
      return {
        id: idOf(b.id),
        label: str(b.label).trim(),
        category: optStr(b.category),
        categoryId: optStr(b.categoryId),
        amount: money(b.amount) ?? 0,
        currency: currency(b.currency, baseCurrency),
        scope: oneOf(b.scope, SCOPES, 'per_person'),
        dueDate: ymd(b.dueDate),
        notes: optStr(b.notes),
        shares,
      }
    })
  skip('voci di budget', rawBudget.length - budget.length)

  // spese
  const rawExpenses = list(raw.expenses).slice(0, MAX_ROWS)
  const expenses: Expense[] = rawExpenses
    .map((e) => ({ e, amount: money(e.amount), spentAt: instant(e.spentAt) }))
    .filter(({ e, amount, spentAt }) => optStr(e.label) && amount !== undefined && spentAt)
    .map(({ e, amount, spentAt }) => {
      const seen = new Set<string>()
      const shares = list(e.shares)
        .filter((s) => typeof s.travelerId === 'string' && travelerIds.has(s.travelerId) && !seen.has(s.travelerId as string) && seen.add(s.travelerId as string))
        .map((s) => ({ travelerId: s.travelerId as string, weight: (num(s.weight) ?? 1) > 0 && (num(s.weight) ?? 1) < 100000 ? (num(s.weight) ?? 1) : 1 }))
      const fxRate = num(e.fxRate)
      const paidBy = optStr(e.paidBy)
      const dayId = optStr(e.dayId)
      return {
        id: idOf(e.id),
        label: str(e.label).trim(),
        category: optStr(e.category),
        categoryId: optStr(e.categoryId),
        amount: amount as number,
        currency: currency(e.currency, baseCurrency),
        fxRate: fxRate !== undefined && fxRate > 0 && fxRate < 1e7 ? fxRate : undefined,
        paidBy: paidBy && travelerIds.has(paidBy) ? paidBy : undefined,
        spentAt: spentAt as string,
        dayId: dayId && dayIds.has(dayId) ? dayId : undefined,
        notes: optStr(e.notes),
        shares,
      }
    })
  skip('spese', rawExpenses.length - expenses.length)

  // checklist
  const rawChecklist = list(raw.checklist).slice(0, MAX_ROWS)
  const checklist: ChecklistItem[] = rawChecklist
    .filter((c) => optStr(c.text))
    .map((c, i) => {
      const who = optStr(c.travelerId)
      return {
        id: idOf(c.id),
        kind: oneOf(c.kind, CHECK_KINDS, 'todo'),
        text: str(c.text).trim(),
        done: bool(c.done),
        travelerId: who && travelerIds.has(who) ? who : undefined,
        dueDate: ymd(c.dueDate),
        ...(() => {
          const q = num(c.quantity)
          const quantity = q !== undefined && q >= 2 ? Math.min(Math.floor(q), 999) : undefined
          // i pezzi già a posto: solo parziali (da 1 a quantità-1) e solo se la voce non è già fatta
          const d = num(c.quantityDone)
          const partial = quantity && !bool(c.done) && d !== undefined && d >= 1 ? Math.min(Math.floor(d), quantity - 1) : undefined
          return { quantity, quantityDone: partial }
        })(),
        position: num(c.position) ?? (i + 1) * 1000,
      }
    })
  skip('voci della checklist', rawChecklist.length - checklist.length)

  // prenotazioni: gli allegati PDF non fanno parte del file
  let files = 0
  const rawBookings = list(raw.bookings).slice(0, MAX_ROWS)
  const bookings: Booking[] = rawBookings
    .filter((b) => optStr(b.title))
    .map((b) => {
      if (optStr(b.filePath)) files++
      return {
        id: idOf(b.id),
        type: oneOf(b.type, BOOKING_TYPES, 'other'),
        title: str(b.title).trim(),
        code: optStr(b.code),
        url: optStr(b.url),
        validFrom: instant(b.validFrom),
        validTo: instant(b.validTo),
        keepOffline: false,
        notes: optStr(b.notes),
        ...bookingCost(b, travelerIds, baseCurrency),
      }
    })
  skip('prenotazioni', rawBookings.length - bookings.length)
  if (files > 0) warnings.push(`${files} ${files === 1 ? 'allegato PDF non è incluso' : 'allegati PDF non sono inclusi'} nel file: vanno caricati di nuovo`)

  return {
    id: idOf(raw.id),
    title,
    destination: str(raw.destination),
    startDate,
    endDate,
    timezone,
    theme: oneOf(raw.theme, THEMES, 'default'),
    baseCurrency,
    localCurrency,
    center,
    travelers,
    days,
    places,
    categories,
    expenseCategories,
    stays,
    transports,
    flights,
    budget,
    expenses,
    checklist,
    bookings,
    fxRate: fx !== undefined && fx > 0 && fx < 1e7 ? fx : undefined,
    fxRates: Object.keys(cleanRates(raw.fxRates)).length > 0 ? cleanRates(raw.fxRates) : undefined,
    budgetLimit: limit !== undefined && limit > 0 && limit < 1e11 ? limit : undefined,
    originCountry: origin?.code,
    originTimezone: origin && typeof raw.originTimezone === 'string' && validZone(raw.originTimezone) ? raw.originTimezone : undefined,
  }
}

/** Legge e controlla il contenuto di un file di esportazione. */
export function parseExport(text: string): ParseOutcome {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Il file non è un JSON valido.' }
  }
  if (!isObj(data) || data.format !== EXPORT_FORMAT) {
    return { ok: false, error: 'Questo non è un file esportato da Faraway.' }
  }
  if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) {
    return { ok: false, error: "Il file è stato creato da una versione più recente dell'app: aggiorna l'app e riprova." }
  }
  const rawTrips = list(data.trips)
  if (rawTrips.length === 0) return { ok: false, error: 'Il file non contiene viaggi.' }

  const trips: RestorableTrip[] = []
  const skipped: { title: string; reason: string }[] = []
  for (const raw of rawTrips) {
    const warnings: string[] = []
    const trip = cleanTrip(raw, warnings)
    if (typeof trip === 'string') skipped.push({ title: optStr(raw.title) ?? 'Senza titolo', reason: trip })
    else trips.push({ trip, warnings })
  }
  if (trips.length === 0) return { ok: false, error: `Nessun viaggio ripristinabile: ${skipped[0]?.reason ?? 'dati non validi'}.` }
  return { ok: true, trips, skipped }
}

/** Quanti elementi ha un viaggio, per l'anteprima prima di ripristinare. */
export function summarizeTrip(trip: Trip) {
  return {
    days: trip.days.length,
    items: trip.days.reduce((n, d) => n + d.items.length, 0),
    places: trip.places.length,
    stays: trip.stays.length,
    transports: trip.transports.length,
    flights: trip.flights.length,
    budget: trip.budget.length,
    expenses: trip.expenses.length,
    checklist: trip.checklist.length,
    bookings: trip.bookings.length,
  }
}

// ---------- righe da inserire ----------

export interface RestoreStep {
  table: string
  rows: Record<string, unknown>[]
}

export function tripRow(trip: Trip, title: string) {
  return {
    title: title.trim() || trip.title,
    destination: trip.destination.trim() || null,
    start_date: trip.startDate,
    end_date: trip.endDate,
    timezone: trip.timezone,
    theme: trip.theme,
    base_currency: trip.baseCurrency,
    local_currency: trip.localCurrency ?? null,
    center_lat: trip.center.lat,
    center_lng: trip.center.lng,
    fx_rate: trip.fxRate ?? null,
    // solo se ci sono: senza la migrazione 0012 la colonna non esiste e l'inserimento fallirebbe
    ...(trip.fxRates && Object.keys(trip.fxRates).length > 0 ? { fx_rates: trip.fxRates } : {}),
    // idem per la migrazione 0013
    ...(trip.budgetLimit ? { budget_limit: trip.budgetLimit } : {}),
    // idem per la migrazione 0014
    ...(trip.originCountry ? { origin_country: trip.originCountry, origin_timezone: trip.originTimezone ?? null } : {}),
  }
}

const nul = <T>(v: T | undefined): T | null => (v === undefined ? null : v)

/**
 * Righe di tutte le tabelle, nell'ordine in cui vanno inserite (prima ciò da cui dipendono le altre).
 * Ogni elemento riceve un id nuovo e i riferimenti (giorno, luogo, viaggiatore…) vengono ricollegati.
 */
export function buildSteps(trip: Trip, tripId: string, newId: () => string): RestoreStep[] {
  const map = new Map<string, string>() // id nel file → id nuovo
  const fresh = (old: string) => {
    const id = newId()
    map.set(old, id)
    return id
  }
  const to = (old: string | undefined) => (old ? (map.get(old) ?? null) : null)

  const travelers = trip.travelers.map((t, i) => ({ id: fresh(t.id), trip_id: tripId, name: t.name, color: t.color, position: t.position ?? (i + 1) * 1000 }))

  // categorie: quelle del file più eventuali etichette usate solo dai luoghi
  const catIdByLabel = new Map<string, string>()
  const categories: Record<string, unknown>[] = []
  const addCategory = (label: string, color: string | null, oldId?: string) => {
    const key = label.trim().toLowerCase()
    if (!key || catIdByLabel.has(key)) return
    const id = oldId ? fresh(oldId) : newId()
    catIdByLabel.set(key, id)
    categories.push({ id, trip_id: tripId, label: label.trim(), color, position: (categories.length + 1) * 1000 })
  }
  for (const c of trip.categories) addCategory(c.label, c.color ?? null, c.id)
  for (const p of trip.places) addCategory(p.category, null)

  // categorie di spesa: quelle del file più i nomi citati solo da spese e voci di budget
  const expCatIdByLabel = new Map<string, string>()
  const expenseCategories: Record<string, unknown>[] = []
  const addExpenseCategory = (label: string | undefined, color: string | null, oldId?: string) => {
    const key = (label ?? '').trim().toLowerCase()
    if (!key || expCatIdByLabel.has(key)) return
    const id = oldId ? fresh(oldId) : newId()
    expCatIdByLabel.set(key, id)
    expenseCategories.push({ id, trip_id: tripId, label: (label as string).trim(), color, position: (expenseCategories.length + 1) * 1000 })
  }
  for (const c of trip.expenseCategories) addExpenseCategory(c.label, c.color ?? null, c.id)
  for (const b of trip.budget) addExpenseCategory(b.category, null)
  for (const e of trip.expenses) addExpenseCategory(e.category, null)
  // la colonna category_id si scrive solo se serve (il file può arrivare da un database senza la migrazione 0008)
  const expCat = (label: string | undefined) => (expenseCategories.length > 0 ? { category_id: expCatIdByLabel.get((label ?? '').trim().toLowerCase()) ?? null } : {})

  const days = trip.days.map((d) => ({ id: fresh(d.id), trip_id: tripId, date: d.date, city: d.city || null, title: nul(d.title), notes: nul(d.notes) }))

  const places = trip.places.map((p) => ({
    id: fresh(p.id),
    trip_id: tripId,
    category_id: catIdByLabel.get(p.category.trim().toLowerCase()) ?? null,
    name: p.name,
    name_local: nul(p.nameLocal),
    city: p.city || null,
    address: nul(p.address),
    lat: p.lat,
    lng: p.lng,
    maps_url: nul(p.mapsUrl),
    opening_hours: nul(p.openingHours),
    est_cost: nul(p.estCost),
    currency: nul(p.currency),
    status: p.status,
    notes: nul(p.note),
    // le colonne della migrazione 0015 solo se servono: senza la migrazione non esistono
    ...(p.visitMinutes !== undefined ? { visit_minutes: p.visitMinutes } : {}),
  }))

  const items = trip.days.flatMap((d) =>
    d.items.map((it) => ({
      id: newId(),
      trip_id: tripId,
      day_id: to(d.id),
      place_id: to(it.placeId),
      kind: it.kind,
      title: it.title,
      start_time: nul(it.time),
      end_time: nul(it.endTime),
      notes: nul(it.note),
      done: it.done ?? false,
      position: it.position ?? 1000,
      ...(it.durationMinutes !== undefined ? { duration_minutes: it.durationMinutes } : {}),
    })),
  )

  const stays = trip.stays.map((s) => ({
    id: newId(),
    trip_id: tripId,
    city: s.city || null,
    name: s.name,
    check_in: s.checkIn,
    check_out: s.checkOut,
    check_in_info: nul(s.checkInInfo),
    check_out_info: nul(s.checkOutInfo),
    address: nul(s.address),
    maps_url: nul(s.mapsUrl),
    total_cost: nul(s.totalCost),
    currency: s.currency,
    breakfast: s.breakfast,
    dinner: s.dinner,
    kitchen: s.kitchen,
    booked: s.booked,
    paid: s.paid,
    notes: nul(s.notes),
  }))

  const transports = trip.transports.map((t) => ({
    id: newId(),
    trip_id: tripId,
    day_id: to(t.dayId),
    from_label: t.from,
    to_label: t.to,
    mode: t.mode,
    depart_at: nul(t.departAt),
    arrive_at: nul(t.arriveAt),
    // le date senza ora esistono solo dopo la migrazione 0009: si scrivono solo se ci sono
    ...(t.departDate ? { depart_date: t.departDate } : {}),
    ...(t.arriveDate ? { arrive_date: t.arriveDate } : {}),
    from_lat: nul(t.fromLat),
    from_lng: nul(t.fromLng),
    to_lat: nul(t.toLat),
    to_lng: nul(t.toLng),
    cost: nul(t.cost),
    currency: t.currency,
    scope: t.scope,
    bought: t.bought,
    ref_code: nul(t.refCode),
    notes: nul(t.notes),
  }))

  const flights = trip.flights.map((f) => ({
    id: fresh(f.id),
    trip_id: tripId,
    title: f.title,
    airline: nul(f.airline),
    booking_ref: nul(f.bookingRef),
    cost: nul(f.cost),
    currency: f.currency,
    scope: f.scope,
    paid: f.paid,
    notes: nul(f.notes),
  }))
  const legs = trip.flights.flatMap((f) =>
    f.legs.map((l) => ({
      id: newId(),
      trip_id: tripId,
      flight_id: to(f.id),
      seq: l.seq,
      flight_number: nul(l.flightNumber),
      from_airport: l.from,
      to_airport: l.to,
      depart_at: l.departAt,
      arrive_at: l.arriveAt,
      from_tz: l.fromTz,
      to_tz: l.toTz,
      cabin: nul(l.cabin),
      seats: nul(l.seats),
      notes: nul(l.notes),
    })),
  )

  const budgetItems = trip.budget.map((b) => ({
    id: fresh(b.id),
    trip_id: tripId,
    label: b.label,
    ...expCat(b.category),
    amount: b.amount,
    currency: b.currency,
    scope: b.scope,
    due_date: nul(b.dueDate),
    notes: nul(b.notes),
  }))
  const budgetShares = trip.budget.flatMap((b) =>
    b.shares.map((s) => ({
      id: newId(),
      trip_id: tripId,
      budget_item_id: to(b.id),
      traveler_id: to(s.travelerId),
      paid: s.paid,
      paid_at: s.paid ? new Date().toISOString() : null,
    })),
  )

  const expenses = trip.expenses.map((e) => ({
    id: fresh(e.id),
    trip_id: tripId,
    day_id: to(e.dayId),
    label: e.label,
    ...expCat(e.category),
    amount: e.amount,
    currency: e.currency,
    fx_rate: nul(e.fxRate),
    paid_by: to(e.paidBy),
    spent_at: e.spentAt,
    notes: nul(e.notes),
  }))
  const expenseShares = trip.expenses.flatMap((e) =>
    e.shares.map((s) => ({ id: newId(), trip_id: tripId, expense_id: to(e.id), traveler_id: to(s.travelerId), weight: s.weight })),
  )

  // la colonna quantity si scrive solo se serve (il file può arrivare da un database senza la colonna)
  const anyQuantity = trip.checklist.some((c) => (c.quantity ?? 1) > 1)
  const anyPartial = trip.checklist.some((c) => (c.quantityDone ?? 0) > 0)
  const checklist = trip.checklist.map((c) => ({
    id: newId(),
    trip_id: tripId,
    traveler_id: to(c.travelerId),
    kind: c.kind,
    text: c.text,
    done: c.done,
    due_date: nul(c.dueDate),
    ...(anyQuantity ? { quantity: c.quantity && c.quantity > 1 ? c.quantity : null } : {}),
    ...(anyPartial ? { quantity_done: c.quantityDone ?? null } : {}),
    position: c.position,
  }))

  const anyBookingCost = trip.bookings.some((b) => b.cost != null)
  const bookings = trip.bookings.map((b) => ({
    id: newId(),
    trip_id: tripId,
    type: b.type,
    title: b.title,
    confirmation_code: nul(b.code),
    url: nul(b.url),
    valid_from: nul(b.validFrom),
    valid_to: nul(b.validTo),
    file_path: null,
    keep_offline: false,
    notes: nul(b.notes),
    ...(anyBookingCost
      ? { cost: nul(b.cost), currency: b.currency ?? trip.baseCurrency, scope: b.scope ?? 'per_person', payer_ids: (b.payerIds ?? []).map((id) => to(id)).filter((id): id is string => !!id) }
      : {}),
  }))

  const steps: RestoreStep[] = [
    { table: 'trip_travelers', rows: travelers },
    { table: 'days', rows: days },
    { table: 'categories', rows: categories },
    { table: 'places', rows: places },
    { table: 'day_items', rows: items },
    { table: 'stays', rows: stays },
    { table: 'transports', rows: transports },
    { table: 'flights', rows: flights },
    { table: 'flight_legs', rows: legs },
    ...(expenseCategories.length > 0 ? [{ table: 'expense_categories', rows: expenseCategories }] : []),
    { table: 'budget_items', rows: budgetItems },
    { table: 'budget_item_shares', rows: budgetShares },
    { table: 'expenses', rows: expenses },
    { table: 'expense_shares', rows: expenseShares },
    { table: 'checklist_items', rows: checklist },
    { table: 'bookings', rows: bookings },
  ]
  return steps.filter((s) => s.rows.length > 0)
}
