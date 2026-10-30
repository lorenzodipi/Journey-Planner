import { useState } from 'react'
import { useConfirm } from './ConfirmDialog'
import { KIND_LABEL, KINDS, parseQuantity } from '../lib/checklist'
import { cleanUrl, type ChecklistInput } from '../lib/planningData'
import type { ChecklistItem, Trip } from '../types'
import { ChipSelect, FormError, PrimaryButton, SecondaryButton, TextField } from './Field'

interface Props {
  trip: Trip
  /** Assente = nuova voce. */
  initial?: ChecklistItem
  /** Elenco e persona proposti per una nuova voce. */
  defaults?: { kind?: ChecklistItem['kind']; travelerId?: string }
  onSubmit: (input: ChecklistInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

export function ChecklistItemForm({ trip, initial, defaults, onSubmit, onDelete, onDone }: Props) {
  const [text, setText] = useState(initial?.text ?? '')
  const [kind, setKind] = useState(initial?.kind ?? defaults?.kind ?? 'todo')
  const [who, setWho] = useState(initial?.travelerId ?? defaults?.travelerId ?? 'all')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1))
  const [url, setUrl] = useState(initial?.url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!text.trim()) return setError('Scrivi la voce.')
    if (url.trim() && !cleanUrl(url)) return setError('Il link non sembra un indirizzo web (es. https://…).')
    setBusy(true)
    setError(null)
    const message = await onSubmit({ text, kind, travelerId: who === 'all' ? null : who, dueDate, quantity: parseQuantity(quantity), url: cleanUrl(url) })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  const [confirm, confirmDialog] = useConfirm()

  async function remove() {
    if (!onDelete) return
    if (!(await confirm({ title: 'Eliminare questa voce?', text: 'Puoi annullare subito dopo.' }))) return
    setBusy(true)
    const message = await onDelete()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <TextField label="Voce" value={text} onChange={setText} maxLength={200} />
      <TextField label="Quantità" value={quantity} onChange={setQuantity} inputMode="numeric" maxLength={3} />
      <TextField label="Link (facoltativo)" value={url} onChange={setUrl} inputMode="text" placeholder="https://…" maxLength={500} />
      {initial?.url && cleanUrl(initial.url) && (
        <a className="btn soft block" href={cleanUrl(initial.url)} target="_blank" rel="noopener noreferrer">
          Apri il link
        </a>
      )}
      <ChipSelect label="Elenco" value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
      {trip.travelers.length > 1 && (
        <ChipSelect
          label="Per chi"
          value={who}
          onChange={setWho}
          options={[{ value: 'all', label: 'Per tutti' }, ...trip.travelers.map((t) => ({ value: t.id, label: t.name }))]}
        />
      )}
      <TextField label="Entro il (facoltativo)" type="date" value={dueDate} onChange={setDueDate} optional />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva' : 'Aggiungi'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina voce</SecondaryButton>}
    {confirmDialog}
    </form>
  )
}
