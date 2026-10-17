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
  categories: Category[]
}
