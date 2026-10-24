import { useState } from 'preact/hooks'
import { useConfirm } from './ConfirmDialog'
import type { ItemInput } from '../lib/tripApi'
import type { DayItem, ItemKind, Trip } from '../types'
import { DURATION_CHIPS, formatDuration, parseDuration } from '../lib/duration'
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

  const placeCount = trip.places.length
  const place = trip.places.find((p) => p.id === placeId)
  // «Altre opzioni» (fine e tipo) si aprono da sole se la tappa le usa già
  const extraOpen = Boolean(initial && (initial.endTime || initial.kind !== 'visit'))

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      {placeCount > 0 && (
        <Select
          label="Luogo"
          value={placeId}
          onChange={onPlace}
          placeholder={`Cerca tra i ${placeCount} luoghi`}
          searchable
          options={[
            { value: '', label: 'Nessuno' },
            ...trip.places.map((p) => ({ value: p.id, label: p.name, hint: [p.city, p.category].filter(Boolean).join(' · ') || undefined })),
          ]}
        />
      )}

      {placeId && onOpenPlace && place && (
        <button type="button" onClick={() => onOpenPlace(placeId)} class="btn soft sm" style={{ marginTop: '-4px' }}>
          Apri la scheda del luogo
        </button>
      )}

      <TextField label="Cosa fai" value={title} onInput={setTitle} maxLength={120} />

      <div class="grid grid-cols-2 gap-3">
        <TextField label="Orario" type="time" value={startTime} onInput={onStartTime} />
        <TextField
          label="Durata"
          value={duration}
          onInput={setDuration}
          list="durate-tappa"
          placeholder={place?.visitMinutes ? formatDuration(place.visitMinutes) : 'es. 1 h 30'}
        />
      </div>
      <datalist id="durate-tappa">
        {DURATION_CHIPS.map((m) => (
          <option value={formatDuration(m)} />
        ))}
      </datalist>

      <TextArea label="Nota" value={notes} onInput={setNotes} />

      <details open={extraOpen} class="space-y-4">
        <summary class="b-bold" style={{ cursor: 'pointer', color: 'var(--azzurro-ink)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
          Altre opzioni
        </summary>
        <TextField label="Fine" type="time" value={endTime} onInput={setEndTime} min={startTime || undefined} />
        <fieldset>
          <legend class="b-bold" style={{ marginBottom: '8px' }}>Tipo</legend>
          <div class="chips" style={{ flexWrap: 'wrap', margin: 0, padding: 0, overflow: 'visible' }}>
            {KINDS.map((k) => (
              <button type="button" aria-pressed={kind === k} onClick={() => setKind(k)} class={`chip${kind === k ? ' on' : ''}`}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </fieldset>
      </details>

      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva tappa' : 'Aggiungi tappa'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina tappa</SecondaryButton>}
      {confirmDialog}
    </form>
  )
}
