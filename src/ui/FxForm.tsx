import { useState } from 'preact/hooks'
import { fetchFxRate } from '../lib/moneyApi'
import { formatMoney, parseRate } from '../lib/money'
import type { Trip } from '../types'
import { FormError, PrimaryButton, SecondaryButton, TextField } from './Field'

interface Props {
  trip: Trip
  onSubmit: (rate: number | null) => Promise<string | null>
  onDone: () => void
}

/** Tasso di cambio del viaggio: quanta valuta base vale 1 unità della valuta locale. */
export function FxForm({ trip, onSubmit, onDone }: Props) {
  const local = trip.localCurrency ?? ''
  const [rate, setRate] = useState(trip.fxRate ? String(trip.fxRate).replace('.', ',') : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const value = parseRate(rate)

  async function fetchRate() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetchFxRate(local, trip.baseCurrency)
      setRate(String(r).replace('.', ','))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Non riesco a leggere il cambio. Scrivilo a mano.')
    } finally {
      setLoading(false)
    }
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!value || value <= 0) return setError('Inserisci un tasso maggiore di zero (es. 0,0056).')
    setBusy(true)
    setError(null)
    const message = await onSubmit(value)
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <p class="text-sm text-muted">
        Serve a mettere nella stessa valuta ({trip.baseCurrency}) le voci in {local}. Le spese possono avere un cambio
        proprio, che ha la precedenza.
      </p>
      <TextField label={`1 ${local} = ? ${trip.baseCurrency}`} value={rate} onInput={setRate} inputMode="decimal" placeholder="0,0056" />
      {value ? (
        <p class="-mt-2 text-xs text-muted">
          {formatMoney(10_000, local)} ≈ {formatMoney(Math.round(10_000 * value * 100) / 100, trip.baseCurrency)}
        </p>
      ) : null}
      <SecondaryButton onClick={() => void fetchRate()}>{loading ? 'Leggo il cambio…' : 'Prendi il cambio di oggi (BCE)'}</SecondaryButton>
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : 'Salva cambio'}</PrimaryButton>
    </form>
  )
}
