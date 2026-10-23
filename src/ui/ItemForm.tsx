import { useState } from 'preact/hooks'
import { useConfirm } from './ConfirmDialog'
import type { ItemInput } from '../lib/tripApi'
import type { DayItem, ItemKind, Trip } from '../types'
import { formatDuration, parseDuration } from '../lib/duration'
import { DurationField } from './DurationField'
import { FormError, PrimaryButton, SecondaryButton, TextArea, TextField } from './Field'
import { KIND_LABEL } from './ItemRow'
import { Select } from './Select'

interface Props {
  trip: Trip
  initial?: DayItem
  onSubmit: (input: ItemInput) => Promise<string | null>
  /** Presente solo in modifica. */
  onDelete?: () => Promise<string | null>
  /** Apre la scheda del luogo collegato. */
  onOpenPlace?: (placeId: string) => void
  onDone: () => void
}

const KINDS: ItemKind[] = ['visit', 'meal', 'transport', 'free', 'note']

export function ItemForm({ trip, initial, onSubmit, onDelete, onOpenPlace, onDone }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [kind, setKind] = useState<ItemKind>(initial?.kind ?? 'visit')
  const [startTime, setStartTime] = useState(initial?.time ?? '')
  const [endTime, setEndTime] = useState(initial?.endTime ?? '')
  const [notes, setNotes] = useState(initial?.note ?? '')
  const [placeId, setPlaceId] = useState(initial?.placeId ?? '')
  // vuoto = la tappa segue la durata del luogo; un valore = durata propria
  const [duration, setDuration] = useState(initial?.durationMinutes ? formatDuration(initial.durationMinutes) : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // «Alle» non può essere prima di «Dalle»
  function onStartTime(v: string) {
    setStartTime(v)
    if (v && endTime && endTime < v) setEndTime(v)
  }

  function onPlace(id: string) {
    setPlaceId(id)
    const place = trip.places.find((p) => p.id === id)
    if (place && !title.trim()) setTitle(place.name)
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!title.trim()) return setError('Scrivi cosa fai in questa tappa.')
    if (startTime && endTime && endTime < startTime) return setError("L'ora di fine è prima dell'inizio.")
    const minutes = parseDuration(duration)
    if (Number.isNaN(minutes)) return setError('La durata non è chiara: scrivi per esempio 45 min o 1 h 30.')
    setBusy(true)
    setError(null)
    // senza durata e senza averne mai avuta non si tocca la colonna (esiste solo dopo la migrazione 0015)
    const durationMinutes = minutes === null && !initial?.durationMinutes ? undefined : minutes
    const message = await onSubmit({ title, kind, startTime, endTime, notes, placeId: placeId || null, durationMinutes })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  const [confirm, confirmDialog] = useConfirm()

  async function remove() {
    if (!onDelete) return
    if (!(await confirm({ title: 'Eliminare questa tappa?', text: 'Puoi annullare subito dopo.' }))) return
    setBusy(true)
    const message = await onDelete()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      {trip.places.length > 0 && (
        <Select
          label="Luogo collegato"
          value={placeId}
          onChange={onPlace}
          placeholder="Nessuno"
          options={[
            { value: '', label: 'Nessuno' },
            ...trip.places.map((p) => ({ value: p.id, label: p.name, hint: [p.city, p.category].filter(Boolean).join(' · ') || undefined })),
          ]}
        />
      )}

      {placeId && onOpenPlace && trip.places.some((p) => p.id === placeId) && (
        <button type="button" onClick={() => onOpenPlace(placeId)} class="-mt-2 min-h-11 rounded-full px-3 text-sm font-extrabold text-accent">
          Apri la scheda del luogo
        </button>
      )}

      <TextField label="Cosa fai" value={title} onInput={setTitle} maxLength={120} />

      <fieldset>
        <legend class="mb-1 block text-sm font-extrabold">Tipo</legend>
        <div class="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              class={`min-h-11 rounded-full border-2 px-4 text-sm font-extrabold ${
                kind === k ? 'border-accent bg-accent-soft text-pale' : 'border-line text-muted'
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <div class="grid grid-cols-2 gap-3">
        <TextField label="Dalle" type="time" value={startTime} onInput={onStartTime} />
        <TextField label="Alle" type="time" value={endTime} onInput={setEndTime} min={startTime || undefined} />
      </div>

      <DurationField label="Quanto ti fermi" value={duration} onInput={setDuration} inherited={trip.places.find((p) => p.id === placeId)?.visitMinutes} />

      <TextArea label="Note" value={notes} onInput={setNotes} />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva tappa' : 'Aggiungi tappa'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina tappa</SecondaryButton>}
    {confirmDialog}
    </form>
  )
}
