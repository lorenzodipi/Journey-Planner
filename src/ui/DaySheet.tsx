import { dateAddDays } from '../lib/dates'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import type { Booking, ChecklistItem, Day, DayItem, Expense, Stay, Transport, Trip } from '../types'
import { BookingForm } from './BookingForm'
import { ChecklistItemForm } from './ChecklistItemForm'
import { DayForm } from './DayForm'
import { ExpenseForm } from './ExpenseForm'
import { ItemForm } from './ItemForm'
import { PlaceSheet, type PlaceSheetState } from './PlaceSheet'
import { Sheet } from './Sheet'
import { StayForm } from './StayForm'
import { TransportForm } from './TransportForm'

export type DaySheetState =
  | { kind: 'day'; day: Day }
  | { kind: 'new-item'; day: Day }
  | { kind: 'edit-item'; day: Day; item: DayItem }
  | { kind: 'new-stay'; day: Day }
  | { kind: 'edit-stay'; stay: Stay }
  | { kind: 'new-transport'; day: Day }
  | { kind: 'edit-transport'; transport: Transport }
  | { kind: 'new-expense'; day: Day }
  | { kind: 'edit-expense'; expense: Expense }
  | { kind: 'edit-booking'; booking: Booking }
  | { kind: 'edit-checklist'; item: ChecklistItem }
  | { kind: 'place'; state: NonNullable<PlaceSheetState> }
  | null

const TITLES = {
  day: 'Modifica giornata',
  'new-item': 'Aggiungi tappa',
  'edit-item': 'Modifica tappa',
  'new-stay': 'Nuovo alloggio',
  'edit-stay': 'Modifica alloggio',
  'new-transport': 'Nuovo trasporto',
  'edit-transport': 'Modifica trasporto',
  'new-expense': 'Nuova spesa',
  'edit-expense': 'Modifica spesa',
  'edit-booking': 'Modifica prenotazione',
  'edit-checklist': 'Modifica voce',
  place: 'Luogo',
} as const

/**
 * Moduli in un pannello a scorrimento per modificare un giorno e tutto ciò che ci è collegato
 * (tappe, alloggio, trasporti, voli, spese, prenotazioni, cose da fare). Sono gli stessi moduli
 * delle altre sezioni: i dati sono quelli, quindi una modifica fatta qui compare ovunque.
 */
export function DaySheet({
  trip,
  state,
  onChange,
}: {
  trip: Trip
  state: DaySheetState
  onChange: (next: DaySheetState) => void
}) {
  const t = useTrips()
  const close = () => onChange(null)

  /** Elimina con possibilità di annullare subito (il modulo ha già chiesto conferma). */
  const gone = async (what: string, run: () => Promise<string | null>, undo: () => Promise<string | null>) => {
    const message = await run()
    if (!message) showToast(`${what} eliminat${what.endsWith('a') ? 'a' : 'o'}`, { label: 'Annulla', run: () => void undo() })
    return message
  }

  return (
    <>
      <PlaceSheet
        trip={trip}
        state={state?.kind === 'place' ? state.state : null}
        onChange={(next) => onChange(next ? { kind: 'place', state: next } : null)}
      />
      <Sheet open={state !== null && state.kind !== 'place'} title={state && state.kind !== 'place' ? TITLES[state.kind] : ''} onClose={close}>
        {state?.kind === 'day' && (
          <DayForm key={state.day.id} day={state.day} onSubmit={(patch) => t.updateDay(state.day.id, patch)} onDone={close} />
        )}
        {state?.kind === 'new-item' && (
          <ItemForm
            trip={trip}
            onSubmit={(input) => t.createItem(trip.id, state.day.id, input)}
            onOpenPlace={(placeId) => onChange({ kind: 'place', state: { kind: 'detail', placeId } })}
            onDone={close}
          />
        )}
        {state?.kind === 'edit-item' && (
          <ItemForm
            key={state.item.id}
            trip={trip}
            initial={state.item}
            onSubmit={(input) => t.updateItem(state.item.id, input)}
            onOpenPlace={(placeId) => onChange({ kind: 'place', state: { kind: 'detail', placeId } })}
            onDelete={() => gone('Tappa', () => t.setItemDeleted(state.item.id, true), () => t.setItemDeleted(state.item.id, false))}
            onDone={close}
          />
        )}
        {state?.kind === 'new-stay' && (
          <StayForm
            trip={trip}
            defaults={{ checkIn: state.day.date, checkOut: dateAddDays(state.day.date, 1) }}
            onSubmit={(i) => t.createStay(trip.id, i)}
            onDone={close}
          />
        )}
        {state?.kind === 'edit-stay' && (
          <StayForm
            key={state.stay.id}
            trip={trip}
            initial={state.stay}
            onSubmit={(i) => t.updateStay(state.stay.id, i)}
            onDelete={() => gone('Alloggio', () => t.setStayDeleted(state.stay.id, true), () => t.setStayDeleted(state.stay.id, false))}
            onDone={close}
          />
        )}
        {state?.kind === 'new-transport' && (
          <TransportForm trip={trip} defaults={{ departDate: state.day.date }} onSubmit={(i) => t.createTransport(trip.id, i)} onDone={close} />
        )}
        {state?.kind === 'edit-transport' && (
          <TransportForm
            key={state.transport.id}
            trip={trip}
            initial={state.transport}
            onSubmit={(i) => t.updateTransport(trip.id, state.transport.id, i)}
            onDelete={() => gone('Trasporto', () => t.setTransportDeleted(state.transport.id, true), () => t.setTransportDeleted(state.transport.id, false))}
            onDone={close}
          />
        )}
        {state?.kind === 'new-expense' && (
          <ExpenseForm trip={trip} defaults={{ date: state.day.date }} onSubmit={(i) => t.createExpense(trip.id, i)} onDone={close} />
        )}
        {state?.kind === 'edit-expense' && (
          <ExpenseForm
            key={state.expense.id}
            trip={trip}
            initial={state.expense}
            onSubmit={(i) => t.updateExpense(trip.id, state.expense, i)}
            onDelete={() => gone('Spesa', () => t.setExpenseDeleted(state.expense.id, true), () => t.setExpenseDeleted(state.expense.id, false))}
            onDone={close}
          />
        )}
        {state?.kind === 'edit-booking' && (
          <BookingForm
            key={state.booking.id}
            trip={trip}
            initial={state.booking}
            onSubmit={(i) => t.updateBooking(trip.id, state.booking, i)}
            onDelete={() => gone('Prenotazione', () => t.setBookingDeleted(state.booking.id, true), () => t.setBookingDeleted(state.booking.id, false))}
            onDone={close}
          />
        )}
        {state?.kind === 'edit-checklist' && (
          <ChecklistItemForm
            key={state.item.id}
            trip={trip}
            initial={state.item}
            onSubmit={(input) => t.updateChecklistItem(state.item.id, input)}
            onDelete={() => gone('Voce', () => t.setChecklistDeleted(state.item.id, true), () => t.setChecklistDeleted(state.item.id, false))}
            onDone={close}
          />
        )}
      </Sheet>
    </>
  )
}
