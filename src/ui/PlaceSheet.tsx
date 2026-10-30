import { MapsPill } from './MapsPill'
import { useState } from 'react'
import { formatDay } from '../lib/dates'
import { formatDuration } from '../lib/duration'
import { cachedPhoto } from '../lib/placePhoto'
import { mapsLinkFor } from '../lib/mapsUrl'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import type { Place, PlaceStatus, Trip } from '../types'
import { useConfirm } from './ConfirmDialog'
import { FormError } from './Field'
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
      {state?.kind === 'detail' && !place && <p className="b-sm muted">Questo luogo non esiste più.</p>}
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
  // la foto mostrata nella card della Mappa (se c'è): il credito va dato nei dettagli
  const photo = cachedPhoto(place)
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
    <div className="space-y-4">
      {place.nameLocal && (
        <p lang="ja" className="card" style={{ background: 'var(--tinta-azzurro)', color: 'var(--on-tinta)', border: 0, font: "500 24px/30px 'Zen Kaku Gothic New','Hiragino Sans','Yu Gothic',sans-serif" }}>
          {place.nameLocal}
        </p>
      )}
      <p className="b-bold">{[place.category, place.city].filter(Boolean).join(' · ') || 'Senza categoria'}</p>
      {plannedDays.length > 0 && (
        <p className="card b-sm" style={{ background: 'var(--tinta-azzurro)', color: 'var(--on-tinta)', border: 0, padding: '12px 16px' }}>
          In programma: {plannedDays.map((d) => formatDay(d.date)).join(' · ')}
        </p>
      )}

      <div className="chips" style={{ margin: 0, padding: 0, flexWrap: 'wrap' }} role="group" aria-label="Stato">
        {STATUSES.map((s) => (
          <button
            type="button"
            aria-pressed={place.status === s}
            onClick={() => void setStatus(s)}
            className={`chip${place.status === s ? ' on' : ''}`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {place.note && <p className="b-sm" style={{ whiteSpace: 'pre-line' }}>{place.note}</p>}
      {place.visitMinutes && <p className="b-sm muted">Ci si ferma circa {formatDuration(place.visitMinutes)}</p>}
      {place.openingHours && <p className="b-sm muted">Orari: {place.openingHours}</p>}
      {place.address && <p className="cap muted">{place.address}</p>}
      {photo && (
        <p className="cap muted">
          Foto:{' '}
          <a href={photo.page} target="_blank" rel="noopener noreferrer" className="underline">
            Wikimedia Commons
          </a>{' '}
          (da «{photo.title}»)
        </p>
      )}

      <MapsPill href={mapsLinkFor(place)} label={place.name} />

      {trip.days.length > 0 && (
        <div className="card" style={{ background: 'var(--surface-soft)', display: 'grid', gap: '8px', padding: '12px' }}>
          <Select
            label="Aggiungi a un giorno"
            value={dayId}
            onChange={setDayId}
            tone="surface"
            options={trip.days.map((d, i) => ({ value: d.id, label: `${i + 1} · ${formatDay(d.date)}`, hint: d.city || undefined }))}
          />
          <button type="button" onClick={() => void addToDay()} className="btn block">
            Aggiungi al giorno
          </button>
        </div>
      )}

      <FormError message={error} />
      {confirmDialog}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button type="button" className="btn soft" onClick={onEdit}>
          Modifica
        </button>
        <button type="button" className="btn line" style={{ color: 'var(--danger)', boxShadow: 'inset 0 0 0 1.5px var(--danger)' }} onClick={() => void remove()}>
          Elimina
        </button>
      </div>
    </div>
  )
}
