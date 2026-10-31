// Tipi di dominio usati dall'interfaccia. Più avanti verranno generati da Supabase
// (`supabase gen types`); per ora descrivono la forma dei dati dell'anteprima demo.

export type ThemeName = 'default' | 'japan' | 'iceland'
export type PlaceStatus = 'idea' | 'planned' | 'done' | 'skipped'
export type Scope = 'per_person' | 'total'
export type TransportMode = 'train' | 'metro' | 'bus' | 'taxi' | 'walk' | 'car' | 'plane' | 'ferry' | 'other'
export type ItemKind = 'visit' | 'meal' | 'transport' | 'free' | 'note' | 'flight'
/** Stato della tappa (#32): registro in `src/lib/tappaStati.ts`. */
export type ItemStatus = 'todo' | 'done' | 'skipped' | 'late' | 'postponed' | 'cancelled'

export interface Traveler {
  id: string
  name: string
  color: string
  position?: number
  /** Account collegato: chi non ce l'ha è un viaggiatore "vecchio" da collegare. */
  userId?: string
  email?: string
  /** Ruolo nel viaggio: creatore (owner) o partecipante (editor). */
  role?: MemberRole
}

/** Invito per email a un viaggio (#44). «Scaduto» si calcola anche dalla data (vedi lib/inviti). */
export type StatoInvito = 'inviato' | 'accettato' | 'rifiutato' | 'scaduto'
export interface TripInvite {
  id: string
  email: string
  status: StatoInvito
  createdAt: string
  expiresAt: string
  respondedAt?: string
}

/** Invito che ho ricevuto e non ho ancora accettato (non vedo nulla del viaggio finché non accetto). */
export interface ReceivedInvite {
  id: string
  tripId: string
  title: string
  destination: string
  startDate?: string
  endDate?: string
  invitedBy: string
  expiresAt: string
}

export type MemberRole = 'owner' | 'editor' | 'viewer'

export interface Category {
  id: string
  label: string
  color?: string
  /** Solo categorie di spesa: il previsto scritto a mano, nella valuta di casa (0019). */
  planned?: number
  /** Categoria archiviata (0028): resta sulle spese già fatte ma non si propone più. */
  archived?: boolean
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
  /** Orari strutturati (#33); `openingHours` resta come testo di ripiego. */
  openingSpec?: import('./lib/opening').OpeningSpec
  estCost?: number
  /** Quanto fermarsi, in minuti (facoltativo). */
  visitMinutes?: number
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
  /** Durata propria della tappa, in minuti. Assente = come il luogo collegato. */
  durationMinutes?: number
  done?: boolean
  /** Stato (#32). Senza la migrazione 0017 vale «done» o «todo» da `done`. */
  status?: ItemStatus
  /** Quando è cambiato lo stato (istante ISO). */
  statusChangedAt?: string
  /** Giorno da cui è stata rimandata. */
  postponedFromDayId?: string
  /** Per chi è la tappa (vuoto = tutti). */
  participants?: string[]
  /** Categoria propria della tappa; vuota = quella del luogo collegato. */
  categoryId?: string
  position?: number
  /** dalla migrazione 0032 */
  timeLock?: 'flexible' | 'locked'
  lockSource?: 'manual' | 'booking'
  lockChangedBy?: string
  lockChangedAt?: string
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
  /** Chi l'ha pagato (#34): serve alla spesa automatica. */
  paidBy?: string
  /** Per chi è (#34), vuoto = tutti. */
  forTravelers?: string[]
  /** dalla migrazione 0024 */
  room?: string
  roomType?: string
  bookingCode?: string
}

export interface Transport {
  id: string
  from: string
  to: string
  mode: TransportMode
  departAt?: string // istante ISO (UTC), solo se c'è l'ora
  arriveAt?: string
  departDate?: string // "YYYY-MM-DD", solo se l'ora manca (altrimenti la data è nell'istante)
  arriveDate?: string
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
  /** Chi l'ha pagato (#34): serve alla spesa automatica. */
  paidBy?: string
  /** Per chi è (#34), vuoto = tutti. */
  forTravelers?: string[]
  /** dalla migrazione 0022 */
  title?: string
  /** fermate intermedie, 0 = diretto */
  stops?: number
  operator?: string
  platform?: string
  baggage?: string
  policy?: string
  checkinAt?: string
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
  /** dalla migrazione 0021 */
  terminal?: string
  gate?: string
  /** ora locale dell'imbarco, «HH:MM» */
  boardingTime?: string
  /** posto di ciascun passeggero (id viaggiatore → «14A») */
  seatsBy?: Record<string, string>
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
  /** Chi l'ha pagato (#34): serve alla spesa automatica. */
  paidBy?: string
  /** Per chi è (#34), vuoto = tutti. */
  forTravelers?: string[]
  /** dalla migrazione 0021 */
  baggage?: string
  policy?: string
  /** apertura del check-in online (istante ISO) */
  checkinAt?: string
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
  /** Divisione per percentuali (0028): quota in %, con due decimali. */
  percent?: number
  /** Divisione per importi fissi (0028): quota nella valuta della spesa. */
  amount?: number
}

/** Come si divide una spesa (0028): parti uguali, percentuali (somma 100) o importi fissi (somma = totale). */
export type SplitMode = 'equal' | 'percent' | 'fixed'

/** Un versamento: chi ha pagato e quanto, nella valuta della spesa. */
export interface ExpensePayer {
  travelerId: string
  amount: number
}

/** Ricevuta di una spesa (foto o PDF nel bucket privato). */
export interface ExpenseFile {
  id: string
  path: string
  name?: string
  mimeType?: string
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
  /** Più paganti (0028). Vuoto: ha pagato `paidBy` per l'intero importo. */
  payers?: ExpensePayer[]
  splitMode?: SplitMode
  /** Chi ha creato la spesa (account); vuoto per le spese vecchie. */
  createdBy?: string
  /** Da dove viene il cambio («BCE»), quando è stato letto e se l'ha scritto qualcuno a mano. */
  fxSource?: string
  fxAt?: string
  fxManual?: boolean
  /** Account di chi ha scritto il cambio a mano. */
  fxSetBy?: string
  files?: ExpenseFile[]
  /** Spesa nata da un'altra voce (tappa con costo, alloggio, volo, trasporto, prenotazione pagati). */
  source?: { kind: ExpenseSourceKind; id: string }
}

/** Stato di un rimborso (#51). */
export type StatoRimborso = 'in_attesa' | 'confermato' | 'rifiutato' | 'annullato'

/** Rimborso tra due persone: lo vedono solo le due controparti. Importi nella valuta base del viaggio. */
export interface Rimborso {
  id: string
  fromId: string
  toId: string
  amount: number
  currency: string
  paidOn: string // YYYY-MM-DD
  status: StatoRimborso
  createdBy?: string
  createdAt: string
  decidedBy?: string
  decidedAt?: string
  /** Rettifica: il rimborso confermato che corregge. */
  corrects?: string
}

/** Rimborso confermato, visibile a tutti i partecipanti solo come importo (serve a calcolare i saldi). */
export interface RimborsoConfermato {
  id: string
  fromId: string
  toId: string
  amount: number
}

/** Chi può vedere un documento (#52). */
export type Visibilita = 'all' | 'selected' | 'private'
export type DocKind = 'booking' | 'day_item' | 'place' | 'stay' | 'flight' | 'transport'

/** Un file caricato una volta, con visibilità e collegamenti a più punti dell'app. */
export interface Documento {
  id: string
  path: string
  name: string
  mime?: string
  size?: number
  /** Account di chi l'ha caricato: solo lui ne cambia la visibilità. */
  ownerId?: string
  visibility: Visibilita
  /** Viaggiatori che lo vedono quando è «selected». */
  access: string[]
  links: { kind: DocKind; refId: string }[]
  createdAt: string
  changedAt?: string
}

export type ExpenseSourceKind = 'day_item' | 'stay' | 'flight' | 'transport' | 'booking'

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
  /** Link facoltativo (es. la pagina di un prodotto da comprare). */
  url?: string
  position: number
  /** dalla migrazione 0026 */
  description?: string
  unit?: string
  /** «Documenti», «Valigia», «Salute», «Tecnologia», «Altro» o una categoria personalizzata */
  category?: string
  /** voce della mia lista privata (la vedo solo io) */
  private?: boolean
  /** spunte degli altri viaggiatori sulle voci comuni; `done` / `quantityDone` sono sempre le MIE */
  others?: { travelerId: string; done: boolean; quantityDone?: number }[]
}

export type BookingType = 'flight' | 'hotel' | 'train' | 'ticket' | 'insurance' | 'esim' | 'other' | 'restaurant' | 'rental' | 'activity'

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
  /** Costo (es. di un'assicurazione): conta nel Budget come già pagato da `payerIds`. */
  cost?: number
  currency?: string
  scope?: Scope
  /** Chi lo ha pagato; vuoto = tutti i viaggiatori. */
  payerIds?: string[]
  /** Chi l'ha pagato (#34): serve alla spesa automatica. */
  paidBy?: string
  /** Per chi è (#34), vuoto = tutti. */
  forTravelers?: string[]
  /** dalla migrazione 0025 */
  detail?: string
  partySize?: number
  place?: string
  /** dalla migrazione 0031 */
  status?: BookingStatus
  provider?: string
  contact?: string
  cancellationPolicy?: string
  participants?: string[]
  timeKind?: TimeKind
}

export type TimeKind = 'fixed' | 'window' | 'indicative' | 'unspecified'
export type BookingStatus = 'to_confirm' | 'confirmed' | 'cancelled'

/** Collegamento prenotazione ↔ tappa (0031). */
export interface BookingLink {
  bookingId: string
  itemId: string
}

/** Codice del biglietto (#38): immagine del QR / codice a barre di un trasporto, volo o prenotazione, per passeggero. */
export type TicketKind = 'transport' | 'flight' | 'booking'
export interface TicketCode {
  id: string
  kind: TicketKind
  refId: string
  /** Di chi è il biglietto; assente = vale per tutti. */
  travelerId?: string
  /** Nel bucket privato «bookings». */
  filePath: string
}

/** Un paese del viaggio (#35): fuso, valuta e cambio valgono per i giorni dell'intervallo. */
export interface TripCountry {
  id: string
  /** codice ISO («JP»); vuoto se il paese non è nell'elenco */
  country: string
  name: string
  currency: string
  timezone: string
  startDate: string
  endDate: string
  /** unità di valuta di casa per 1 unità di questa valuta */
  fxRate?: number
  position: number
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
  /** Inviti per email, visibili a tutti i partecipanti (migrazione 0027). */
  invites?: TripInvite[]
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
  /** Miei rimborsi (dichiarati o ricevuti), con lo stato. Mancano se il database non ha la migrazione 0029. */
  settlements?: Rimborso[]
  /** Documenti che posso vedere. Mancano se il database non ha la migrazione 0030. */
  documents?: Documento[]
  /** Collegamenti prenotazione ↔ tappa; assente = migrazione 0031 non ancora eseguita. */
  bookingLinks?: BookingLink[]
  /** Rimborsi confermati di tutti: cambiano i saldi di chiunque. */
  settled?: RimborsoConfermato[]
  checklist: ChecklistItem[]
  bookings: Booking[]
  ticketCodes?: TicketCode[]
  /** vero se il database ha la migrazione 0026 (spunte personali e liste private) */
  checklistV2?: boolean
  /** il mio viaggiatore (collegato al mio account) */
  myTravelerId?: string
  /** Unità di valuta base per 1 unità della valuta locale (es. 0,0056 EUR per 1 JPY). */
  fxRate?: number
  /** Cambi delle valute extra del viaggio: unità di valuta base per 1 unità di ciascuna (es. { KRW: 0.00065 }). */
  fxRates?: Record<string, number>
  /** Budget massimo del viaggio, nella valuta base (facoltativo). */
  budgetLimit?: number
  /** Paesi del viaggio con le date (migrazione 0020); assenti = un solo paese, quello di destination. */
  countries?: TripCountry[]
  /** Paese di casa (codice ISO, es. «IT») e suo fuso: per l'ora di casa e il fuso di partenza di voli e trasporti. */
  originCountry?: string
  originTimezone?: string
}
