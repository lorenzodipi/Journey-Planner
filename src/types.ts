// Tipi di dominio usati dall'interfaccia. Più avanti verranno generati da Supabase
// (`supabase gen types`); per ora descrivono la forma dei dati dell'anteprima demo.

export type ThemeName = 'default' | 'japan' | 'iceland'
export type PlaceStatus = 'idea' | 'planned' | 'done' | 'skipped'
export type ItemKind = 'visit' | 'meal' | 'transport' | 'free' | 'note' | 'flight'

export interface Traveler {
  id: string
  name: string
  color: string
  position?: number
}

export interface Place {
  id: string
  name: string
  city: string
  category: string
  status: PlaceStatus
  note?: string
  lat: number
  lng: number
}

export interface DayItem {
  id: string
  time?: string // "HH:MM" nell'orario locale della destinazione
  title: string
  kind: ItemKind
  placeId?: string
  note?: string
}

export interface Day {
  id: string
  date: string // "YYYY-MM-DD"
  city: string
  title?: string
  notes?: string
  items: DayItem[]
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
  days: Day[]
  places: Place[]
}
