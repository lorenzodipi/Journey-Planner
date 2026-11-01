import { useState } from 'react'
import { currencyName, extraCurrencies, formatMoney, parseRate } from '../lib/money'
import { fetchFxRate } from '../lib/moneyApi'
import type { Trip } from '../types'
import { Campo, Pulsante } from '../faraway/base'
import { Sv } from '../faraway/icons'

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
    <form style={{ display: 'grid', gap: 16 }} onSubmit={submit} noValidate>
      <p className="fa-m" style={{ margin: 0 }}>
        {multi
          ? `Servono a mettere nella stessa valuta (${base}) le voci in valuta estera. Le spese possono avere un cambio proprio, che ha la precedenza.`
          : `Serve a mettere nella stessa valuta (${base}) le voci in ${local}. Le spese possono avere un cambio proprio, che ha la precedenza.`}
      </p>
      <Campo label={`1 ${local} = ? ${base}`} value={rate} onChange={setRate} inputMode="decimal" placeholder="0,0056" hint={value ? `${formatMoney(10_000, local)} ≈ ${formatMoney(Math.round(10_000 * value * 100) / 100, base)}` : undefined} />

      {extras.map((x, i) => {
        const v = parseRate(x.text)
        return (
          <div key={x.code} style={{ display: 'grid', gap: 8 }}>
            <Campo
              label={`1 ${x.code} = ? ${base}`}
              value={x.text}
              onChange={(t) => setExtras(extras.map((y, j) => (j === i ? { ...y, text: t } : y)))}
              inputMode="decimal"
              placeholder="0,00065"
              hint={[currencyName(x.code), v ? `${formatMoney(10_000, x.code)} ≈ ${formatMoney(Math.round(10_000 * v * 100) / 100, base)}` : ''].filter(Boolean).join(' · ') || undefined}
            />
            <Pulsante color="tertiary-destructive" iconLeading="trash" onPress={() => setExtras(extras.filter((_, j) => j !== i))}>
              Togli {x.code}
            </Pulsante>
          </div>
        )
      })}

      {adding ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <Campo label="Codice della valuta (3 lettere)" value={newCode} onChange={(v) => setNewCode(v.toUpperCase())} maxLength={3} autoComplete="off" placeholder="KRW" />
          <div className="fa-btns">
            <Pulsante color="secondary" onPress={() => (setAdding(false), setNewCode(''))}>
              Annulla
            </Pulsante>
            <Pulsante color="secondary-soft" iconLeading="plus" onPress={addCurrency}>
              Aggiungi
            </Pulsante>
          </div>
        </div>
      ) : (
        <Pulsante color="secondary-soft" iconLeading="plus" onPress={() => setAdding(true)}>
          Aggiungi valuta
        </Pulsante>
      )}

      <Pulsante color="secondary" iconLeading="refresh" isLoading={loading} onPress={() => void fetchRates()}>
        {multi ? 'Prendi i cambi di oggi (BCE)' : 'Prendi il cambio di oggi (BCE)'}
      </Pulsante>
      {error ? (
        <span className="fa-help bad" role="alert" data-errore>
          <Sv name="err" size={16} />
          {error}
        </span>
      ) : null}
      <Pulsante type="submit" isLoading={busy}>
        {multi ? 'Salva cambi' : 'Salva cambio'}
      </Pulsante>
    </form>
  )
}
