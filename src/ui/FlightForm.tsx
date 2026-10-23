import { useState } from 'preact/hooks'
import { useConfirm } from './ConfirmDialog'
import { isIata, timezoneForAirport } from '../lib/airports'
import { defaultDepartureTz } from '../lib/origin'
import { legDuration } from '../lib/flights'
import { amountToText, parseAmount, tripCurrencies } from '../lib/money'
import { legToForm, type FlightInput, type LegInput } from '../lib/logistics'
import { isValidTimezone } from '../lib/tripForm'
import { isCompleteZoned, zonedToInstant } from '../lib/zoned'
import type { Flight, Trip } from '../types'
import { CheckField, CostFields, FormError, PrimaryButton, SecondaryButton, TextArea, TextField } from './Field'
import { Select } from './Select'
import { timezoneOptions } from '../lib/timezones'

interface Props {
  trip: Trip
  initial?: Flight
  onSubmit: (input: FlightInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

/** Tratta nel modulo: i fusi si precompilano dal codice aeroporto finché non li cambi a mano. */
interface LegDraft extends LegInput {
  key: number
  fromTzAuto: boolean
  toTzAuto: boolean
}

let keyCounter = 0
const emptyLeg = (date: string, fromTz = ''): LegDraft => ({
  key: ++keyCounter, flightNumber: '', from: '', to: '', departDate: date, departTime: '', arriveDate: date, arriveTime: '',
  fromTz, toTz: '', cabin: '', seats: '', notes: '', fromTzAuto: true, toTzAuto: true,
})

export function FlightForm({ trip, initial, onSubmit, onDelete, onDone }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [airline, setAirline] = useState(initial?.airline ?? '')
  const [bookingRef, setBookingRef] = useState(initial?.bookingRef ?? '')
  const [cost, setCost] = useState(amountToText(initial?.cost))
  const [currency, setCurrency] = useState(initial?.currency ?? trip.baseCurrency)
  const [scope, setScope] = useState<'per_person' | 'total'>(initial?.scope ?? 'per_person')
  const [paid, setPaid] = useState(initial?.paid ?? false)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [legs, setLegs] = useState<LegDraft[]>(
    initial && initial.legs.length > 0
      ? initial.legs.map((l) => ({ ...legToForm(l), key: ++keyCounter, fromTzAuto: false, toTzAuto: false }))
      : [emptyLeg(trip.startDate, defaultDepartureTz(trip))], // il fuso di partenza si propone dal paese di casa; un aeroporto riconosciuto lo corregge
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function patchLeg(key: number, patch: Partial<LegDraft>) {
    setLegs((all) => all.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function setAirport(leg: LegDraft, side: 'from' | 'to', raw: string) {
    const code = raw.toUpperCase().slice(0, 3)
    const tz = isIata(code) ? timezoneForAirport(code) : undefined
    if (side === 'from') patchLeg(leg.key, { from: code, ...(tz && leg.fromTzAuto ? { fromTz: tz } : {}) })
    else patchLeg(leg.key, { to: code, ...(tz && leg.toTzAuto ? { toTz: tz } : {}) })
  }

  function addLeg() {
    const last = legs[legs.length - 1]
    const next = emptyLeg(last?.arriveDate || trip.startDate)
    if (last) {
      next.from = last.to // lo scalo parte da dove si è atterrati
      next.fromTz = last.toTz
      next.departDate = last.arriveDate
    }
    setLegs([...legs, next])
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!title.trim()) return setError('Dai un nome al volo (es. Andata).')
    const amount = parseAmount(cost)
    if (cost.trim() && amount === null) return setError('Il costo non è un numero valido.')
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) return setError('La valuta è un codice di 3 lettere (es. EUR).')
    if (legs.length === 0) return setError('Aggiungi almeno una tratta.')
    for (const [i, l] of legs.entries()) {
      const n = `Tratta ${i + 1}: `
      if (!isIata(l.from) || !isIata(l.to)) return setError(`${n}scrivi i codici aeroporto di 3 lettere (es. MXP).`)
      if (!isValidTimezone(l.fromTz) || !isValidTimezone(l.toTz))
        return setError(`${n}il fuso orario non è valido (es. Europe/Rome, Asia/Tokyo).`)
      if (!isCompleteZoned(l.departDate, l.departTime) || !isCompleteZoned(l.arriveDate, l.arriveTime))
        return setError(`${n}inserisci data e ora di partenza e di arrivo.`)
      const dep = zonedToInstant(l.departDate, l.departTime, l.fromTz)
      const arr = zonedToInstant(l.arriveDate, l.arriveTime, l.toTz)
      if (legDuration({ depart: dep, arrive: arr }) <= 0)
        return setError(`${n}l'arrivo è prima della partenza (controlla date e fusi).`)
    }
    setBusy(true)
    setError(null)
    const message = await onSubmit({
      title, airline, bookingRef, cost: amount, currency, scope, paid, notes,
      legs: legs.map(({ key: _k, fromTzAuto: _a, toTzAuto: _b, ...l }) => l),
    })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  const [confirm, confirmDialog] = useConfirm()

  async function remove() {
    if (!onDelete) return
    if (!(await confirm({ title: 'Eliminare questo volo?', text: 'Puoi annullare subito dopo.' }))) return
    setBusy(true)
    const message = await onDelete()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  const tzOptions = timezoneOptions(trip.timezone)

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <TextField label="Nome del volo" value={title} onInput={setTitle} placeholder="Andata" maxLength={60} />
      <div class="grid grid-cols-2 gap-3">
        <TextField label="Compagnia" value={airline} onInput={setAirline} />
        <TextField label="Codice prenotazione" value={bookingRef} onInput={setBookingRef} autoComplete="off" />
      </div>

      <div class="space-y-3">
        {legs.map((l, i) => (
          <fieldset key={l.key} class="space-y-3 rounded-2xl border-2 border-line p-3">
            <legend class="px-1 text-sm font-extrabold">Tratta {i + 1}</legend>
            <div class="grid grid-cols-3 gap-3">
              <TextField label="Da" value={l.from} onInput={(v) => setAirport(l, 'from', v)} placeholder="MXP" autoComplete="off" />
              <TextField label="A" value={l.to} onInput={(v) => setAirport(l, 'to', v)} placeholder="PEK" autoComplete="off" />
              <TextField label="N. volo" value={l.flightNumber} onInput={(v) => patchLeg(l.key, { flightNumber: v.toUpperCase() })} autoComplete="off" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <TextField
                label="Data partenza"
                type="date"
                value={l.departDate}
                onInput={(v) => patchLeg(l.key, { departDate: v, ...(v && l.arriveDate && l.arriveDate < v ? { arriveDate: v } : {}) })}
              />
              <TextField label="Ora partenza" type="time" value={l.departTime} onInput={(v) => patchLeg(l.key, { departTime: v })} />
              <TextField label="Data arrivo" type="date" value={l.arriveDate} onInput={(v) => patchLeg(l.key, { arriveDate: v })} min={l.departDate || undefined} />
              <TextField
                label="Ora arrivo"
                type="time"
                value={l.arriveTime}
                onInput={(v) => patchLeg(l.key, { arriveTime: v })}
                // con fusi diversi l'ora locale d'arrivo può essere prima di quella di partenza: il limite vale solo con lo stesso fuso
                min={l.arriveDate && l.arriveDate === l.departDate && l.fromTz === l.toTz ? l.departTime || undefined : undefined}
              />
            </div>
            <p class="-mt-1 text-xs text-muted">Ogni orario è quello locale dell'aeroporto indicato.</p>
            <div class="grid grid-cols-2 gap-3">
              <Select label="Fuso partenza" value={l.fromTz} creatable options={tzOptions} onChange={(v) => patchLeg(l.key, { fromTz: v, fromTzAuto: false })} />
              <Select label="Fuso arrivo" value={l.toTz} creatable options={tzOptions} onChange={(v) => patchLeg(l.key, { toTz: v, toTzAuto: false })} />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <TextField label="Posti" value={l.seats} onInput={(v) => patchLeg(l.key, { seats: v })} />
              <TextField label="Classe" value={l.cabin} onInput={(v) => patchLeg(l.key, { cabin: v })} />
            </div>
            {legs.length > 1 && (
              <button
                type="button"
                onClick={() => setLegs(legs.filter((x) => x.key !== l.key))}
                class="min-h-11 text-sm font-extrabold text-danger"
              >
                Rimuovi tratta
              </button>
            )}
          </fieldset>
        ))}
        <SecondaryButton onClick={addLeg}>+ Aggiungi tratta (scalo)</SecondaryButton>
      </div>

      <CostFields amount={cost} currency={currency} currencies={tripCurrencies(trip, initial?.currency)} scope={scope} onAmount={setCost} onCurrency={setCurrency} onScope={setScope} />
      <CheckField label="Già pagato" checked={paid} onChange={setPaid} />
      <TextArea label="Note" value={notes} onInput={setNotes} />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva volo' : 'Aggiungi volo'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina volo</SecondaryButton>}
    {confirmDialog}
    </form>
  )
}
