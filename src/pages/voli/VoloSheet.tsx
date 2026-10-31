// Foglio «Nuovo volo» / «Modifica volo» (#36, #58): compagnia, prenotazione, tratte con terminal, gate, imbarco e posti,
// chi vola, costo con «Pagato / Non pagato» e «Pagato da», bagaglio, politiche e apertura del check-in.
import { DocumentiCollegati } from '../documenti/DocumentiCollegati'
import { useState } from 'react'
import { isIata, timezoneForAirport } from '../../lib/airports'
import { legDuration } from '../../lib/flights'
import { legToForm, type FlightInput, type LegInput } from '../../lib/logistics'
import { amountToText, parseAmount, tripCurrencies } from '../../lib/money'
import { defaultDepartureTz } from '../../lib/origin'
import { timezoneOptions } from '../../lib/timezones'
import { isValidTimezone } from '../../lib/tripForm'
import { instantToZoned, isCompleteZoned, zonedToInstant } from '../../lib/zoned'
import { discOf, initials, useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Flight, Trip } from '../../types'
import { Campo, Chip, Interruttore, Pulsante } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'

interface LegDraft extends LegInput {
  key: number
  fromTzAuto: boolean
  toTzAuto: boolean
}
let keyCounter = 0
const emptyLeg = (date: string, fromTz = ''): LegDraft => ({
  key: ++keyCounter, flightNumber: '', from: '', to: '', departDate: date, departTime: '', arriveDate: date, arriveTime: '',
  fromTz, toTz: '', cabin: '', seats: '', notes: '', terminal: '', gate: '', boardingTime: '', seatsBy: {}, fromTzAuto: true, toTzAuto: true,
})

const Errore = ({ children }: { children: string }) => (
  <span className="fa-help bad" role="alert">
    <Sv name="err" size={16} />
    {children}
  </span>
)

interface Props {
  trip: Trip
  flight?: Flight
  open: boolean
  onClose: () => void
}

export function VoloSheet({ trip, flight, open, onClose }: Props) {
  const t = useTrips()
  const me = useMe(trip)
  const all = trip.travelers.map((p) => p.id)
  const [title, setTitle] = useState(flight?.title ?? '')
  const [airline, setAirline] = useState(flight?.airline ?? '')
  const [bookingRef, setBookingRef] = useState(flight?.bookingRef ?? '')
  const [cost, setCost] = useState(amountToText(flight?.cost))
  const [currency, setCurrency] = useState(flight?.currency ?? trip.baseCurrency)
  const [scope, setScope] = useState<'per_person' | 'total'>(flight?.scope ?? 'per_person')
  const [paid, setPaid] = useState(flight?.paid ?? false)
  const [paidBy, setPaidBy] = useState(flight?.paidBy ?? (flight ? '' : (me?.id ?? (all.length === 1 ? all[0] : ''))))
  const [who, setWho] = useState<string[]>(flight?.forTravelers?.length ? flight.forTravelers : all)
  const [baggage, setBaggage] = useState(flight?.baggage ?? '')
  const [policy, setPolicy] = useState(flight?.policy ?? '')
  const firstTz = flight?.legs[0]?.fromTz
  const [checkin, setCheckin] = useState(() => {
    if (!flight?.checkinAt || !firstTz) return { date: '', time: '' }
    return instantToZoned(flight.checkinAt, firstTz)
  })
  const [notes, setNotes] = useState(flight?.notes ?? '')
  const [legs, setLegs] = useState<LegDraft[]>(
    flight && flight.legs.length > 0
      ? flight.legs.map((l) => ({ ...legToForm(l), key: ++keyCounter, fromTzAuto: false, toTzAuto: false }))
      : [emptyLeg(trip.startDate, defaultDepartureTz(trip))],
  )
  const [errors, setErrors] = useState<{ title?: string; cost?: string; paidBy?: string; who?: string; legs: Record<number, string>; form?: string }>({ legs: {} })
  const [busy, setBusy] = useState(false)
  const people = who.length === 0 ? all : who
  const multi = people.length > 1

  const patchLeg = (key: number, patch: Partial<LegDraft>) => setLegs((a) => a.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  function setAirport(leg: LegDraft, side: 'from' | 'to', raw: string) {
    const code = raw.toUpperCase().slice(0, 3)
    const tz = isIata(code) ? timezoneForAirport(code) : undefined
    if (side === 'from') patchLeg(leg.key, { from: code, ...(tz && leg.fromTzAuto ? { fromTz: tz } : {}) })
    else patchLeg(leg.key, { to: code, ...(tz && leg.toTzAuto ? { toTz: tz } : {}) })
  }
  function addLeg() {
    const last = legs[legs.length - 1]
    const next = emptyLeg(last?.arriveDate || trip.startDate)
    if (last) Object.assign(next, { from: last.to, fromTz: last.toTz, departDate: last.arriveDate })
    setLegs([...legs, next])
  }

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const err: typeof errors = { legs: {} }
    if (!title.trim()) err.title = 'Dai un nome al volo (es. Andata).'
    const amount = parseAmount(cost)
    if (cost.trim() && amount === null) err.cost = 'Il costo non è chiaro: scrivi per esempio 623.'
    if (amount && paid && !paidBy) err.paidBy = 'Manca chi ha pagato. Scegli una persona.'
    legs.forEach((l, i) => {
      const n = `Tratta ${i + 1}: `
      if (!isIata(l.from) || !isIata(l.to)) return void (err.legs[l.key] = `${n}scrivi i codici aeroporto di 3 lettere (es. MXP).`)
      if (!isValidTimezone(l.fromTz) || !isValidTimezone(l.toTz)) return void (err.legs[l.key] = `${n}il fuso orario non è valido (es. Europe/Rome).`)
      if (!isCompleteZoned(l.departDate, l.departTime) || !isCompleteZoned(l.arriveDate, l.arriveTime)) return void (err.legs[l.key] = `${n}inserisci data e ora di partenza e di arrivo.`)
      const dep = zonedToInstant(l.departDate, l.departTime, l.fromTz)
      const arr = zonedToInstant(l.arriveDate, l.arriveTime, l.toTz)
      if (legDuration({ depart: dep, arrive: arr }) <= 0) err.legs[l.key] = `${n}l'arrivo è prima della partenza (controlla date e fusi).`
    })
    setErrors(err)
    if (err.title || err.cost || err.paidBy || Object.keys(err.legs).length > 0) return

    const checkinAt = checkin.date && checkin.time && firstTz !== '' ? zonedToInstant(checkin.date, checkin.time, legs[0].fromTz) : ''
    const input: FlightInput = {
      title, airline, bookingRef, cost: amount, currency, scope, paid, notes,
      baggage, policy, checkinAt,
      paidBy: paid || amount ? paidBy || undefined : undefined,
      forTravelers: who.length === 0 || all.every((id) => who.includes(id)) ? [] : who,
      legs: legs.map(({ key: _k, fromTzAuto: _a, toTzAuto: _b, ...l }) => l),
    }
    setBusy(true)
    const message = flight ? await t.updateFlight(trip.id, flight, input) : await t.createFlight(trip.id, input)
    setBusy(false)
    if (message) return setErrors({ ...err, form: message })
    showToast(flight ? 'Volo aggiornato' : 'Volo salvato')
    onClose()
  }

  const tz = timezoneOptions(trip.timezone)
  const nome = (id: string) => trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'

  return (
    <Foglio
      open={open}
      full
      title={flight ? 'Modifica volo' : 'Nuovo volo'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="volo-form" isLoading={busy}>
          {busy ? 'Salvataggio…' : flight ? 'Salva le modifiche' : 'Salva il volo'}
        </Pulsante>
      }
    >
      <form id="volo-form" className="frm" onSubmit={submit} noValidate>
        <Campo label="Nome del volo" value={title} onChange={setTitle} placeholder="es. Andata" maxLength={60} error={errors.title} />
        <div className="fa-2c">
          <Campo label="Compagnia" value={airline} onChange={setAirline} placeholder="es. Faraway Air" />
          <Campo label="Codice di prenotazione" value={bookingRef} onChange={(v) => setBookingRef(v.toUpperCase())} autoComplete="off" placeholder="FW7K 29QX" />
        </div>

        {trip.travelers.length > 1 ? (
          <div className="fa-fld" role="group" aria-label="Chi vola">
            Chi vola
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

        {legs.map((l, i) => (
          <fieldset key={l.key} className="fa-card xl" style={{ display: 'grid', gap: 12, padding: 16, margin: 0 }}>
            <legend className="fa-b" style={{ padding: '0 6px' }}>Tratta {i + 1}</legend>
            <div className="fa-2c">
              <Campo label="Da" value={l.from} onChange={(v) => setAirport(l, 'from', v)} placeholder="MXP" autoComplete="off" />
              <Campo label="A" value={l.to} onChange={(v) => setAirport(l, 'to', v)} placeholder="DXB" autoComplete="off" />
            </div>
            <Campo label="Numero del volo" value={l.flightNumber} onChange={(v) => patchLeg(l.key, { flightNumber: v.toUpperCase() })} autoComplete="off" placeholder="FA 206" />
            <div className="fa-2c">
              <Campo label="Partenza, data" type="date" icon="cal" value={l.departDate} onChange={(v) => patchLeg(l.key, { departDate: v, ...(v && l.arriveDate && l.arriveDate < v ? { arriveDate: v } : {}) })} />
              <Campo label="Partenza, ora" type="time" icon="clock" value={l.departTime} onChange={(v) => patchLeg(l.key, { departTime: v })} />
              <Campo label="Arrivo, data" type="date" icon="cal" value={l.arriveDate} onChange={(v) => patchLeg(l.key, { arriveDate: v })} min={l.departDate || undefined} />
              <Campo label="Arrivo, ora" type="time" icon="clock" value={l.arriveTime} onChange={(v) => patchLeg(l.key, { arriveTime: v })} />
            </div>
            <span className="fa-m">Ogni orario è quello locale dell'aeroporto indicato.</span>
            <div className="fa-2c">
              <Campo label="Fuso di partenza" value={l.fromTz} onChange={(v) => patchLeg(l.key, { fromTz: v, fromTzAuto: false })} list="volo-fusi" autoComplete="off" />
              <Campo label="Fuso di arrivo" value={l.toTz} onChange={(v) => patchLeg(l.key, { toTz: v, toTzAuto: false })} list="volo-fusi" autoComplete="off" />
              <Campo label="Classe" value={l.cabin} onChange={(v) => patchLeg(l.key, { cabin: v })} placeholder="Economy" />
              <Campo label="Imbarco, ora" type="time" icon="clock" value={l.boardingTime ?? ''} onChange={(v) => patchLeg(l.key, { boardingTime: v })} />
              <Campo label="Terminal" value={l.terminal ?? ''} onChange={(v) => patchLeg(l.key, { terminal: v })} maxLength={10} />
              <Campo label="Gate" value={l.gate ?? ''} onChange={(v) => patchLeg(l.key, { gate: v.toUpperCase() })} maxLength={10} />
            </div>
            {multi ? (
              <div className="fa-2c">
                {people.map((id) => (
                  <Campo key={id} label={`Posto di ${nome(id)}`} value={l.seatsBy?.[id] ?? ''} onChange={(v) => patchLeg(l.key, { seatsBy: { ...l.seatsBy, [id]: v.toUpperCase() } })} maxLength={6} />
                ))}
              </div>
            ) : (
              <Campo label="Posto" value={l.seats} onChange={(v) => patchLeg(l.key, { seats: v.toUpperCase() })} maxLength={20} />
            )}
            {errors.legs[l.key] ? <Errore>{errors.legs[l.key]}</Errore> : null}
            {legs.length > 1 ? (
              <Pulsante color="tertiary-destructive" size="sm" iconLeading="trash" onPress={() => setLegs(legs.filter((x) => x.key !== l.key))}>
                Rimuovi tratta
              </Pulsante>
            ) : null}
          </fieldset>
        ))}
        <Pulsante color="secondary" iconLeading="plus" onPress={addLeg}>
          Aggiungi una tratta (scalo)
        </Pulsante>

        <div className="fa-2c">
          <Campo label="Costo" inputMode="decimal" value={cost} onChange={setCost} placeholder="es. 623" error={errors.cost} />
          <div className="fa-fld">
            <label htmlFor="volo-val">Valuta</label>
            <span className="fa-in">
              <input id="volo-val" list="volo-valute" value={currency} onChange={(e) => setCurrency(e.currentTarget.value.toUpperCase().slice(0, 3))} maxLength={3} />
            </span>
          </div>
        </div>
        <div className="fa-chips" role="group" aria-label="Il costo è">
          <Chip on={scope === 'per_person'} onPress={() => setScope('per_person')}>A persona</Chip>
          <Chip on={scope === 'total'} onPress={() => setScope('total')}>Totale</Chip>
        </div>
        <Interruttore label="Pagato" hint={paid ? 'Con un importo, il volo diventa una spesa.' : 'Non pagato'} isSelected={paid} onChange={setPaid} />
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

        <Campo label="Bagaglio" value={baggage} onChange={setBaggage} placeholder="es. 1 bagaglio da 23 kg" />
        <Campo label="Cambio e rimborso" textarea value={policy} onChange={setPolicy} placeholder="es. Cambio gratuito fino a 24 ore prima" />
        <div className="fa-2c">
          <Campo label="Apre il check-in, data" type="date" icon="cal" value={checkin.date} onChange={(v) => setCheckin({ ...checkin, date: v })} />
          <Campo label="Apre il check-in, ora" type="time" icon="clock" value={checkin.time} onChange={(v) => setCheckin({ ...checkin, time: v })} />
        </div>
        <Campo label="Note" textarea value={notes} onChange={setNotes} />
        {flight ? <DocumentiCollegati trip={trip} kind={'flight'} refId={flight.id} /> : null}
        {errors.form ? <Errore>{errors.form}</Errore> : null}
        <datalist id="volo-fusi">{tz.map((z) => <option key={z.value} value={z.value} />)}</datalist>
        <datalist id="volo-valute">{tripCurrencies(trip, flight?.currency).map((c) => <option key={c} value={c} />)}</datalist>
      </form>
    </Foglio>
  )
}
