import { useState } from 'preact/hooks'
import { formatDayLong } from '../lib/dates'
import type { Day } from '../types'
import { FormError, PrimaryButton, TextArea, TextField } from './Field'

interface Props {
  day: Day
  onSubmit: (patch: { city: string; title: string; notes: string }) => Promise<string | null>
  onDone: () => void
}

export function DayForm({ day, onSubmit, onDone }: Props) {
  const [city, setCity] = useState(day.city)
  const [title, setTitle] = useState(day.title ?? '')
  const [notes, setNotes] = useState(day.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: Event) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await onSubmit({ city, title, notes })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit}>
      <p class="-mt-2 text-sm text-muted first-letter:uppercase">{formatDayLong(day.date)}</p>
      <TextField label="Città o zona" value={city} onInput={setCity} placeholder="Tokyo" maxLength={60} />
      <TextField label="Titolo della giornata" value={title} onInput={setTitle} placeholder="Arrivo" maxLength={80} />
      <TextArea label="Note" value={notes} onInput={setNotes} placeholder="Promemoria per questa giornata" />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : 'Salva giornata'}</PrimaryButton>
    </form>
  )
}
