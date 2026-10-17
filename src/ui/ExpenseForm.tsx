import { useState } from 'preact/hooks'
import { dateInZone } from '../lib/flights'
import { amountToText, formatMoney, parseAmount, parseRate } from '../lib/money'
import type { ExpenseInput } from '../lib/moneyData'
import type { Expense, Trip } from '../types'
import { CostFields, FormError, PrimaryButton, SecondaryButton, TextArea, TextField } from './Field'
import { TravelerChips } from './TravelerChips'

const SUGGESTED = ['Cibo', 'Trasporti', 'Biglietti e ingressi', 'Shopping', 'Souvenir', 'Altro']

interface Props {
  trip: Trip
  initial?: Expense
  onSubmit: (input: ExpenseInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

/** Oggi nel fuso del viaggio, ma dentro le date del viaggio (se si prepara in anticipo parte dal primo giorno). */
function defaultDate(trip: Trip): string {
  const today = dateInZone(new Date().toISOString(), trip.timezone)
  return today >= trip.startDate && today <= trip.endDate ? today : trip.startDate
}

export function ExpenseForm({ trip, initial, onSubmit, onDelete, onDone }: Props) {
  const everyone = trip.travelers.map((t) => t.id)
  const startCurrency = initial?.currency ?? trip.localCurrency ?? trip.baseCurrency
  const [label, setLabel] = useState(initial?.label ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [amount, setAmount] = useState(amountToText(initial?.amount))
  const [currency, setCurrency] = useState(startCurrency)
  const [rate, setRate] = useState(
    initial?.fxRate ? String(initial.fxRate).replace('.', ',') : startCurrency === trip.localCurrency && trip.fxRate ? String(trip.fxRate).replace('.', ',') : '',
  )
  const [rateTouched, setRateTouched] = useState(!!initial?.fxRate)
  const [paidBy, setPaidBy] = useState<string>(initial?.paidBy ?? everyone[0] ?? '')
  const [sharedWith, setSharedWith] = useState<string[]>(initial && initial.shares.length ? initial.shares.map((s) => s.travelerId) : everyone)
  const [date, setDate] = useState(initial ? dateInZone(initial.spentAt, trip.timezone) : defaultDate(trip))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const cur = currency.trim().toUpperCase()
  const foreign = cur !== trip.baseCurrency
  const value = parseAmount(amount)
  const rateValue = parseRate(rate)
  const preview = foreign && value !== null && rateValue ? Math.round(value * rateValue * 100) / 100 : null
  const categories = Array.from(new Set([...trip.expenses.map((e) => e.category ?? '').filter(Boolean), ...SUGGESTED]))

  function onCurrency(v: string) {
    setCurrency(v)
    const next = v.trim().toUpperCase()
    // il tasso precompilato vale solo per la valuta locale: cambiando valuta lo tolgo (o lo rimetto)
    if (rateTouched) return
    setRate(next === trip.localCurrency && trip.fxRate ? String(trip.fxRate).replace('.', ',') : '')
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!label.trim()) return setError('Scrivi cosa hai pagato (es. Ramen).')
    if (value === null || value <= 0) return setError("Inserisci l'importo (es. 1200).")
    if (!/^[A-Za-z]{3}$/.test(cur)) return setError('La valuta è un codice di 3 lettere (es. JPY).')
    if (foreign && !rateValue) return setError(`Inserisci il cambio: quanti ${trip.baseCurrency} vale 1 ${cur}.`)
    if (trip.travelers.length > 0 && sharedWith.length === 0) return setError('Scegli tra chi dividere la spesa.')
    if (!date) return setError('Scegli la data della spesa.')
    setBusy(true)
    setError(null)
    const message = await onSubmit({
      label, category, amount: value, currency: cur, fxRate: foreign ? rateValue : null,
      paidBy: paidBy || null, spentDate: date, notes, travelerIds: sharedWith,
    })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  async function remove() {
    if (!onDelete) return
    setBusy(true)
    const message = await onDelete()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <TextField label="Cosa hai pagato" value={label} onInput={setLabel} maxLength={120} />
      <CostFields amountLabel="Importo" amount={amount} currency={currency} scope="total" onAmount={setAmount} onCurrency={onCurrency} onScope={() => {}} withScope={false} />
      {foreign && (
        <div class="space-y-1">
          <TextField label={`Cambio: 1 ${cur || '…'} = ? ${trip.baseCurrency}`} value={rate} onInput={(v) => { setRateTouched(true); setRate(v) }} inputMode="decimal" placeholder="0,0056" />
          {preview !== null && <p class="text-xs text-muted">≈ {formatMoney(preview, trip.baseCurrency)}</p>}
        </div>
      )}
      {trip.travelers.length > 0 && (
        <>
          <fieldset>
            <legend class="mb-1 block text-sm font-medium">Chi ha pagato</legend>
            <div class="flex flex-wrap gap-2">
              {trip.travelers.map((t) => (
                <button
                  type="button"
                  aria-pressed={paidBy === t.id}
                  onClick={() => setPaidBy(paidBy === t.id ? '' : t.id)}
                  class={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
                    paidBy === t.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'
                  }`}
                >
                  <span aria-hidden="true" class="h-3 w-3 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          </fieldset>
          <TravelerChips label="Dividi tra" travelers={trip.travelers} selected={sharedWith} onChange={setSharedWith} hint="In parti uguali." />
        </>
      )}
      <TextField label="Data" type="date" value={date} onInput={setDate} />
      <TextField label="Categoria" value={category} onInput={setCategory} list="expense-cats" />
      <datalist id="expense-cats">{categories.map((c) => <option value={c} />)}</datalist>
      <TextArea label="Note" value={notes} onInput={setNotes} />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva spesa' : 'Aggiungi spesa'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina spesa</SecondaryButton>}
    </form>
  )
}
