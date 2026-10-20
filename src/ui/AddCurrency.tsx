import { useState } from 'preact/hooks'
import { currencyName, parseRate } from '../lib/money'
import { fetchFxRate } from '../lib/moneyApi'
import { useTrips } from '../state/trips'
import type { Trip } from '../types'
import { FormError, PrimaryButton, SecondaryButton, TextField } from './Field'
import { Sheet } from './Sheet'

interface Props {
  open: boolean
  trip: Trip
  onClose: () => void
  /** Chiamata dopo il salvataggio, con il codice della valuta aggiunta. */
  onAdded: (code: string) => void
}

/** Aggiunge una valuta al viaggio, con il suo cambio: poi si sceglie come le altre in tutte le voci. */
export function AddCurrencySheet({ open, trip, onClose, onAdded }: Props) {
  const t = useTrips()
  const [code, setCode] = useState('')
  const [rate, setRate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const upper = code.trim().toUpperCase()
  const name = /^[A-Z]{3}$/.test(upper) ? currencyName(upper) : undefined
  const value = parseRate(rate)

  function close() {
    setCode('')
    setRate('')
    setError(null)
    onClose()
  }

  async function fetchRate() {
    if (!/^[A-Z]{3}$/.test(upper)) return setError('Scrivi prima il codice della valuta (3 lettere, es. KRW).')
    setLoading(true)
    setError(null)
    try {
      setRate(String(await fetchFxRate(upper, trip.baseCurrency)).replace('.', ','))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Non riesco a leggere il cambio. Scrivilo a mano.')
    } finally {
      setLoading(false)
    }
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!/^[A-Z]{3}$/.test(upper)) return setError('La valuta è un codice di 3 lettere (es. KRW).')
    if (upper === trip.baseCurrency || upper === trip.localCurrency) return setError(`${upper} c'è già tra le valute del viaggio: sceglila dal menu.`)
    if (!value) return setError(`Inserisci quanti ${trip.baseCurrency} vale 1 ${upper} (es. 0,00065).`)
    setBusy(true)
    setError(null)
    const message = await t.setFxRates(trip.id, trip.fxRate ?? null, { ...trip.fxRates, [upper]: value })
    setBusy(false)
    if (message) return setError(message)
    onAdded(upper)
    close()
  }

  return (
    <Sheet open={open} title="Aggiungi valuta" onClose={close}>
      <form class="space-y-4" onSubmit={submit} noValidate>
        <p class="text-sm text-muted">Il cambio vale per tutto il viaggio: una voce può comunque averne uno suo.</p>
        <TextField label="Codice della valuta (3 lettere)" value={code} onInput={(v) => setCode(v.toUpperCase())} maxLength={3} autoComplete="off" placeholder="KRW" />
        {name && <p class="-mt-2 text-xs text-muted">{name}</p>}
        <TextField label={`1 ${upper || '…'} = ? ${trip.baseCurrency}`} value={rate} onInput={setRate} inputMode="decimal" placeholder="0,00065" />
        <SecondaryButton onClick={() => void fetchRate()}>{loading ? 'Leggo il cambio…' : 'Prendi il cambio di oggi (BCE)'}</SecondaryButton>
        <FormError message={error} />
        <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : 'Aggiungi valuta'}</PrimaryButton>
      </form>
    </Sheet>
  )
}
