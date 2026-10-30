import { useState } from 'react'
import { FormError, PrimaryButton, TextField } from './Field'

interface Props {
  onSubmit: (email: string) => Promise<string | null>
  onDone: () => void
}

/** Per i viaggiatori creati prima che servisse un account: li collega alla persona reale. */
export function LinkAccount({ onSubmit, onDone }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Scrivi un indirizzo email valido.')
    setBusy(true)
    setError(null)
    const message = await onSubmit(email.trim().toLowerCase())
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form className="space-y-3 rounded-[20px] border border-hairline p-4" onSubmit={submit} noValidate>
      <h3 className="font-extrabold">Collega a un account</h3>
      <p className="text-sm text-muted">
        Questa persona non ha ancora un account collegato. Scrivi la sua email: le spese e le voci già assegnate restano com'è.
      </p>
      <TextField label="Email del suo account" value={email} onChange={setEmail} autoComplete="off" />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Collego…' : 'Collega account'}</PrimaryButton>
    </form>
  )
}
