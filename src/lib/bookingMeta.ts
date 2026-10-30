import type { BookingType } from '../types'

export const BOOKING_LABEL: Record<BookingType, string> = {
  flight: 'Volo',
  hotel: 'Alloggio',
  train: 'Treno',
  ticket: 'Biglietto',
  insurance: 'Assicurazione',
  esim: 'eSIM / SIM',
  other: 'Altro',
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
}

export const BOOKING_TYPES: BookingType[] = ['flight', 'hotel', 'train', 'ticket', 'insurance', 'esim', 'other']
