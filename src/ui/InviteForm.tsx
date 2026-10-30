import { useState } from 'react'
import type { InvitedInput } from '../lib/tripApi'
import { nameFromEmail, TRAVELER_COLORS } from '../lib/tripForm'
import { FormError, PrimaryButton, TextField } from './Field'

interface Props {
  defaultColor?: string
  onSubmit: (input: InvitedInput) => Promise<string | null>
  onDone: () => void
}

/** Aggiunge una persona al viaggio dalla sua email: l'account deve esistere già. */
export function InviteForm({ defaultColor, onSubmit, onDone }: Props) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [color, setColor] = useState(defaultColor ?? TRAVELER_COLORS[1])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError('Scrivi un indirizzo email valido.')
    setBusy(true)
    setError(null)
    const message = await onSubmit({ email: clean, name: name.trim() || nameFromEmail(clean), color })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <TextField label="Email del suo account" value={email} onChange={setEmail} autoComplete="off" />
      <TextField label="Nome (facoltativo)" value={name} onChange={setName} maxLength={40} autoComplete="off" />
      <fieldset>
        <legend className="mb-2 block text-sm font-extrabold">Colore</legend>
        <div className="flex flex-wrap gap-3">
          {TRAVELER_COLORS.map((c) => (
            <button
              type="button"
              aria-label={`Colore ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`h-11 w-11 rounded-full border-2 ${color === c ? 'border-ink' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted">
        La persona deve essersi già registrata. Vedrà il viaggio e potrà modificarlo, tranne eliminarlo.
      </p>
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Aggiungo…' : 'Aggiungi al viaggio'}</PrimaryButton>
    </form>
  )
}
