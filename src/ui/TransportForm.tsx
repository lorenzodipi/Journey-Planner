import { useState } from 'preact/hooks'
import { amountToText, parseAmount } from '../lib/money'
import { transportToForm, type TransportInput } from '../lib/logistics'
import { isCompleteZoned, zonedToInstant } from '../lib/zoned'
import type { Transport, TransportMode, Trip } from '../types'
import { CheckField, ChipSelect, CostFields, FormError, PrimaryButton, SecondaryButton, TextArea, TextField } from './Field'

export const MODE_LABEL: Record<TransportMode, string> = {
  train: 'Treno',
  metro: 'Metro',
  bus: 'Bus',
  taxi: 'Taxi',
  walk: 'A piedi',
  car: 'Auto',
  plane: 'Aereo',
  ferry: 'Traghetto',
  other: 'Altro',
}

const MODES = (Object.keys(MODE_LABEL) as TransportMode[]).map((value) => ({ value, label: MODE_LABEL[value] }))

interface Props {
  trip: Trip
  initial?: Transport
  onSubmit: (input: TransportInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

export function TransportForm({ trip, initial, onSubmit, onDelete, onDone }: Props) {
  const times = initial ? transportToForm(initial, trip.timezone) : { departDate: trip.startDate, departTime: '', arriveDate: '', arriveTime: '' }
  const [from, setFrom] = useState(initial?.from ?? '')
  const [to, setTo] = useState(initial?.to ?? '')
  const [mode, setMode] = useState<TransportMode>(initial?.mode ?? 'train')
  const [departDate, setDepartDate] = useState(times.departDate)
  const [departTime, setDepartTime] = useState(times.departTime)
  const [arriveDate, setArriveDate] = useState(times.arriveDate)
  const [arriveTime, setArriveTime] = useState(times.arriveTime)
  const [cost, setCost] = useState(amountToText(initial?.cost))
  const [currency, setCurrency] = useState(initial?.currency ?? trip.localCurrency ?? trip.baseCurrency)
  const [scope, setScope] = useState<'per_person' | 'total'>(initial?.scope ?? 'per_person')
  const [bought, setBought] = useState(initial?.bought ?? false)
  const [refCode, setRefCode] = useState(initial?.refCode ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function onDepartTime(v: string) {
    setDepartTime(v)
    if (!arriveDate && departDate) setArriveDate(departDate) // di solito si arriva lo stesso giorno
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!from.trim() || !to.trim()) return setError('Scrivi da dove e verso dove ti sposti.')
    if (departTime && !departDate) return setError('Scegli la data di partenza.')
    if (arriveTime && !arriveDate) return setError('Scegli la data di arrivo.')
    if (isCompleteZoned(departDate, departTime) && isCompleteZoned(arriveDate, arriveTime)) {
      const a = zonedToInstant(departDate, departTime, trip.timezone)
      const b = zonedToInstant(arriveDate, arriveTime, trip.timezone)
      if (b < a) return setError("L'arrivo è prima della partenza.")
    }
    const amount = parseAmount(cost)
    if (cost.trim() && amount === null) return setError('Il costo non è un numero valido.')
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) return setError('La valuta è un codice di 3 lettere (es. JPY).')
    setBusy(true)
    setError(null)
    const message = await onSubmit({
      from, to, mode, departDate, departTime, arriveDate, arriveTime, cost: amount, currency, scope, bought, refCode, notes,
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
      <div class="grid grid-cols-2 gap-3">
        <TextField label="Da" value={from} onInput={setFrom} placeholder="Tokyo" />
        <TextField label="A" value={to} onInput={setTo} placeholder="Nikko" />
      </div>
      <ChipSelect label="Mezzo" value={mode} options={MODES} onChange={setMode} />

      <div class="grid grid-cols-2 gap-3">
        <TextField label="Partenza" type="date" value={departDate} onInput={setDepartDate} />
        <TextField label="Ora partenza" type="time" value={departTime} onInput={onDepartTime} />
        <TextField label="Arrivo" type="date" value={arriveDate} onInput={setArriveDate} />
        <TextField label="Ora arrivo" type="time" value={arriveTime} onInput={setArriveTime} />
      </div>
      <p class="-mt-2 text-xs text-muted">Orari nel fuso del viaggio ({trip.timezone}). Puoi lasciarli vuoti.</p>

      <CostFields
        amount={cost}
        currency={currency}
        scope={scope}
        onAmount={setCost}
        onCurrency={setCurrency}
        onScope={setScope}
      />
      <CheckField label="Biglietto già acquistato" checked={bought} onChange={setBought} />
      <TextField label="Codice prenotazione" value={refCode} onInput={setRefCode} />
      <TextArea label="Note" value={notes} onInput={setNotes} />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva trasporto' : 'Aggiungi trasporto'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina trasporto</SecondaryButton>}
    </form>
  )
}

