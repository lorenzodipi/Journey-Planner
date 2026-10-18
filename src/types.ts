// Tipi di dominio usati dall'interfaccia. Più avanti verranno generati da Supabase
// (`supabase gen types`); per ora descrivono la forma dei dati dell'anteprima demo.

export type ThemeName = 'default' | 'japan' | 'iceland'
export type PlaceStatus = 'idea' | 'planned' | 'done' | 'skipped'
export type Scope = 'per_person' | 'total'
export type TransportMode = 'train' | 'metro' | 'bus' | 'taxi' | 'walk' | 'car' | 'plane' | 'ferry' | 'other'
export type ItemKind = 'visit' | 'meal' | 'transport' | 'free' | 'note' | 'flight'

export interface Traveler {
  id: string
  name: string
  color: string
  position?: number
  /** Account collegato: chi non ce l'ha è un viaggiatore "vecchio" da collegare. */
  userId?: string
  email?: string
}

export type MemberRole = 'owner' | 'editor' | 'viewer'

export interface Category {
  id: string
  label: string
  color?: string
}

export interface Place {
  id: string
  name: string
  nameLocal?: string // nome nella lingua del posto, da mostrare a un tassista
  city: string
  category: string // etichetta della categoria ('' se nessuna)
  categoryId?: string
  status: PlaceStatus
  note?: string
  address?: string
  mapsUrl?: string
  openingHours?: string
  estCost?: number
  currency?: string
  lat: number | null
  lng: number | null
}

export interface DayItem {
  id: string
  time?: string // "HH:MM" nell'orario locale della destinazione
  endTime?: string
  title: string
  kind: ItemKind
  placeId?: string
  note?: string
  done?: boolean
  position?: number
}

export interface Day {
  id: string
  date: string // "YYYY-MM-DD"
  city: string
  title?: string
  notes?: string
  items: DayItem[]
}

export interface Stay {
  id: string
  name: string
  city: string
  checkIn: string // "YYYY-MM-DD"
  checkOut: string
  checkInInfo?: string // es. "17:00–22:00"
  checkOutInfo?: string // es. "entro 10:30"
  address?: string
  mapsUrl?: string
  totalCost?: number // per tutti i viaggiatori
  currency: string
  breakfast: boolean
  dinner: boolean
  kitchen: boolean
  booked: boolean
  paid: boolean
  notes?: string
}

export interface Transport {
  id: string
  from: string
  to: string
  mode: TransportMode
  departAt?: string // istante ISO (UTC)
  arriveAt?: string
  dayId?: string
  fromLat?: number // posizione di partenza/arrivo, per la mappa del giorno
  fromLng?: number
  toLat?: number
  toLng?: number
  cost?: number
  currency: string
  scope: Scope
  bought: boolean
  refCode?: string
  notes?: string
}

export interface FlightLeg {
  id: string
  seq: number
  flightNumber?: string
  from: string // IATA
  to: string
  departAt: string // istante ISO (UTC)
  arriveAt: string
  fromTz: string // fuso IANA dell'aeroporto di partenza
  toTz: string
  cabin?: string
  seats?: string
  notes?: string
}

export interface Flight {
  id: string
  title: string
  airline?: string
  bookingRef?: string
  cost?: number
  currency: string
  scope: Scope
  paid: boolean
  notes?: string
  legs: FlightLeg[]
}

export interface BudgetShare {
  id: string
  travelerId: string
  paid: boolean
}

export interface BudgetItem {
  id: string
  label: string
  /** Nome della categoria di spesa (ricavato da `categoryId`). */
  category?: string
  categoryId?: string
  amount: number
  currency: string
  scope: Scope
  dueDate?: string // "YYYY-MM-DD"
  notes?: string
  shares: BudgetShare[] // chi paga questa voce (per tutti = tutti i viaggiatori)
}

export interface ExpenseShare {
  travelerId: string
  weight: number
}

export interface Expense {
  id: string
  label: string
  /** Nome della categoria di spesa (ricavato da `categoryId`). */
  category?: string
  categoryId?: string
  amount: number
  currency: string
  fxRate?: number // unità di valuta base per 1 unità di `currency`
  paidBy?: string // id del viaggiatore che ha anticipato
  spentAt: string // istante ISO
  dayId?: string
  notes?: string
  shares: ExpenseShare[] // tra chi si divide (vuoto = tutti in parti uguali)
}

export type ChecklistKind = 'todo' | 'packing' | 'docs'

export interface ChecklistItem {
  id: string
  kind: ChecklistKind
  text: string
  done: boolean
  travelerId?: string // vuoto = per tutti
  dueDate?: string // "YYYY-MM-DD"
  /** Quanti pezzi (es. 3 magliette). Vuoto = 1. */
  quantity?: number
  /** Pezzi già presi/fatti, da 0 a `quantity`. Vuoto = nessuno (o tutti, se la voce è segnata fatta). */
  quantityDone?: number
  position: number
}

export type BookingType = 'flight' | 'hotel' | 'train' | 'ticket' | 'insurance' | 'esim' | 'other'

export interface Booking {
  id: string
  type: BookingType
  title: string
  code?: string // codice di conferma
  url?: string
  validFrom?: string // istante ISO
  validTo?: string
  filePath?: string // nel bucket privato "bookings"
  keepOffline: boolean
  notes?: string
}

export interface Trip {
  id: string
  title: string
  destination: string
  startDate: string
  endDate: string
  timezone: string // fuso IANA della destinazione
  theme: ThemeName
  baseCurrency: string
  localCurrency?: string
  center: { lat: number; lng: number }
  travelers: Traveler[]
  /** Ruolo di chi sta usando l'app in questo viaggio (se noto). */
  myRole?: MemberRole
  days: Day[]
  places: Place[]
  /** Categorie dei luoghi (Tempio, Ristorante…). */
  categories: Category[]
  /** Categorie delle spese e del budget (Cibo, Trasporti…): i totali si calcolano dalle spese che le usano. */
  expenseCategories: Category[]
  stays: Stay[]
  transports: Transport[]
  flights: Flight[]
  budget: BudgetItem[]
  expenses: Expense[]
  checklist: ChecklistItem[]
  bookings: Booking[]
  /** Unità di valuta base per 1 unità della valuta locale (es. 0,0056 EUR per 1 JPY). */
  fxRate?: number
}
