import { useState } from 'react'
import { useConfirm } from './ConfirmDialog'
import { BOOKING_BUDGET_CATEGORY, BOOKING_LABEL, BOOKING_TYPES } from '../lib/bookingMeta'
import { checkFile } from '../lib/bookingFiles'
import { shareAmounts } from '../lib/budget'
import { dateInZone } from '../lib/flights'
import { amountToText, formatMoney, parseAmount, tripCurrencies } from '../lib/money'
import { safeUrl, type BookingInput } from '../lib/planningData'
import type { Booking, Trip } from '../types'
import { CheckField, ChipSelect, CostFields, FormError, PrimaryButton, SecondaryButton, TextArea, TextField } from './Field'
import { TravelerChips } from './TravelerChips'

interface Props {
  trip: Trip
  initial?: Booking
  onSubmit: (input: BookingInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

export function BookingForm({ trip, initial, onSubmit, onDelete, onDone }: Props) {
  const tz = trip.timezone
  const [type, setType] = useState(initial?.type ?? 'other')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [validFrom, setValidFrom] = useState(initial?.validFrom ? dateInZone(initial.validFrom, tz) : '')
  const [validTo, setValidTo] = useState(initial?.validTo ? dateInZone(initial.validTo, tz) : '')
  // «Fino al» non può essere prima di «Valido dal»
  function onValidFrom(v: string) {
    setValidFrom(v)
    if (v && validTo && validTo < v) setValidTo(v)
  }
  const [keepOffline, setKeepOffline] = useState(initial?.keepOffline ?? true)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [cost, setCost] = useState(amountToText(initial?.cost))
  const [currency, setCurrency] = useState(initial?.currency ?? trip.baseCurrency)
  const [scope, setScope] = useState<'per_person' | 'total'>(initial?.scope ?? 'per_person')
  const everyone = trip.travelers.map((p) => p.id)
  // chi ha pagato: senza una scelta salvata (vecchie prenotazioni, nuove) sono tutti
  const [payers, setPayers] = useState<string[]>(initial?.payerIds?.length ? initial.payerIds.filter((id) => everyone.includes(id)) : everyone)
  const [file, setFile] = useState<File | null>(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hasFile = !!initial?.filePath && !removeFile

  function pickFile(f: File | null) {
    if (f) {
      const problem = checkFile(f)
      if (problem) {
        setError(problem)
        return
      }
    }
    setError(null)
    setFile(f)
  }

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!title.trim()) return setError('Scrivi il nome della prenotazione (es. Shinkansen Tokyo–Kyoto).')
    if (url.trim() && !safeUrl(url)) return setError('Il link non è valido: deve iniziare con http o https.')
    if (validFrom && validTo && validTo < validFrom) return setError('La data di fine è prima di quella di inizio.')
    const amount = parseAmount(cost)
    if (cost.trim() && amount === null) return setError('Il costo non è un numero valido.')
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) return setError('La valuta è un codice di 3 lettere (es. EUR).')
    if (amount !== null && everyone.length > 0 && payers.length === 0) return setError('Scegli chi ha pagato il costo.')
    setBusy(true)
    setError(null)
    const message = await onSubmit({ type, title, code, url, validFrom, validTo, keepOffline, notes, cost: amount, currency, scope, payerIds: amount !== null ? payers : [], file, removeFile })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  const [confirm, confirmDialog] = useConfirm()

  async function remove() {
    if (!onDelete) return
    if (!(await confirm({ title: 'Eliminare questa prenotazione?', text: 'Puoi annullare subito dopo.' }))) return
    setBusy(true)
    const message = await onDelete()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <ChipSelect label="Tipo" value={type} onChange={setType} options={BOOKING_TYPES.map((x) => ({ value: x, label: BOOKING_LABEL[x] }))} />
      <TextField label="Nome" value={title} onChange={setTitle} maxLength={120} />
      <TextField label="Codice di conferma" value={code} onChange={setCode} autoComplete="off" maxLength={80} />
      <TextField label="Link (sito di prenotazione, check-in…)" value={url} onChange={setUrl} placeholder="https://…" autoComplete="off" />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Valido dal" type="date" value={validFrom} onChange={onValidFrom} optional />
        <TextField label="Fino al" type="date" value={validTo} onChange={setValidTo} min={validFrom || undefined} optional />
      </div>

      <CostFields
        amountLabel="Costo (facoltativo)"
        amount={cost}
        currency={currency}
        currencies={tripCurrencies(trip, initial?.currency)}
        scope={scope}
        onAmount={setCost}
        onCurrency={setCurrency}
        onScope={setScope}
      />
      {parseAmount(cost) !== null && everyone.length > 0 && (
        <TravelerChips
          label="Chi lo ha pagato"
          travelers={trip.travelers}
          selected={payers}
          onChange={setPayers}
          hint={
            payers.length > 0
              ? `${scope === 'per_person' ? `Ognuno ha pagato ${formatMoney(shareAmounts({ amount: parseAmount(cost) as number, scope }, payers.length)[0], currency.toUpperCase())}` : `Diviso in parti uguali: ${formatMoney(shareAmounts({ amount: parseAmount(cost) as number, scope }, payers.length)[0], currency.toUpperCase())} a testa`}. Finisce nelle Spese, in «${BOOKING_BUDGET_CATEGORY[type]}».`
              : undefined
          }
        />
      )}

      <fieldset className="space-y-2 rounded-2xl bg-bg p-3">
        <legend className="sr-only">File</legend>
        <p className="text-sm font-extrabold">File (PDF o immagine, max 10 MB)</p>
        {hasFile && !file && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted">File già caricato</span>
            <button type="button" onClick={() => setRemoveFile(true)} className="min-h-11 rounded-full px-3 font-extrabold text-danger">
              Rimuovi
            </button>
          </div>
        )}
        {removeFile && !file && (
          <p className="text-sm text-muted">
            Il file verrà rimosso al salvataggio.{' '}
            <button type="button" onClick={() => setRemoveFile(false)} className="font-extrabold text-accent">Annulla</button>
          </p>
        )}
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => pickFile(e.currentTarget.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border-2 file:border-line file:bg-surface file:px-4 file:font-extrabold"
        />
        {file && <p className="text-xs text-muted">{hasFile ? 'Sostituirà il file attuale: ' : ''}{file.name}</p>}
        <CheckField label="Disponibile offline sul telefono" checked={keepOffline} onChange={setKeepOffline} />
      </fieldset>

      <TextArea label="Note" value={notes} onChange={setNotes} placeholder="Posto, orario, istruzioni per il ritiro…" />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva' : 'Aggiungi'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina prenotazione</SecondaryButton>}
    {confirmDialog}
    </form>
  )
}
