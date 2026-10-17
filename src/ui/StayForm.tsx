import { useState } from 'preact/hooks'
import { amountToText, parseAmount } from '../lib/money'
import type { StayInput } from '../lib/logistics'
import type { Stay, Trip } from '../types'
import { CheckField, CostFields, FormError, PrimaryButton, SecondaryButton, TextArea, TextField } from './Field'
import { uniqueCities } from './placeMeta'

interface Props {
  trip: Trip
  initial?: Stay
  onSubmit: (input: StayInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

export function StayForm({ trip, initial, onSubmit, onDelete, onDone }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? trip.startDate)
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? trip.startDate)
  const [checkInInfo, setCheckInInfo] = useState(initial?.checkInInfo ?? '')
  const [checkOutInfo, setCheckOutInfo] = useState(initial?.checkOutInfo ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [mapsUrl, setMapsUrl] = useState(initial?.mapsUrl ?? '')
  const [cost, setCost] = useState(amountToText(initial?.totalCost))
  const [currency, setCurrency] = useState(initial?.currency ?? trip.baseCurrency)
  const [breakfast, setBreakfast] = useState(initial?.breakfast ?? false)
  const [kitchen, setKitchen] = useState(initial?.kitchen ?? false)
  const [booked, setBooked] = useState(initial?.booked ?? false)
  const [paid, setPaid] = useState(initial?.paid ?? false)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const cities = Array.from(new Set([...trip.days.map((d) => d.city).filter(Boolean), ...uniqueCities(trip.places)]))

  async function submit(e: Event) {
    e.preventDefault()
    if (!name.trim()) return setError("Scrivi il nome dell'alloggio.")
    if (!checkIn || !checkOut) return setError('Scegli le date di check-in e check-out.')
    if (checkOut < checkIn) return setError('Il check-out non può essere prima del check-in.')
    const totalCost = parseAmount(cost)
    if (cost.trim() && totalCost === null) return setError('Il costo non è un numero valido.')
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) return setError('La valuta è un codice di 3 lettere (es. EUR).')
    setBusy(true)
    setError(null)
    const message = await onSubmit({
      name, city, checkIn, checkOut, checkInInfo, checkOutInfo, address, mapsUrl,
      totalCost, currency, breakfast, kitchen, booked, paid, notes,
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
      <TextField label="Nome" value={name} onInput={setName} maxLength={120} />
      <TextField label="Città" value={city} onInput={setCity} list="stay-cities" />
      <datalist id="stay-cities">{cities.map((c) => <option value={c} />)}</datalist>

      <div class="grid grid-cols-2 gap-3">
        <TextField label="Check-in" type="date" value={checkIn} onInput={setCheckIn} />
        <TextField label="Check-out" type="date" value={checkOut} onInput={setCheckOut} />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <TextField label="Orario check-in" value={checkInInfo} onInput={setCheckInInfo} placeholder="17:00–22:00" />
        <TextField label="Orario check-out" value={checkOutInfo} onInput={setCheckOutInfo} placeholder="entro 10:30" />
      </div>

      <CostFields
        amountLabel="Costo totale (tutti i viaggiatori)"
        amount={cost}
        currency={currency}
        scope="total"
        onAmount={setCost}
        onCurrency={setCurrency}
        onScope={() => {}}
        withScope={false}
      />

      <div class="grid grid-cols-2 gap-x-3">
        <CheckField label="Colazione" checked={breakfast} onChange={setBreakfast} />
        <CheckField label="Cucina" checked={kitchen} onChange={setKitchen} />
        <CheckField label="Prenotato" checked={booked} onChange={setBooked} />
        <CheckField label="Pagato" checked={paid} onChange={setPaid} />
      </div>

      <TextField label="Indirizzo" value={address} onInput={setAddress} />
      <TextField label="Link Google Maps" value={mapsUrl} onInput={setMapsUrl} placeholder="https://maps.google.com/…" />
      <TextArea label="Note" value={notes} onInput={setNotes} />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva alloggio' : 'Aggiungi alloggio'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina alloggio</SecondaryButton>}
    </form>
  )
}
