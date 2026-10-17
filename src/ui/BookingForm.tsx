import { useState } from 'preact/hooks'
import { BOOKING_LABEL, BOOKING_TYPES } from '../lib/bookingMeta'
import { checkFile } from '../lib/bookingFiles'
import { dateInZone } from '../lib/flights'
import { safeUrl, type BookingInput } from '../lib/planningData'
import type { Booking, Trip } from '../types'
import { CheckField, ChipSelect, FormError, PrimaryButton, SecondaryButton, TextArea, TextField } from './Field'

interface Props {
  trip: Trip
  initial?: Booking
  onSubmit: (input: BookingInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

export function BookingForm({ trip, initial, onSubmit, onDelete, onDone }: Props) {
  const tz = trip.timezone
  const [type, setType] = useState(initial?.type ?? 'other')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [validFrom, setValidFrom] = useState(initial?.validFrom ? dateInZone(initial.validFrom, tz) : '')
  const [validTo, setValidTo] = useState(initial?.validTo ? dateInZone(initial.validTo, tz) : '')
  const [keepOffline, setKeepOffline] = useState(initial?.keepOffline ?? true)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hasFile = !!initial?.filePath && !removeFile

  function pickFile(f: File | null) {
    if (f) {
      const problem = checkFile(f)
      if (problem) {
        setError(problem)
        return
      }
    }
    setError(null)
    setFile(f)
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!title.trim()) return setError('Scrivi il nome della prenotazione (es. Shinkansen Tokyo–Kyoto).')
    if (url.trim() && !safeUrl(url)) return setError('Il link non è valido: deve iniziare con http o https.')
    if (validFrom && validTo && validTo < validFrom) return setError('La data di fine è prima di quella di inizio.')
    setBusy(true)
    setError(null)
    const message = await onSubmit({ type, title, code, url, validFrom, validTo, keepOffline, notes, file, removeFile })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  async function remove() {
    if (!onDelete) return
    setBusy(true)
    const message = await onDelete()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <ChipSelect label="Tipo" value={type} onChange={setType} options={BOOKING_TYPES.map((x) => ({ value: x, label: BOOKING_LABEL[x] }))} />
      <TextField label="Nome" value={title} onInput={setTitle} maxLength={120} />
      <TextField label="Codice di conferma" value={code} onInput={setCode} autoComplete="off" maxLength={80} />
      <TextField label="Link (sito di prenotazione, check-in…)" value={url} onInput={setUrl} placeholder="https://…" autoComplete="off" />
      <div class="grid grid-cols-2 gap-3">
        <TextField label="Valido dal" type="date" value={validFrom} onInput={setValidFrom} />
        <TextField label="Fino al" type="date" value={validTo} onInput={setValidTo} />
      </div>

      <fieldset class="space-y-2 rounded-2xl bg-bg p-3">
        <legend class="sr-only">File</legend>
        <p class="text-sm font-medium">File (PDF o immagine, max 10 MB)</p>
        {hasFile && !file && (
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="text-muted">File già caricato</span>
            <button type="button" onClick={() => setRemoveFile(true)} class="min-h-11 rounded-full px-3 font-medium text-danger">
              Rimuovi
            </button>
          </div>
        )}
        {removeFile && !file && (
          <p class="text-sm text-muted">
            Il file verrà rimosso al salvataggio.{' '}
            <button type="button" onClick={() => setRemoveFile(false)} class="font-medium text-accent">Annulla</button>
          </p>
        )}
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => pickFile(e.currentTarget.files?.[0] ?? null)}
          class="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-line file:bg-surface file:px-4 file:font-medium"
        />
        {file && <p class="text-xs text-muted">{hasFile ? 'Sostituirà il file attuale: ' : ''}{file.name}</p>}
        <CheckField label="Disponibile offline sul telefono" checked={keepOffline} onChange={setKeepOffline} />
      </fieldset>

      <TextArea label="Note" value={notes} onInput={setNotes} placeholder="Posto, orario, istruzioni per il ritiro…" />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva' : 'Aggiungi'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina prenotazione</SecondaryButton>}
    </form>
  )
}
