// Tutto ciò che riguarda un singolo giorno: spostamenti, alloggio, spese, prenotazioni e cose da fare.

import { dateInZone } from './flights'
import { eventsForDay, type DayEvent } from './today'
import type { Booking, ChecklistItem, Day, Expense, Stay, Trip } from '../types'

/** Voli, check-in/out e trasporti del giorno; i trasporti senza orario vengono dopo quelli con l'orario. */
export function dayMovements(trip: Pick<Trip, 'timezone' | 'flights' | 'stays' | 'transports'>, day: Pick<Day, 'id' | 'date'>): DayEvent[] {
  const events = eventsForDay(trip, day.date)
  const untimed: DayEvent[] = trip.transports
    .filter((t) => t.dayId === day.id && !t.departAt)
    .map((t) => ({
      at: `${day.date}T23:30:00.000Z`,
      time: '',
      title: `${t.from} → ${t.to}`,
      sub: t.refCode ? `Codice ${t.refCode}` : 'Orario da definire',
      kind: 'transport' as const,
      ref: { type: 'transport' as const, id: t.id },
      mode: t.mode,
      flag: t.bought ? { text: 'Biglietto acquistato', ok: true } : { text: 'Biglietto non acquistato', ok: false },
    }))
  return [...events, ...untimed]
}

export interface DayStays {
  /** Dove si dorme la notte che inizia in questo giorno. */
  night?: Stay
  checkIn: Stay[]
  checkOut: Stay[]
}

export function dayStays(stays: Stay[], date: string): DayStays {
  return {
    night: stays.find((s) => s.checkIn <= date && date < s.checkOut),
    checkIn: stays.filter((s) => s.checkIn === date),
    checkOut: stays.filter((s) => s.checkOut === date),
  }
}

/** Spese del giorno: quelle collegate al giorno, oppure fatte in quella data (nel fuso del viaggio). */
export function dayExpenses(trip: Pick<Trip, 'timezone' | 'expenses'>, day: Pick<Day, 'id' | 'date'>): Expense[] {
  return trip.expenses
    .filter((e) => e.dayId === day.id || (!e.dayId && dateInZone(e.spentAt, trip.timezone) === day.date))
    .sort((a, b) => a.spentAt.localeCompare(b.spentAt))
}

/** Prenotazioni valide in quel giorno (da `validFrom` a `validTo`, o solo il giorno di inizio). */
export function dayBookings(trip: Pick<Trip, 'timezone' | 'bookings'>, day: Pick<Day, 'date'>): Booking[] {
  return trip.bookings.filter((b) => {
    if (!b.validFrom) return false
    const from = dateInZone(b.validFrom, trip.timezone)
    const to = b.validTo ? dateInZone(b.validTo, trip.timezone) : from
    return from <= day.date && day.date <= to
  })
}

/** Cose da fare con scadenza in quel giorno. */
export function dayChecklist(checklist: ChecklistItem[], day: Pick<Day, 'date'>): ChecklistItem[] {
  return checklist.filter((c) => c.dueDate === day.date).sort((a, b) => Number(a.done) - Number(b.done) || a.position - b.position)
}
