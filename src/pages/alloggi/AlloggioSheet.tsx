// Foglio «Nuovo alloggio» / «Modifica alloggio» (#39, #58), a gruppi: Dove (prima il link di Google Maps, che compila il
// resto), Quando (check-in → check-out con le notti), Costo, Camera e contatti, Altri dettagli (ospiti, telefono, email, chi dorme qui).
import { useConflitto } from '../../faraway/useConflitto'
import { DocumentiCollegati } from '../documenti/DocumentiCollegati'
import { useState, type ReactNode } from 'react'
import type { StayInput } from '../../lib/logistics'
import { amountToText, formatMoney, parseAmount, tripCurrencies } from '../../lib/money'
import { compilati, nottiTesto } from '../../lib/moduli'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Stay, Trip } from '../../types'
import { luogoDaAlloggio, luogoEsistente } from '../../lib/luogoAlloggio'
import { parseMapsUrl } from '../../lib/mapsUrl'
import { reverseGeocode } from '../../lib/geocode'
import { Campo, Chip, Interruttore, Pulsante } from '../../faraway/base'
import { CampoValuta } from '../../faraway/CampoValuta'
import { AltriDettagli, Contatore, Gruppo, PerChi, Percorso } from '../../faraway/Moduli'
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

/** Vuoto o «HH:MM»: si può scegliere con il selettore; i testi scritti a mano prima («17:00–22:00») restano un campo di testo. */
const soloOra = (v: string) => v === '' || /^\d{2}:\d{2}$/.test(v)

export function AlloggioSheet({ trip, stay: s, open, onClose }: Props) {
  const [procediConflitto, nodoConflitto] = useConflitto(trip, 'stays', s?.id)
  const tr = useTrips()
  const me = useMe(trip)
  const all = trip.travelers.map((p) => p.id)
  const [name, setName] = useState(s?.name ?? '')
  const [city, setCity] = useState(s?.city ?? '')
  const [address, setAddress] = useState(s?.address ?? '')
  const [mapsUrl, setMapsUrl] = useState(s?.mapsUrl ?? '')
  const [mapsInfo, setMapsInfo] = useState('')
  // incollando un link di Google Maps compilo nome, città e indirizzo (solo i campi ancora vuoti)
  async function leggiLink(v: string) {
    setMapsUrl(v)
    setMapsInfo('')
    const text = v.trim()
    if (!text) return
    if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl)\//i.test(text)) return setMapsInfo('Link corto: apri il link, copia quello completo dalla barra del browser e incollalo qui per compilare i campi.')
    const info = parseMapsUrl(text)
    if (!info) return
    if (info.name && !name.trim()) setName(info.name)
    if (city.trim() && address.trim()) return setMapsInfo('Link letto.')
    setMapsInfo('Leggo l’indirizzo…')
    try {
      const r = await reverseGeocode(info.lat, info.lng)
      if (!city.trim() && r.city) setCity(r.city)
      if (!address.trim() && r.address) setAddress(r.address)
      setMapsInfo(r.address || r.city ? 'Campi compilati dal link: controlla che siano giusti.' : 'Link letto, ma non trovo l’indirizzo: scrivilo a mano.')
    } catch {
      setMapsInfo('Link letto, ma non riesco a leggere l’indirizzo ora: scrivilo a mano.')
    }
  }
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
    // con il link di Maps l'alloggio diventa anche un luogo (categoria Alloggio): si vede in Luoghi e si aggiunge a un giorno
    const esistente = luogoEsistente(trip.places, s?.name, name)
    const luogo = luogoDaAlloggio({ name, city, address, mapsUrl }, esistente)
    if (luogo) await (esistente ? tr.updatePlace(esistente.id, trip.id, luogo) : tr.createPlace(trip.id, luogo))
    showToast(s ? 'Alloggio aggiornato' : 'Alloggio salvato')
    onClose()
  }

  const amountNow = parseAmount(cost)
  const altri = compilati([guests, phone, email, dorme])
  const puoiIncollare = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText
  async function incolla() {
    try {
      const v = (await navigator.clipboard.readText()).trim()
      if (!v) return showToast('Negli appunti non c’è niente da incollare.')
      await leggiLink(v)
    } catch {
      showToast('Non riesco a leggere gli appunti: incolla il link nel campo.')
    }
  }
  const ora = (label: string, v: string, set: (v: string) => void) => (
    <Campo label={label} icon="clock" type={soloOra(v) ? 'time' : 'text'} value={v} onChange={set} hint={soloOra(v) ? undefined : 'Scritto a mano: cancellalo per scegliere un orario.'} />
  )
  /** Data e ora affiancate; un orario scritto a mano («15:00–22:00») va sotto, a tutta larghezza, per leggersi intero. */
  const dataOra = (data: ReactNode, v: string, set: (v: string) => void) => (
    <div className="dt" style={soloOra(v) ? undefined : { gridTemplateColumns: 'minmax(0,1fr)' }}>
      {data}
      {ora('Ora', v, set)}
    </div>
  )
  const aTesta = amountNow && people.length > 1 ? `: ${formatMoney(Math.round((amountNow / people.length) * 100) / 100, currency)} a testa` : ''

  return (
    <Foglio
      open={open}
      full
      title={s ? 'Modifica alloggio' : 'Nuovo alloggio'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="alloggio-form" isLoading={busy}>
          {s ? 'Salva le modifiche' : 'Salva l’alloggio'}
        </Pulsante>
      }
    >
      <form id="alloggio-form" className="frm grp" onSubmit={submit} noValidate>
        <Gruppo titolo="Dove">
          <Campo
            label="Link di Google Maps"
            icon="link"
            type="url"
            value={mapsUrl}
            onChange={(v) => void leggiLink(v)}
            placeholder=""
            autoComplete="off"
            hint={mapsInfo || 'Incollalo e compilo da solo nome, città e indirizzo.'}
            trailing={
              puoiIncollare && !mapsUrl.trim() ? (
                <button type="button" className="fa-btn soft sm" style={{ height: 36, padding: '0 16px' }} onClick={() => void incolla()}>
                  Incolla
                </button>
              ) : undefined
            }
          />
          <Campo label="Nome" value={name} onChange={setName} placeholder="es. U-BELL Hotel" error={errors.name} />
          <div className="fa-2c">
            <Campo label="Città" icon="pin" value={city} onChange={setCity} placeholder="es. Kyoto" />
            <Campo label="Indirizzo" value={address} onChange={setAddress} placeholder="es. 1-2 Gion" />
          </div>
        </Gruppo>
        <Gruppo titolo="Quando">
          <Percorso
            durata={nottiTesto(checkIn, checkOut)}
            da={{
              titolo: 'Check-in',
              children: (
                dataOra(<Campo label="Data" type="date" icon="cal" value={checkIn} onChange={(v) => (setCheckIn(v), !checkOut || checkOut <= v ? setCheckOut('') : null)} />, inInfo, setInInfo)
              ),
            }}
            a={{
              titolo: 'Check-out',
              children: (
                dataOra(<Campo label="Data" type="date" icon="cal" value={checkOut} onChange={setCheckOut} min={checkIn || undefined} />, outInfo, setOutInfo)
              ),
            }}
          />
          {errors.when ? <Errore>{errors.when}</Errore> : null}
        </Gruppo>
        <Gruppo titolo="Costo">
          <PerChi trip={trip} meId={me?.id} value={people} onChange={setWho} />
          <div className="fa-2c">
            <Campo label="Costo" inputMode="decimal" value={cost} onChange={setCost} placeholder="es. 450,00" error={errors.cost} />
            <CampoValuta value={currency} onChange={setCurrency} valute={tripCurrencies(trip, s?.currency)} />
          </div>
          <span className="fa-help" style={{ marginTop: -8 }}>Per tutto il soggiorno{aTesta}.</span>
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
        </Gruppo>
        <Gruppo titolo="Camera e contatti">
          <div className="fa-2c">
            <Campo label="Tipo di camera" value={roomType} onChange={setRoomType} placeholder="es. Doppia" />
            <Campo label="Camera" value={room} onChange={setRoom} placeholder="es. 402" maxLength={10} />
          </div>
          <Campo label="Codice di prenotazione" value={code} onChange={(v) => setCode(v.toUpperCase())} autoComplete="off" placeholder="es. 4K7QX2" />
          <div className="fa-fld" role="group" aria-label="Pasti e servizi">
            Pasti e servizi
            <div className="fa-chips wrap">
              <Chip on={breakfast} onPress={() => setBreakfast(!breakfast)}>Colazione</Chip>
              <Chip on={dinner} onPress={() => setDinner(!dinner)}>Cena</Chip>
              <Chip on={kitchen} onPress={() => setKitchen(!kitchen)}>Cucina</Chip>
            </div>
          </div>
          <Campo label="Note" textarea value={notes} onChange={setNotes} placeholder="" />
        </Gruppo>
        <AltriDettagli pieni={altri} contenuto={trip.travelers.length > 1 ? 'Ospiti, telefono, email, chi dorme qui' : 'Ospiti, telefono, email'} errore={errors.email || errors.guests ? errors : undefined}>
          <Contatore label="Ospiti" value={guests.trim() && Number.isFinite(Number(guests)) ? Number(guests) : null} onChange={(n) => setGuests(n === null ? '' : String(n))} vuoto />
          {errors.guests ? <Errore>{errors.guests}</Errore> : null}
          <Campo label="Telefono" type="tel" value={phone} onChange={setPhone} placeholder="es. +81 75 123 4567" />
          <Campo label="Email" type="email" value={email} onChange={setEmail} placeholder="es. info@hotel.jp" error={errors.email} />
          {trip.travelers.length > 1 ? (
            <div className="fa-fld" role="group" aria-label="Chi dorme qui">
              Chi dorme qui
              <div className="fa-chips wrap">
                {trip.travelers.map((p) => (
                  <Chip key={p.id} on={dorme.includes(p.id)} onPress={() => setDorme(dorme.includes(p.id) ? dorme.filter((x) => x !== p.id) : [...dorme, p.id])}>{nome(p.id)}</Chip>
                ))}
              </div>
              <span className="fa-help">Solo informativo: non cambia la copertura delle notti.</span>
            </div>
          ) : null}
        </AltriDettagli>
        {s ? <DocumentiCollegati trip={trip} kind={'stay'} refId={s.id} /> : null}
        {errors.form ? <Errore>{errors.form}</Errore> : null}
      </form>
    {nodoConflitto}
    </Foglio>
  )
}
