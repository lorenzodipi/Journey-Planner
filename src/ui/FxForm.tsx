import { useState } from 'react'
import { currencyName, extraCurrencies, formatMoney, parseRate } from '../lib/money'
import { fetchFxRate } from '../lib/moneyApi'
import type { Trip } from '../types'
import { FormError, PrimaryButton, SecondaryButton, TextField } from './Field'

interface Props {
  trip: Trip
  /** `rate`: cambio della valuta locale; `extra`: cambi delle altre valute del viaggio. */
  onSubmit: (rate: number | null, extra: Record<string, number>) => Promise<string | null>
  onDone: () => void
}

const toText = (n: number) => String(n).replace('.', ',')

/**
 * Cambi del viaggio: quanta valuta base vale 1 unità della valuta locale e, se ce ne sono, delle altre valute.
 * Senza valute extra è il form di sempre; «+ Aggiungi valuta…» aggiunge la prima.
 */
export function FxForm({ trip, onSubmit, onDone }: Props) {
  const local = trip.localCurrency ?? ''
  const base = trip.baseCurrency
  const [rate, setRate] = useState(trip.fxRate ? toText(trip.fxRate) : '')
  const [extras, setExtras] = useState<{ code: string; text: string }[]>(() => extraCurrencies(trip).map((code) => ({ code, text: toText(trip.fxRates?.[code] ?? 0) })))
  const [adding, setAdding] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const value = parseRate(rate)
  const multi = extras.length > 0

  async function fetchRates() {
    setLoading(true)
    setError(null)
    try {
      const codes = [local, ...extras.map((x) => x.code)]
      const got = await Promise.all(codes.map((c) => fetchFxRate(c, base)))
      setRate(toText(got[0]))
      setExtras(extras.map((x, i) => ({ ...x, text: toText(got[i + 1]) })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Non riesco a leggere il cambio. Scrivilo a mano.')
    } finally {
      setLoading(false)
    }
  }

  function addCurrency() {
    const code = newCode.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(code)) return setError('La valuta è un codice di 3 lettere (es. KRW).')
    if (code === base || code === local || extras.some((x) => x.code === code)) return setError(`${code} c'è già tra le valute del viaggio.`)
    setExtras([...extras, { code, text: '' }])
    setNewCode('')
    setAdding(false)
    setError(null)
  }

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!value || value <= 0) return setError('Inserisci un tasso maggiore di zero (es. 0,0056).')
    const extra: Record<string, number> = {}
    for (const x of extras) {
      const r = parseRate(x.text)
      if (!r) return setError(`Inserisci il cambio di ${x.code} (quanti ${base} vale 1 ${x.code}), oppure toglila.`)
      extra[x.code] = r
    }
    setBusy(true)
    setError(null)
    const message = await onSubmit(value, extra)
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <p className="text-sm text-muted">
        {multi
          ? `Servono a mettere nella stessa valuta (${base}) le voci in valuta estera. Le spese possono avere un cambio proprio, che ha la precedenza.`
          : `Serve a mettere nella stessa valuta (${base}) le voci in ${local}. Le spese possono avere un cambio proprio, che ha la precedenza.`}
      </p>
      <TextField label={`1 ${local} = ? ${base}`} value={rate} onChange={setRate} inputMode="decimal" placeholder="0,0056" />
      {value ? (
        <p className="-mt-2 text-xs text-muted">
          {formatMoney(10_000, local)} ≈ {formatMoney(Math.round(10_000 * value * 100) / 100, base)}
        </p>
      ) : null}

      {extras.map((x, i) => {
        const v = parseRate(x.text)
        return (
          <div key={x.code} className="space-y-1">
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <TextField
                  label={`1 ${x.code} = ? ${base}`}
                  value={x.text}
                  onChange={(t) => setExtras(extras.map((y, j) => (j === i ? { ...y, text: t } : y)))}
                  inputMode="decimal"
                  placeholder="0,00065"
                />
              </div>
              <button type="button" onClick={() => setExtras(extras.filter((_, j) => j !== i))} aria-label={`Togli ${x.code}`} className="min-h-12 px-1 text-sm font-extrabold text-danger">
                Togli
              </button>
            </div>
            <p className="text-xs text-muted">
              {[currencyName(x.code), v ? `${formatMoney(10_000, x.code)} ≈ ${formatMoney(Math.round(10_000 * v * 100) / 100, base)}` : ''].filter(Boolean).join(' · ')}
            </p>
          </div>
        )
      })}

      {adding ? (
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <TextField label="Codice della valuta (3 lettere)" value={newCode} onChange={(v) => setNewCode(v.toUpperCase())} maxLength={3} autoComplete="off" placeholder="KRW" />
          </div>
          <button type="button" onClick={addCurrency} className="min-h-12 rounded-full border-2 border-accent px-4 text-sm font-extrabold text-accent">
            Aggiungi
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="min-h-11 text-sm font-extrabold text-pale">
          + Aggiungi valuta…
        </button>
      )}

      <SecondaryButton onClick={() => void fetchRates()}>
        {loading ? 'Leggo il cambio…' : multi ? 'Prendi i cambi di oggi (BCE)' : 'Prendi il cambio di oggi (BCE)'}
      </SecondaryButton>
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : multi ? 'Salva cambi' : 'Salva cambio'}</PrimaryButton>
    </form>
  )
}
