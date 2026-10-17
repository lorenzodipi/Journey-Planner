import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import type { Day, DayItem, Trip } from '../types'
import { DayForm } from './DayForm'
import { ItemForm } from './ItemForm'
import { Sheet } from './Sheet'

export type DaySheetState =
  | { kind: 'day'; day: Day }
  | { kind: 'new-item'; day: Day }
  | { kind: 'edit-item'; day: Day; item: DayItem }
  | null

/** Moduli in un pannello a scorrimento per modificare un giorno e le sue tappe (usati da Giorni e dalla pagina del giorno). */
export function DaySheet({ trip, state, onClose }: { trip: Trip; state: DaySheetState; onClose: () => void }) {
  const t = useTrips()
  const title = state?.kind === 'day' ? 'Modifica giornata' : state?.kind === 'new-item' ? 'Nuova tappa' : 'Modifica tappa'
  return (
    <Sheet open={state !== null} title={title} onClose={onClose}>
      {state?.kind === 'day' && (
        <DayForm key={state.day.id} day={state.day} onSubmit={(patch) => t.updateDay(state.day.id, patch)} onDone={onClose} />
      )}
      {state?.kind === 'new-item' && (
        <ItemForm trip={trip} onSubmit={(input) => t.createItem(trip.id, state.day.id, input)} onDone={onClose} />
      )}
      {state?.kind === 'edit-item' && (
        <ItemForm
          key={state.item.id}
          trip={trip}
          initial={state.item}
          onSubmit={(input) => t.updateItem(state.item.id, input)}
          onDelete={async () => {
            const id = state.item.id
            const message = await t.setItemDeleted(id, true)
            if (!message) showToast('Tappa eliminata', { label: 'Annulla', run: () => void t.setItemDeleted(id, false) })
            return message
          }}
          onDone={onClose}
        />
      )}
    </Sheet>
  )
}
