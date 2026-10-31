// Orari vincolati o flessibili (#54, DAY-020…027, BOOK-028/029).
import type { Booking, DayItem, TimeKind, Trip } from '../types'
import { dateInZone, formatInZone } from './flights'
import { oraPrenotazione, tappeDi } from './prenotazioni'

export const TIME_KIND_LABEL: Record<TimeKind, string> = {
  fixed: 'Ora prestabilita',
  window: 'Finestra di accesso',
  indicative: 'Orario indicativo',
  unspecified: 'Non specificato',
}

export const isLocked = (i: Pick<DayItem, 'timeLock'>) => i.timeLock === 'locked'

/** Ora della prenotazione solo se è a ora prestabilita (BR-39): solo lei può proporre il vincolo. */
export function oraFissa(b: Pick<Booking, 'timeKind' | 'validFrom'>, tz: string): string {
  return b.timeKind === 'fixed' ? oraPrenotazione(b, tz) : ''
}

/** Prenotazioni a ora fissa collegate a una tappa. */
export function prenotazioniFisse(trip: Trip, itemId: string): Booking[] {
  return trip.bookings.filter((b) => b.status !== 'cancelled' && tappeDi(trip, b.id).includes(itemId) && oraFissa(b, trip.timezone))
}

export interface Disallineamento {
  booking: Booking
  oraTappa: string
  oraPrenotazione: string
}

/** Tappa e prenotazione a ora fissa con orari diversi (DAY-022, BOOK-029). */
export function disallineamenti(trip: Trip, item: Pick<DayItem, 'id' | 'time'>): Disallineamento[] {
  if (!item.time) return []
  return prenotazioniFisse(trip, item.id)
    .map((b) => ({ booking: b, oraTappa: item.time as string, oraPrenotazione: oraFissa(b, trip.timezone) }))
    .filter((d) => d.oraTappa !== d.oraPrenotazione)
}

/** Giorno della prenotazione, utile a chi controlla che stiano nello stesso giorno. */
export const giornoPrenotazione = (b: Pick<Booking, 'validFrom'>, tz: string) => (b.validFrom ? dateInZone(b.validFrom, tz) : '')
export const oraIstante = (iso: string, tz: string) => formatInZone(iso, tz)
