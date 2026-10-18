import { useState } from 'preact/hooks'
import { formatDay } from '../lib/dates'
import { mapsLinkFor } from '../lib/mapsUrl'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import type { Place, PlaceStatus, Trip } from '../types'
import { useConfirm } from './ConfirmDialog'
import { FormError, SecondaryButton } from './Field'
import { PlaceForm } from './PlaceForm'
import { STATUSES, STATUS_LABEL } from './placeMeta'
import { Select } from './Select'
import { Sheet } from './Sheet'

export type PlaceSheetState = { kind: 'detail'; placeId: string } | { kind: 'edit'; placeId: string } | { kind: 'new' } | null

interface Props {
  trip: Trip
  state: PlaceSheetState
  onChange: (next: PlaceSheetState) => void
}

/** Scheda luogo + modulo di modifica/creazione, in un unico pannello a scorrimento dal basso. */
export function PlaceSheet({ trip, state, onChange }: Props) {
  const t = useTrips()
  const close = () => onChange(null)
  const place = state && state.kind !== 'new' ? trip.places.find((p) => p.id === state.placeId) : undefined

  const title =
    state?.kind === 'new' ? 'Nuovo luogo' : state?.kind === 'edit' ? 'Modifica luogo' : (place?.name ?? 'Luogo')

  return (
    <Sheet open={state !== null} title={title} onClose={close}>
      {state?.kind === 'new' && (
        <PlaceForm trip={trip} onSubmit={(input) => t.createPlace(trip.id, input)} onDone={close} />
      )}
      {state?.kind === 'edit' && place && (
        <PlaceForm
          key={place.id}
          trip={trip}
          initial={place}
          onSubmit={(input) => t.updatePlace(place.id, trip.id, input)}
          onDone={() => onChange({ kind: 'detail', placeId: place.id })}
        />
      )}
      {state?.kind === 'detail' && place && (
        <Detail trip={trip} place={place} onEdit={() => onChange({ kind: 'edit', placeId: place.id })} onClose={close} />
      )}
      {state?.kind === 'detail' && !place && <p class="text-sm text-muted">Questo luogo non esiste più.</p>}
    </Sheet>
  )
}

function Detail({ trip, place, onEdit, onClose }: { trip: Trip; place: Place; onEdit: () => void; onClose: () => void }) {
  const t = useTrips()
  const [error, setError] = useState<string | null>(null)
  const [dayId, setDayId] = useState(trip.days[0]?.id ?? '')

  async function setStatus(status: PlaceStatus) {
    setError(await t.setPlaceStatus(place.id, status))
  }

  async function addToDay() {
    const day = trip.days.find((d) => d.id === dayId)
    if (!day) return
    const message = await t.createItem(trip.id, day.id, {
      title: place.name,
      kind: 'visit',
      startTime: '',
      endTime: '',
      notes: '',
      placeId: place.id,
    })
    if (message) return setError(message)
    if (place.status === 'idea') await t.setPlaceStatus(place.id, 'planned')
    showToast(`Aggiunto a ${formatDay(day.date)}`)
    onClose()
  }

  const [confirm, confirmDialog] = useConfirm()
  const plannedDays = trip.days.filter((d) => d.items.some((i) => i.placeId === place.id))

  async function remove() {
    const used = trip.days.reduce((n, d) => n + d.items.filter((i) => i.placeId === place.id).length, 0)
    const ok = await confirm({
      title: `Eliminare «${place.name}»?`,
      text: used > 0 ? `Resta in ${used} ${used === 1 ? 'tappa' : 'tappe'} dei giorni, ma senza più il luogo collegato. Puoi annullare subito dopo.` : 'Puoi annullare subito dopo.',
    })
    if (!ok) return
    const message = await t.setPlaceDeleted(place.id, true)
    if (message) return setError(message)
    onClose()
    showToast('Luogo eliminato', { label: 'Annulla', run: () => void t.setPlaceDeleted(place.id, false) })
  }

  return (
    <div class="space-y-4">
      {place.nameLocal && (
        <p lang="ja" class="rounded-2xl bg-accent-soft px-4 py-3 text-xl font-medium text-accent">
          {place.nameLocal}
        </p>
      )}
      <p class="text-sm text-muted">
        {[place.category, place.city].filter(Boolean).join(' · ') || 'Senza categoria'}
      </p>
      {plannedDays.length > 0 && (
        <p class="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
          In programma: {plannedDays.map((d) => formatDay(d.date)).join(' · ')}
        </p>
      )}

      <div class="flex flex-wrap gap-2" role="group" aria-label="Stato">
        {STATUSES.map((s) => (
          <button
            type="button"
            aria-pressed={place.status === s}
            onClick={() => void setStatus(s)}
            class={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              place.status === s ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {place.note && <p class="whitespace-pre-line text-sm">{place.note}</p>}
      {place.openingHours && <p class="text-sm text-muted">Orari: {place.openingHours}</p>}
      {place.address && <p class="text-xs text-muted">{place.address}</p>}

      <a
        href={mapsLinkFor(place)}
        target="_blank"
        rel="noopener noreferrer"
        class="grid min-h-12 w-full place-items-center rounded-full border border-line px-6 font-medium"
      >
        Apri in Maps
      </a>

      {trip.days.length > 0 && (
        <div class="space-y-2 rounded-2xl bg-bg p-3">
          <Select
            label="Aggiungi a un giorno"
            value={dayId}
            onChange={setDayId}
            tone="surface"
            options={trip.days.map((d, i) => ({ value: d.id, label: `${i + 1} · ${formatDay(d.date)}`, hint: d.city || undefined }))}
          />
          <button
            type="button"
            onClick={() => void addToDay()}
            class="min-h-12 w-full rounded-full bg-accent px-6 font-semibold text-accent-ink"
          >
            Aggiungi al giorno
          </button>
        </div>
      )}

      <FormError message={error} />
      {confirmDialog}
      <div class="grid grid-cols-2 gap-2">
        <SecondaryButton onClick={onEdit}>Modifica</SecondaryButton>
        <SecondaryButton danger onClick={() => void remove()}>
          Elimina
        </SecondaryButton>
      </div>
    </div>
  )
}
