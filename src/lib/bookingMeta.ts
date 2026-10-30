import type { BookingType } from '../types'

export const BOOKING_LABEL: Record<BookingType, string> = {
  flight: 'Volo',
  hotel: 'Alloggio',
  train: 'Treno',
  ticket: 'Biglietto',
  insurance: 'Assicurazione',
  esim: 'eSIM / SIM',
  other: 'Altro',
  restaurant: 'Ristorante',
  rental: 'Noleggio',
  activity: 'Attività',
}

/** Categoria del Budget in cui finisce il costo di un documento, in base al tipo. */
export const BOOKING_BUDGET_CATEGORY: Record<BookingType, string> = {
  flight: 'Voli',
  hotel: 'Alloggi',
  train: 'Trasporti',
  ticket: 'Attività',
  insurance: 'Assicurazione',
  esim: 'eSIM / SIM',
  other: 'Altro',
  restaurant: 'Cibo',
  rental: 'Trasporti',
  activity: 'Attività',
}

export const BOOKING_TYPES: BookingType[] = ['flight', 'hotel', 'train', 'ticket', 'insurance', 'esim', 'other', 'restaurant', 'rental', 'activity']

/** Tipi che si possono scegliere nelle nuove prenotazioni (#40, #53): alloggi e voli hanno le loro pagine; eSIM e assicurazioni vanno nei Documenti. */
export const BOOKING_NEW_TYPES: BookingType[] = ['restaurant', 'activity', 'train', 'rental', 'other']
