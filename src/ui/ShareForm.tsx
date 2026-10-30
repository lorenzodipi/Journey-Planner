import { useState } from 'react'
import { FormError, PrimaryButton, TextField } from './Field'

interface Props {
  onSubmit: (email: string) => Promise<string | null>
  onDone: () => void
}

export function ShareForm({ onSubmit, onDone }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState<string | null>(null)

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Scrivi un indirizzo email valido.')
    setBusy(true)
    setError(null)
    const message = await onSubmit(email)
    setBusy(false)
    if (message) setError(message)
    else setAdded(email.trim())
  }

  if (added) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
          Fatto: <strong>{added}</strong> ora può vedere e modificare il viaggio.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="min-h-12 w-full rounded-full bg-accent px-6 font-extrabold text-accent-ink"
        >
          Ok
        </button>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <TextField label="Email della persona" value={email} onChange={setEmail} autoComplete="off" />
      <p className="text-xs text-muted">
        L'utente deve già esistere in Supabase (Authentication → Users). Avrà il ruolo «modifica»: può cambiare tutto tranne
        eliminare il viaggio.
      </p>
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Aggiungo…' : 'Dai accesso'}</PrimaryButton>
    </form>
  )
}
