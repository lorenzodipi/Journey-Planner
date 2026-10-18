import { useState } from 'preact/hooks'
import { FormError, PrimaryButton, TextField } from './Field'

interface Props {
  initial?: string
  submitLabel: string
  onSubmit: (label: string) => Promise<string | null>
  onDone: () => void
}

/** Nome di una categoria di spesa: serve per crearne una nuova o rinominarla. */
export function CategoryForm({ initial = '', submitLabel, onSubmit, onDone }: Props) {
  const [label, setLabel] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: Event) {
    e.preventDefault()
    if (!label.trim()) return setError('Scrivi il nome della categoria (es. Souvenir).')
    setBusy(true)
    setError(null)
    const message = await onSubmit(label.trim())
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <TextField label="Nome della categoria" value={label} onInput={setLabel} maxLength={60} autoComplete="off" />
      <p class="text-sm text-muted">
        Le spese e le voci con questa categoria si sommano da sole: il totale non si scrive a mano.
      </p>
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvo…' : submitLabel}</PrimaryButton>
    </form>
  )
}
