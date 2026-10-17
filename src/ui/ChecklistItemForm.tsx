import { useState } from 'preact/hooks'
import { KIND_LABEL, KINDS, parseQuantity } from '../lib/checklist'
import type { ChecklistInput } from '../lib/planningData'
import type { ChecklistItem, Trip } from '../types'
import { ChipSelect, FormError, PrimaryButton, SecondaryButton, TextField } from './Field'

interface Props {
  trip: Trip
  initial: ChecklistItem
  onSubmit: (input: ChecklistInput) => Promise<string | null>
  onDelete: () => Promise<string | null>
  onDone: () => void
}

export function ChecklistItemForm({ trip, initial, onSubmit, onDelete, onDone }: Props) {
  const [text, setText] = useState(initial.text)
  const [kind, setKind] = useState(initial.kind)
  const [who, setWho] = useState(initial.travelerId ?? 'all')
  const [dueDate, setDueDate] = useState(initial.dueDate ?? '')
  const [quantity, setQuantity] = useState(String(initial.quantity ?? 1))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: Event) {
    e.preventDefault()
    if (!text.trim()) return setError('Scrivi la voce.')
    setBusy(true)
    setError(null)
    const message = await onSubmit({ text, kind, travelerId: who === 'all' ? null : who, dueDate, quantity: parseQuantity(quantity) })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  async function remove() {
    setBusy(true)
    const message = await onDelete()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <TextField label="Voce" value={text} onInput={setText} maxLength={200} />
      <TextField label="Quantità" value={quantity} onInput={setQuantity} inputMode="numeric" maxLength={3} />
      <ChipSelect label="Elenco" value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
      {trip.travelers.length > 1 && (
        <ChipSelect
          label="Per chi"
          value={who}
          onChange={setWho}
          options={[{ value: 'all', label: 'Per tutti' }, ...trip.travelers.map((t) => ({ value: t.id, label: t.name }))]}
        />
      )}
      <TextField label="Entro il (facoltativo)" type="date" value={dueDate} onInput={setDueDate} />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : 'Salva'}</PrimaryButton>
      <SecondaryButton danger onClick={() => void remove()}>Elimina voce</SecondaryButton>
    </form>
  )
}
