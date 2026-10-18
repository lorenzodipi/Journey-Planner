import { useState } from 'preact/hooks'
import { useConfirm } from './ConfirmDialog'
import { amountToText, parseAmount } from '../lib/money'
import { transportToForm, type TransportInput } from '../lib/logistics'
import { isShortMapsLink, parseDirectionsUrl } from '../lib/mapsUrl'
import { isCompleteZoned, zonedToInstant } from '../lib/zoned'
import type { Transport, TransportMode, Trip } from '../types'
import { PointSearch, type Point } from './PointSearch'
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
  /** Data di partenza per un trasporto nuovo (es. dalla pagina di un giorno). */
  defaults?: { departDate?: string }
  onSubmit: (input: TransportInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

export function TransportForm({ trip, initial, defaults, onSubmit, onDelete, onDone }: Props) {
  const times = initial ? transportToForm(initial, trip.timezone) : { departDate: defaults?.departDate ?? trip.startDate, departTime: '', arriveDate: '', arriveTime: '' }
  const [from, setFrom] = useState(initial?.from ?? '')
  const [to, setTo] = useState(initial?.to ?? '')
  const [mode, setMode] = useState<TransportMode>(initial?.mode ?? 'train')
  const [fromPos, setFromPos] = useState<Point | null>(initial?.fromLat != null && initial?.fromLng != null ? { lat: initial.fromLat, lng: initial.fromLng } : null)
  const [toPos, setToPos] = useState<Point | null>(initial?.toLat != null && initial?.toLng != null ? { lat: initial.toLat, lng: initial.toLng } : null)
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
  const [dirLink, setDirLink] = useState('')
  const [dirHint, setDirHint] = useState<{ ok: boolean; text: string } | null>(null)

  function onDirectionsLink(value: string) {
    setDirLink(value)
    if (!value.trim()) return setDirHint(null)
    if (isShortMapsLink(value)) {
      return setDirHint({
        ok: false,
        text: 'È un link corto: il sito non può aprirlo da solo. Aprilo in Google Maps (o nel browser), copia l\'indirizzo lungo dalla barra e incollalo qui.',
      })
    }
    const info = parseDirectionsUrl(value)
    if (!info) {
      return setDirHint({
        ok: false,
        text: 'Questo non sembra un link di indicazioni (di solito contiene «/maps/dir/»). Per un singolo luogo usa «Posizione sulla mappa» qui sotto.',
      })
    }
    if (info.from.name) setFrom(info.from.name)
    if (info.to.name) setTo(info.to.name)
    if (info.mode) setMode(info.mode)
    if (info.from.lat != null && info.from.lng != null) setFromPos({ lat: Number(info.from.lat.toFixed(6)), lng: Number(info.from.lng.toFixed(6)) })
    if (info.to.lat != null && info.to.lng != null) setToPos({ lat: Number(info.to.lat.toFixed(6)), lng: Number(info.to.lng.toFixed(6)) })
    const notes: string[] = []
    if (!info.from.name || !info.to.name) notes.push('i nomi non erano nel link: scrivili in «Da» e «A»')
    if (info.from.lat == null || info.to.lat == null) notes.push('le posizioni non erano nel link: impostale in «Posizione sulla mappa»')
    if (!info.mode) notes.push('il mezzo non era nel link: sceglilo tu')
    setDirHint({
      ok: true,
      text: `Letto: ${info.from.name || '?'} → ${info.to.name || '?'}${info.mode ? ` · ${MODE_LABEL[info.mode]}` : ''}.${notes.length ? ` Attenzione: ${notes.join('; ')}.` : ''} Il link non contiene il percorso del treno: sulla mappa si vede una linea tra i due punti.`,
    })
  }

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
      from, to, mode, fromPos, toPos, departDate, departTime, arriveDate, arriveTime, cost: amount, currency, scope, bought, refCode, notes,
    })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  const [confirm, confirmDialog] = useConfirm()

  async function remove() {
    if (!onDelete) return
    if (!(await confirm({ title: 'Eliminare questo trasporto?', text: 'Puoi annullare subito dopo.' }))) return
    setBusy(true)
    const message = await onDelete()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Compila da un link di Google Maps</span>
        <input
          type="url"
          value={dirLink}
          placeholder="https://www.google.com/maps/dir/…"
          aria-label="Link di Google Maps con le indicazioni"
          onInput={(e) => onDirectionsLink((e.currentTarget as HTMLInputElement).value)}
          class="min-h-12 w-full rounded-2xl border border-line bg-bg px-4"
        />
        <span class={`mt-1 block text-xs ${dirHint && !dirHint.ok ? 'text-danger' : 'text-muted'}`} role={dirHint && !dirHint.ok ? 'alert' : 'status'}>
          {dirHint?.text ?? 'Facoltativo: incolla le indicazioni da Google Maps e compilo partenza, arrivo, posizioni e mezzo.'}
        </span>
      </label>
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

      <details class="rounded-2xl border border-line px-3 py-2" open={fromPos != null || toPos != null}>
        <summary class="min-h-11 cursor-pointer py-2 text-sm font-medium">Posizione sulla mappa (facoltativa)</summary>
        <div class="space-y-3 pb-2">
          <p class="text-xs text-muted">
            Serve per disegnare il tragitto sulla mappa del giorno (es. lo shinkansen da Tokyo Station a Kyoto Station).
          </p>
          <PointSearch label="Partenza" fallbackQuery={from} near={trip.center} value={fromPos} onChange={setFromPos} />
          <PointSearch label="Arrivo" fallbackQuery={to} near={trip.center} value={toPos} onChange={setToPos} />
        </div>
      </details>

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
    {confirmDialog}
    </form>
  )
}

