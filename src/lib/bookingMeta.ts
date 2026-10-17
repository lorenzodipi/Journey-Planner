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

export const BOOKING_TYPES: BookingType[] = ['flight', 'hotel', 'train', 'ticket', 'insurance', 'esim', 'other']
