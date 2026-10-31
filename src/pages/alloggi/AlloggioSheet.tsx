// Foglio «Nuovo alloggio» / «Modifica alloggio» (#39, #58): nome, città, indirizzo, date e orari, camera, codice,
// costo con «Pagato / Non pagato», «Pagato da», «Per chi», pasti e note.
import { useConflitto } from '../../faraway/useConflitto'
import { DocumentiCollegati } from '../documenti/DocumentiCollegati'
import { useState } from 'react'
import type { StayInput } from '../../lib/logistics'
import { amountToText, parseAmount, tripCurrencies } from '../../lib/money'
import { discOf, initials, useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Stay, Trip } from '../../types'
import { Campo, Chip, Interruttore, Pulsante } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'

const Errore = ({ children }: { children: string }) => (
  <span className="fa-help bad" role="alert">
    <Sv name="err" size={16} />
    {children}
  </span>
)

interface Props {
  trip: Trip
  stay?: Stay
  open: boolean
  onClose: () => void
}

export function AlloggioSheet({ trip, stay: s, open, onClose }: Props) {
  const [procediConflitto, nodoConflitto] = useConflitto(trip, 'stays', s?.id)
  const tr = useTrips()
  const me = useMe(trip)
  const all = trip.travelers.map((p) => p.id)
  const [name, setName] = useState(s?.name ?? '')
  const [city, setCity] = useState(s?.city ?? '')
  const [address, setAddress] = useState(s?.address ?? '')
  const [mapsUrl, setMapsUrl] = useState(s?.mapsUrl ?? '')
  const [checkIn, setCheckIn] = useState(s?.checkIn ?? trip.startDate)
  const [checkOut, setCheckOut] = useState(s?.checkOut ?? '')
  const [inInfo, setInInfo] = useState(s?.checkInInfo ?? '')
  const [outInfo, setOutInfo] = useState(s?.checkOutInfo ?? '')
  const [room, setRoom] = useState(s?.room ?? '')
  const [roomType, setRoomType] = useState(s?.roomType ?? '')
  const [guests, setGuests] = useState(s?.guests ? String(s.guests) : '')
  const [phone, setPhone] = useState(s?.phone ?? '')
  const [email, setEmail] = useState(s?.email ?? '')
  const [dorme, setDorme] = useState<string[]>(s?.participants ?? [])
  const [code, setCode] = useState(s?.bookingCode ?? '')
  const [cost, setCost] = useState(amountToText(s?.totalCost))
  const [currency, setCurrency] = useState(s?.currency ?? trip.localCurrency ?? trip.baseCurrency)
  const [paid, setPaid] = useState(s?.paid ?? false)
  const [paidBy, setPaidBy] = useState(s?.paidBy ?? (s ? '' : (me?.id ?? (all.length === 1 ? all[0] : ''))))
  const [who, setWho] = useState<string[]>(s?.forTravelers?.length ? s.forTravelers : all)
  const [breakfast, setBreakfast] = useState(s?.breakfast ?? false)
  const [dinner, setDinner] = useState(s?.dinner ?? false)
  const [kitchen, setKitchen] = useState(s?.kitchen ?? false)
  const [notes, setNotes] = useState(s?.notes ?? '')
  const [errors, setErrors] = useState<{ guests?: string; email?: string; name?: string; when?: string; cost?: string; paidBy?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const people = who.length === 0 ? all : who
  const nome = (id: string) => trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!name.trim()) err.name = 'Scrivi il nome dell’alloggio.'
    if (!checkIn || !checkOut) err.when = 'Scegli le date di check-in e di check-out.'
    else if (checkOut <= checkIn) err.when = 'Il check-out deve essere dopo il check-in.'
    const amount = parseAmount(cost)
    if (cost.trim() && amount === null) err.cost = 'Il costo non è chiaro: scrivi per esempio 450,00.'
    if (paid && amount && !paidBy) err.paidBy = 'Manca chi ha pagato. Scegli una persona.'
    const ospiti = guests.trim() ? Number(guests) : null
    if (ospiti !== null && (!Number.isInteger(ospiti) || ospiti < 1 || ospiti > 99)) err.guests = 'Scrivi quanti ospiti, per esempio 2.'
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) err.email = 'L’email non è valida: controlla la chiocciola e il dominio.'
    setErrors(err)
    if (Object.keys(err).length > 0) return
    const input: StayInput = {
      name, city, checkIn, checkOut, checkInInfo: inInfo, checkOutInfo: outInfo, address, mapsUrl,
      totalCost: amount, currency, breakfast, dinner, kitchen, booked: true, paid, notes,
      room, roomType, bookingCode: code, guests: ospiti, phone, email, participants: dorme,
      paidBy: paid && amount ? paidBy || undefined : (s?.paidBy ?? undefined),
      forTravelers: all.every((id) => people.includes(id)) ? [] : people,
    }
    if (!(await procediConflitto())) return
    setBusy(true)
    const message = s ? await tr.updateStay(s.id, input, s) : await tr.createStay(trip.id, input)
    setBusy(false)
    if (message) return setErrors({ form: message })
    showToast(s ? 'Alloggio aggiornato' : 'Alloggio salvato')
    onClose()
  }

  return (
    <Foglio
      open={open}
      full
      title={s ? 'Modifica alloggio' : 'Nuovo alloggio'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="alloggio-form" isLoading={busy}>
          {busy ? 'Salvataggio…' : s ? 'Salva le modifiche' : 'Salva l’alloggio'}
        </Pulsante>
      }
    >
      <form id="alloggio-form" className="frm" onSubmit={submit} noValidate>
        <Campo label="Nome" value={name} onChange={setName} placeholder="es. Ryokan Sakura" error={errors.name} />
        <div className="fa-2c">
          <Campo label="Città" icon="pin" value={city} onChange={setCity} placeholder="Kyoto" />
          <Campo label="Indirizzo" value={address} onChange={setAddress} placeholder="Via, numero" />
        </div>
        <Campo label="Link alla mappa (facoltativo)" type="url" value={mapsUrl} onChange={setMapsUrl} placeholder="https://maps.app.goo.gl/…" />
        <div className="fa-2c">
          <Campo label="Check-in, data" type="date" icon="cal" value={checkIn} onChange={(v) => (setCheckIn(v), !checkOut || checkOut <= v ? setCheckOut('') : null)} />
          <Campo label="Check-in, orario" value={inInfo} onChange={setInInfo} placeholder="15:00" />
          <Campo label="Check-out, data" type="date" icon="cal" value={checkOut} onChange={setCheckOut} min={checkIn || undefined} />
          <Campo label="Check-out, orario" value={outInfo} onChange={setOutInfo} placeholder="11:00" />
        </div>
        {errors.when ? <Errore>{errors.when}</Errore> : null}
        <div className="fa-2c">
          <Campo label="Camera" value={room} onChange={setRoom} placeholder="4" maxLength={10} />
          <Campo label="Tipo di camera" value={roomType} onChange={setRoomType} placeholder="Washitsu" />
          <Campo label="Ospiti" inputMode="numeric" value={guests} onChange={setGuests} placeholder="2" error={errors.guests} />
          <Campo label="Telefono" type="tel" value={phone} onChange={setPhone} placeholder="+81 75 …" />
          <Campo label="Email" type="email" value={email} onChange={setEmail} placeholder="info@…" error={errors.email} />
        </div>
        <Campo label="Codice di prenotazione" value={code} onChange={(v) => setCode(v.toUpperCase())} autoComplete="off" />
        <div className="fa-2c">
          <Campo label="Costo totale" inputMode="decimal" value={cost} onChange={setCost} placeholder="es. 450,00" error={errors.cost} />
          <div className="fa-fld">
            <label htmlFor="al-val">Valuta</label>
            <span className="fa-in">
              <input id="al-val" list="al-valute" value={currency} onChange={(e) => setCurrency(e.currentTarget.value.toUpperCase().slice(0, 3))} maxLength={3} />
            </span>
          </div>
        </div>
        <Interruttore label="Pagato" hint={paid ? 'Con un costo, l’alloggio diventa una spesa.' : 'Non pagato'} isSelected={paid} onChange={setPaid} />
        {paid && cost.trim() ? (
          <div className="fa-fld" role="group" aria-label="Pagato da">
            Pagato da
            <div className="fa-chips wrap">
              {trip.travelers.map((p) => (
                <Chip key={p.id} on={paidBy === p.id} onPress={() => setPaidBy(p.id)}>{nome(p.id)}</Chip>
              ))}
            </div>
            {errors.paidBy ? <Errore>{errors.paidBy}</Errore> : null}
          </div>
        ) : null}
        {trip.travelers.length > 1 ? (
          <div className="fa-fld" role="group" aria-label="Per chi">
            Per chi
            <div className="fa-chips wrap">
              {trip.travelers.map((p) => (
                <Chip key={p.id} on={people.includes(p.id)} onPress={() => setWho(people.includes(p.id) ? people.filter((x) => x !== p.id) : [...people, p.id])}
                  icon={<span className={cx('fa-av', `r${discOf(trip, p.id)}`)} style={{ width: 24, height: 24, fontSize: 11 }} aria-hidden="true">{initials(p.name)}</span>}>
                  {nome(p.id)}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        {trip.travelers.length > 1 ? (
          <div className="fa-fld" role="group" aria-label="Chi dorme qui">
            Chi dorme qui (facoltativo)
            <div className="fa-chips wrap">
              {trip.travelers.map((p) => (
                <Chip key={p.id} on={dorme.includes(p.id)} onPress={() => setDorme(dorme.includes(p.id) ? dorme.filter((x) => x !== p.id) : [...dorme, p.id])}>{nome(p.id)}</Chip>
              ))}
            </div>
            <span className="fa-help">Solo informativo: non cambia la copertura delle notti.</span>
          </div>
        ) : null}
        <div className="fa-fld" role="group" aria-label="Pasti e servizi">
          Pasti e servizi
          <div className="fa-chips wrap">
            <Chip on={breakfast} onPress={() => setBreakfast(!breakfast)}>Colazione</Chip>
            <Chip on={dinner} onPress={() => setDinner(!dinner)}>Cena</Chip>
            <Chip on={kitchen} onPress={() => setKitchen(!kitchen)}>Cucina</Chip>
          </div>
        </div>
        <Campo label="Nota" textarea value={notes} onChange={setNotes} />
        {s ? <DocumentiCollegati trip={trip} kind={'stay'} refId={s.id} /> : null}
        {errors.form ? <Errore>{errors.form}</Errore> : null}
        <datalist id="al-valute">{tripCurrencies(trip, s?.currency).map((c) => <option key={c} value={c} />)}</datalist>
      </form>
    {nodoConflitto}
    </Foglio>
  )
}
