// Foglio «Nuovo volo» / «Modifica volo» (#36, #58), a gruppi: Volo, Tratte (ognuna con il percorso, la durata e i posti,
// lo scalo tra due tratte), Costo, Bagaglio e regole, Altri dettagli (terminal, gate, imbarco, fusi, apertura del check-in).
import { paesiDi, paeseDelGiorno } from '../../lib/paesi'
import { DocumentiCollegati } from '../documenti/DocumentiCollegati'
import { Fragment, useState } from 'react'
import { isIata, timezoneForAirport } from '../../lib/airports'
import { layover, legDuration } from '../../lib/flights'
import { compilati, durataTesto } from '../../lib/moduli'
import { legToForm, type FlightInput, type LegInput } from '../../lib/logistics'
import { amountToText, parseAmount, tripCurrencies } from '../../lib/money'
import { defaultDepartureTz } from '../../lib/origin'
import { isValidTimezone } from '../../lib/tripForm'
import { instantToZoned, isCompleteZoned, zonedToInstant } from '../../lib/zoned'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Flight, Trip } from '../../types'
import { Campo, Interruttore, Pulsante } from '../../faraway/base'
import { AltriDettagli, Gruppo, IlCostoE, Micro, PerChi, Percorso } from '../../faraway/Moduli'
import { CampoValuta } from '../../faraway/CampoValuta'
import { CampoFuso } from '../../faraway/CampoFuso'
import { ChiHaPagato } from '../../faraway/ChiHaPagato'
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
  const [payers, setPayers] = useState<string[]>(() => (flight?.payerIds?.length ? flight.payerIds : flight?.paidBy ? [flight.paidBy] : flight ? [] : me?.id ? [me.id] : all.length === 1 ? [all[0]] : []))
  const paidBy = payers.length === 1 ? payers[0] : ''
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
    if (amount && paid && payers.length === 0) err.paidBy = 'Manca chi ha pagato. Scegli una persona.'
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
      paidBy: (paid || amount) && payers.length === 1 ? paidBy : undefined,
      payerIds: (paid || amount) && payers.length > 1 ? payers : [],
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

  const nome = (id: string) => trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'
  const amountNow = parseAmount(cost)
  /** Istanti di partenza e arrivo di una tratta, se date, ore e fusi bastano a calcolarli. */
  const istanti = (l: LegDraft) =>
    isCompleteZoned(l.departDate, l.departTime) && isCompleteZoned(l.arriveDate, l.arriveTime) && isValidTimezone(l.fromTz) && isValidTimezone(l.toTz)
      ? { depart: zonedToInstant(l.departDate, l.departTime, l.fromTz), arrive: zonedToInstant(l.arriveDate, l.arriveTime, l.toTz) }
      : null
  /** I fusi stanno in «Altri dettagli»; restano nella tratta solo se non si ricavano dal codice dell'aeroporto. */
  const fusoInTratta = (l: LegDraft) => (isIata(l.from) && !isValidTimezone(l.fromTz)) || (isIata(l.to) && !isValidTimezone(l.toTz))
  const campiFuso = (l: LegDraft) => (
    <div className="fa-2c">
      <CampoFuso label="Fuso di partenza" value={l.fromTz} onChange={(v) => patchLeg(l.key, { fromTz: v, fromTzAuto: false })} usati={[trip.timezone]} />
      <CampoFuso label="Fuso di arrivo" value={l.toTz} onChange={(v) => patchLeg(l.key, { toTz: v, toTzAuto: false })} usati={[trip.timezone]} />
    </div>
  )
  const rotta = (l: LegDraft) => (l.from && l.to ? `${l.from} → ${l.to}` : undefined)
  const altri = compilati([...legs.flatMap((l) => [l.terminal ?? '', l.gate ?? '', l.boardingTime ?? '']), checkin.date || checkin.time])

  return (
    <Foglio
      open={open}
      full
      title={flight ? 'Modifica volo' : 'Nuovo volo'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="volo-form" isLoading={busy}>
          {flight ? 'Salva le modifiche' : 'Salva il volo'}
        </Pulsante>
      }
    >
      <form id="volo-form" className="frm grp" onSubmit={submit} noValidate>
        <Gruppo titolo="Volo">
          <Campo label="Nome del volo" value={title} onChange={setTitle} placeholder="es. Andata" maxLength={60} error={errors.title} />
          <Campo label="Compagnia" value={airline} onChange={setAirline} placeholder="Nome della compagnia" />
          <Campo label="Codice di prenotazione" value={bookingRef} onChange={(v) => setBookingRef(v.toUpperCase())} autoComplete="off" placeholder="es. 4K7QX2" />
        </Gruppo>

        <Gruppo titolo="Tratte">
          {legs.map((l, i) => {
            const ist = istanti(l)
            const next = legs[i + 1]
            const istNext = next ? istanti(next) : null
            const scalo = ist && istNext ? durataTesto(layover(ist, istNext)) : ''
            return (
              <Fragment key={l.key}>
                <div className="fa-tratta" role="group" aria-label={`Tratta ${i + 1}`}>
                  <Micro titolo={`Tratta ${i + 1}`} nota={rotta(l)} />
                  <div className="fa-2c">
                    <Campo label="Numero del volo" value={l.flightNumber} onChange={(v) => patchLeg(l.key, { flightNumber: v.toUpperCase() })} autoComplete="off" placeholder="es. EK 92" />
                    <Campo label="Classe" value={l.cabin} onChange={(v) => patchLeg(l.key, { cabin: v })} placeholder="es. Economy" />
                  </div>
                  <Percorso
                    livello={5}
                    durata={ist ? durataTesto(legDuration(ist)) : ''}
                    da={{
                      titolo: 'Partenza',
                      children: (
                        <>
                          <Campo label="Aeroporto" icon="plane" value={l.from} onChange={(v) => setAirport(l, 'from', v)} placeholder="Sigla di 3 lettere" autoComplete="off" />
                          <div className="dt">
                            <Campo label="Data" type="date" icon="cal" value={l.departDate} onChange={(v) => patchLeg(l.key, { departDate: v, ...(v && l.arriveDate && l.arriveDate < v ? { arriveDate: v } : {}) })} />
                            <Campo label="Ora" type="time" icon="clock" value={l.departTime} onChange={(v) => patchLeg(l.key, { departTime: v })} />
                          </div>
                        </>
                      ),
                    }}
                    a={{
                      titolo: 'Arrivo',
                      children: (
                        <>
                          <Campo label="Aeroporto" icon="plane" value={l.to} onChange={(v) => setAirport(l, 'to', v)} placeholder="Sigla di 3 lettere" autoComplete="off" />
                          <div className="dt">
                            <Campo label="Data" type="date" icon="cal" value={l.arriveDate} onChange={(v) => patchLeg(l.key, { arriveDate: v })} min={l.departDate || undefined} />
                            <Campo label="Ora" type="time" icon="clock" value={l.arriveTime} onChange={(v) => patchLeg(l.key, { arriveTime: v })} />
                          </div>
                        </>
                      ),
                    }}
                  />
                  <span className="fa-help" style={{ marginTop: -8 }}>Orari locali di ogni aeroporto.</span>
                  {fusoInTratta(l) ? (
                    <>
                      <span className="fa-help">Non riconosco il fuso di questo aeroporto: sceglilo qui.</span>
                      {campiFuso(l)}
                    </>
                  ) : null}
                  {multi ? (
                    <div className="fa-2c riempi">
                      {people.map((id) => (
                        <Campo key={id} label={`Posto di ${nome(id)}`} value={l.seatsBy?.[id] ?? ''} onChange={(v) => patchLeg(l.key, { seatsBy: { ...l.seatsBy, [id]: v.toUpperCase() } })} maxLength={6} placeholder="es. 32A" />
                      ))}
                    </div>
                  ) : (
                    <Campo label="Posto" value={l.seats} onChange={(v) => patchLeg(l.key, { seats: v.toUpperCase() })} maxLength={20} placeholder="es. 32A" />
                  )}
                  {errors.legs[l.key] ? <Errore>{errors.legs[l.key]}</Errore> : null}
                  {paesiDi(trip).length > 1 && l.departDate ? (
                    <span className="fa-help">
                      {l.arriveDate && paeseDelGiorno(trip, l.arriveDate).name !== paeseDelGiorno(trip, l.departDate).name ? `Parte in ${paeseDelGiorno(trip, l.departDate).name}, arriva in ${paeseDelGiorno(trip, l.arriveDate).name}` : `Giorno in ${paeseDelGiorno(trip, l.departDate).name}`}
                    </span>
                  ) : null}
                  {legs.length > 1 ? (
                    <Pulsante color="tertiary-destructive" size="sm" iconLeading="trash" onPress={() => setLegs(legs.filter((x) => x.key !== l.key))}>
                      {`Rimuovi la tratta ${i + 1}`}
                    </Pulsante>
                  ) : null}
                </div>
                {next ? (
                  <div className="fa-scalo">
                    <Sv name="clock" size={16} />
                    {`Scalo${l.to && l.to === next.from ? ` a ${l.to}` : ''}${scalo ? ` · ${scalo}` : ''}`}
                  </div>
                ) : null}
              </Fragment>
            )
          })}
          <Pulsante color="secondary" iconLeading="plus" onPress={addLeg}>
            Aggiungi una tratta
          </Pulsante>
        </Gruppo>

        <Gruppo titolo="Costo">
          <PerChi trip={trip} meId={me?.id} value={people} onChange={setWho} />
          <div className="fa-2c">
            <Campo label="Costo" inputMode="decimal" value={cost} onChange={setCost} placeholder="es. 623" error={errors.cost} />
            <CampoValuta value={currency} onChange={setCurrency} valute={tripCurrencies(trip, flight?.currency)} />
          </div>
          <IlCostoE value={scope} onChange={setScope} amount={amountNow} persone={people.length} currency={currency} />
          <Interruttore label="Pagato" hint={paid ? 'Con un costo, il volo diventa una spesa.' : 'Non pagato'} isSelected={paid} onChange={setPaid} />
          {paid && cost.trim() ? <ChiHaPagato travelers={trip.travelers} value={payers} onChange={setPayers} error={errors.paidBy} /> : null}
        </Gruppo>

        <Gruppo titolo="Bagaglio e regole">
          <Campo label="Bagaglio" value={baggage} onChange={setBaggage} placeholder="es. 1 valigia da 23 kg" />
          <Campo label="Cambio e rimborso" textarea value={policy} onChange={setPolicy} placeholder="es. Cambio gratuito fino a 24 ore prima" />
          <Campo label="Note" textarea value={notes} onChange={setNotes} placeholder="es. Check-in online 24 ore prima" />
        </Gruppo>

        <AltriDettagli pieni={altri} contenuto="Terminal, gate, imbarco, fusi orari, check-in">
          {legs.map((l, i) => (
            <div key={l.key} className="fa-tratta" role="group" aria-label={`Tratta ${i + 1}`}>
              <Micro titolo={`Tratta ${i + 1}`} nota={rotta(l)} />
              <div className="fa-2c">
                <Campo label="Terminal" value={l.terminal ?? ''} onChange={(v) => patchLeg(l.key, { terminal: v })} maxLength={10} placeholder="es. T1" />
                <Campo label="Gate" value={l.gate ?? ''} onChange={(v) => patchLeg(l.key, { gate: v.toUpperCase() })} maxLength={10} placeholder="es. B12" />
              </div>
              <Campo label="Imbarco" type="time" icon="clock" value={l.boardingTime ?? ''} onChange={(v) => patchLeg(l.key, { boardingTime: v })} />
              {fusoInTratta(l) ? null : campiFuso(l)}
            </div>
          ))}
          <Micro titolo="Apertura del check-in" />
          <div className="fa-2c dt">
            <Campo label="Data" type="date" icon="cal" value={checkin.date} onChange={(v) => setCheckin({ ...checkin, date: v })} />
            <Campo label="Ora" type="time" icon="clock" value={checkin.time} onChange={(v) => setCheckin({ ...checkin, time: v })} />
          </div>
        </AltriDettagli>
        {flight ? <DocumentiCollegati trip={trip} kind={'flight'} refId={flight.id} /> : null}
        {errors.form ? <Errore>{errors.form}</Errore> : null}
      </form>
    </Foglio>
  )
}
