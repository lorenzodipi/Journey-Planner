// Foglio «Nuovo trasporto» / «Modifica trasporto» (#37, #58), a gruppi: Tragitto (mezzo a riquadri, percorso partenza →
// arrivo con la durata, fermate), Costo (per chi, costo, il costo è, pagato da), Biglietto, Regole e note, Altri dettagli.
import { paesiDi, paeseDelGiorno } from '../../lib/paesi'
import { DocumentiCollegati } from '../documenti/DocumentiCollegati'
import { useState } from 'react'
import { amountToText, parseAmount, tripCurrencies } from '../../lib/money'
import { transportToForm, type TransportInput } from '../../lib/logistics'
import { MODE_NOME } from '../../lib/trasporti'
import { isCompleteZoned, instantToZoned, zonedToInstant } from '../../lib/zoned'
import { useMe } from '../../state/me'
import { compilati, durataTesto } from '../../lib/moduli'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Transport, TransportMode, Trip } from '../../types'
import { Campo, Interruttore, Pulsante } from '../../faraway/base'
import { AltriDettagli, Gruppo, IlCostoE, Micro, PerChi, Percorso, Riquadri, SegmentiFacoltativi } from '../../faraway/Moduli'
import { CampoValuta } from '../../faraway/CampoValuta'
import { ChiHaPagato } from '../../faraway/ChiHaPagato'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'

const MODI: TransportMode[] = ['train', 'metro', 'bus', 'taxi', 'walk', 'car', 'ferry', 'plane', 'other']
const MODE_GLIFO: Record<TransportMode, string> = { train: 'g-tra-train', metro: 'g-tra-metro', bus: 'g-tra-bus', taxi: 'g-tra-taxi', walk: 'g-tra-walk', car: 'g-tra-car', ferry: 'g-tra-ferry', plane: 'g-tra-plane', other: 'g-cat-pin' }

const Errore = ({ children }: { children: string }) => (
  <span className="fa-help bad" role="alert">
    <Sv name="err" size={16} />
    {children}
  </span>
)

interface Props {
  trip: Trip
  transport?: Transport
  /** Data di partenza proposta per un trasporto nuovo. */
  date?: string
  /** `prezzo`: apre il foglio con il cursore sul prezzo («Aggiungi prezzo»). */
  focus?: 'prezzo'
  open: boolean
  onClose: () => void
}

export function TrasportoSheet({ trip, transport: t, date, focus, open, onClose }: Props) {
  const tr = useTrips()
  const me = useMe(trip)
  const all = trip.travelers.map((p) => p.id)
  const times = t ? transportToForm(t, trip.timezone, trip.days) : { departDate: date ?? trip.startDate, departTime: '', arriveDate: '', arriveTime: '' }
  const [mode, setMode] = useState<TransportMode>(t?.mode ?? 'train')
  const [title, setTitle] = useState(t?.title ?? '')
  const [from, setFrom] = useState(t?.from ?? '')
  const [to, setTo] = useState(t?.to ?? '')
  const [dd, setDd] = useState(times.departDate)
  const [dt, setDt] = useState(times.departTime)
  const [ad, setAd] = useState(times.arriveDate)
  const [at, setAt] = useState(times.arriveTime)
  const [stops, setStops] = useState(t?.stops === undefined ? 'nd' : String(Math.min(t.stops, 3)))
  const [who, setWho] = useState<string[]>(t?.forTravelers?.length ? t.forTravelers : all)
  const [cost, setCost] = useState(amountToText(t?.cost))
  const [currency, setCurrency] = useState(t?.currency ?? trip.localCurrency ?? trip.baseCurrency)
  const [scope, setScope] = useState<'per_person' | 'total'>(t?.scope ?? 'per_person')
  const [paid, setPaid] = useState(t?.bought ?? false)
  const [payers, setPayers] = useState<string[]>(() => (t?.payerIds?.length ? t.payerIds : t?.paidBy ? [t.paidBy] : t ? [] : me?.id ? [me.id] : all.length === 1 ? [all[0]] : []))
  const paidBy = payers.length === 1 ? payers[0] : ''
  const [refCode, setRefCode] = useState(t?.refCode ?? '')
  const [operator, setOperator] = useState(t?.operator ?? '')
  const [platform, setPlatform] = useState(t?.platform ?? '')
  const [terminal, setTerminal] = useState(t?.terminal ?? '')
  const [baggage, setBaggage] = useState(t?.baggage ?? '')
  const [policy, setPolicy] = useState(t?.policy ?? '')
  const [checkin, setCheckin] = useState(() => (t?.checkinAt ? instantToZoned(t.checkinAt, trip.timezone) : { date: '', time: '' }))
  const [notes, setNotes] = useState(t?.notes ?? '')
  const [errors, setErrors] = useState<{ from?: string; to?: string; when?: string; cost?: string; paidBy?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const people = who.length === 0 ? all : who

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!from.trim()) err.from = 'Scrivi da dove parte.'
    if (!to.trim()) err.to = 'Scrivi dove arriva.'
    const amount = parseAmount(cost)
    if (cost.trim() && amount === null) err.cost = 'Il costo non è chiaro: scrivi per esempio 15,50.'
    if (paid && amount && payers.length === 0) err.paidBy = 'Manca chi ha pagato. Scegli una persona.'
    if ((dt && !dd) || (at && !ad)) err.when = 'Con l’ora serve anche la data.'
    else if (isCompleteZoned(dd, dt) && isCompleteZoned(ad, at) && Date.parse(zonedToInstant(ad, at, trip.timezone)) <= Date.parse(zonedToInstant(dd, dt, trip.timezone))) err.when = 'L’arrivo è prima della partenza.'
    setErrors(err)
    if (Object.keys(err).length > 0) return
    // la posizione sulla mappa resta solo se il nome del posto non è cambiato
    const fromPos = t && t.from === from.trim() && t.fromLat != null && t.fromLng != null ? { lat: t.fromLat, lng: t.fromLng } : null
    const toPos = t && t.to === to.trim() && t.toLat != null && t.toLng != null ? { lat: t.toLat, lng: t.toLng } : null
    const input: TransportInput = {
      from, to, mode, departDate: dd, departTime: dt, arriveDate: ad, arriveTime: at, fromPos, toPos,
      cost: amount, currency, scope, bought: paid, refCode, notes,
      title, stops: stops === 'nd' ? null : Number(stops), operator, platform, terminal, baggage, policy,
      paidBy: paid && amount ? (payers.length === 1 ? paidBy : undefined) : (t?.paidBy ?? undefined),
      payerIds: paid && amount && payers.length > 1 ? payers : paid && amount ? [] : (t?.payerIds ?? []),
      forTravelers: all.every((id) => people.includes(id)) ? [] : people,
      checkinAt: checkin.date && checkin.time ? zonedToInstant(checkin.date, checkin.time, trip.timezone) : '',
    }
    setBusy(true)
    const message = t ? await tr.updateTransport(trip.id, t.id, input) : await tr.createTransport(trip.id, input)
    setBusy(false)
    if (message) return setErrors({ form: message })
    showToast(t ? 'Trasporto aggiornato' : 'Trasporto salvato')
    onClose()
  }

  const amountNow = parseAmount(cost)
  const durata = isCompleteZoned(dd, dt) && isCompleteZoned(ad, at) ? durataTesto((Date.parse(zonedToInstant(ad, at, trip.timezone)) - Date.parse(zonedToInstant(dd, dt, trip.timezone))) / 60_000) : ''
  const altri = compilati([terminal, platform, checkin.date || checkin.time])

  return (
    <Foglio
      open={open}
      full
      title={t ? 'Modifica trasporto' : 'Nuovo trasporto'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="trasporto-form" isLoading={busy}>
          {t ? 'Salva le modifiche' : 'Salva il trasporto'}
        </Pulsante>
      }
    >
      <form id="trasporto-form" className="frm grp" onSubmit={submit} noValidate>
        <Gruppo titolo="Tragitto">
          <Riquadri<TransportMode> label="Mezzo" cols={3} value={mode} onChange={(m) => m && setMode(m)} options={MODI.map((m) => ({ value: m, label: m === 'other' ? 'Altro' : MODE_NOME[m], glifo: MODE_GLIFO[m] }))} />
          <Campo label="Nome o numero del mezzo" value={title} onChange={setTitle} placeholder="es. Treno 9512" maxLength={60} />
          <Percorso
            durata={durata}
            da={{
              titolo: 'Partenza',
              children: (
                <>
                  <Campo label="Luogo" icon="pin" value={from} onChange={setFrom} placeholder="Città o stazione" error={errors.from} />
                  <div className="dt">
                    <Campo label="Data" type="date" icon="cal" value={dd} onChange={(v) => (setDd(v), !ad || ad < v ? setAd(v) : null)} />
                    <Campo label="Ora" type="time" icon="clock" value={dt} onChange={setDt} />
                  </div>
                </>
              ),
            }}
            a={{
              titolo: 'Arrivo',
              children: (
                <>
                  <Campo label="Luogo" icon="pin" value={to} onChange={setTo} placeholder="Città o stazione" error={errors.to} />
                  <div className="dt">
                    <Campo label="Data" type="date" icon="cal" value={ad} onChange={setAd} min={dd || undefined} />
                    <Campo label="Ora" type="time" icon="clock" value={at} onChange={setAt} />
                  </div>
                </>
              ),
            }}
          />
          {errors.when ? <Errore>{errors.when}</Errore> : null}
          {paesiDi(trip).length > 1 && dd ? (
            <span className="fa-help">
              {ad && paeseDelGiorno(trip, ad).name !== paeseDelGiorno(trip, dd).name ? `Parte in ${paeseDelGiorno(trip, dd).name}, arriva in ${paeseDelGiorno(trip, ad).name}` : `Giorno in ${paeseDelGiorno(trip, dd).name}`}
            </span>
          ) : null}
          <SegmentiFacoltativi
            label="Fermate"
            value={stops === 'nd' ? '' : stops}
            onChange={(v) => setStops(v || 'nd')}
            help="Se non lo sai, lascia vuoto."
            options={[
              { value: '0', label: 'Diretto' },
              { value: '1', label: '1', nome: 'Una fermata' },
              { value: '2', label: '2', nome: 'Due fermate' },
              { value: '3', label: '3+', nome: 'Tre o più fermate' },
            ]}
          />
        </Gruppo>
        <Gruppo titolo="Costo">
          <PerChi trip={trip} meId={me?.id} value={people} onChange={setWho} />
          <div className="fa-2c">
            <Campo label="Costo" inputMode="decimal" value={cost} onChange={setCost} placeholder="es. 15,50" error={errors.cost} autoFocus={focus === 'prezzo'} />
            <CampoValuta value={currency} onChange={setCurrency} valute={tripCurrencies(trip, t?.currency)} />
          </div>
          <IlCostoE value={scope} onChange={setScope} amount={amountNow} persone={people.length} currency={currency} />
          <Interruttore label="Pagato" hint={paid ? 'Con un costo, il trasporto diventa una spesa.' : 'Non pagato'} isSelected={paid} onChange={setPaid} />
          {paid && cost.trim() ? <ChiHaPagato travelers={trip.travelers} value={payers} onChange={setPayers} error={errors.paidBy} /> : null}
        </Gruppo>
        <Gruppo titolo="Biglietto">
          <Campo label="Operatore" value={operator} onChange={setOperator} placeholder="Nome della compagnia" />
          <Campo label="Codice di prenotazione" value={refCode} onChange={(v) => setRefCode(v.toUpperCase())} placeholder="es. 4K7QX2" autoComplete="off" />
        </Gruppo>
        <Gruppo titolo="Regole e note">
          <Campo label="Bagaglio" value={baggage} onChange={setBaggage} placeholder="es. 1 valigia grande" />
          <Campo label="Cambio e rimborso" textarea value={policy} onChange={setPolicy} placeholder="es. Cambio gratuito fino alla partenza" />
          <Campo label="Note" textarea value={notes} onChange={setNotes} placeholder="es. Biglietto da ritirare in stazione" />
        </Gruppo>
        <AltriDettagli pieni={altri} contenuto="Terminal, binario, check-in">
          <div className="fa-2c">
            <Campo label="Terminal" value={terminal} onChange={setTerminal} maxLength={10} placeholder="es. T1" />
            <Campo label="Binario" value={platform} onChange={setPlatform} maxLength={10} placeholder="es. 14" />
          </div>
          <Micro titolo="Apertura del check-in" />
          <div className="fa-2c dt">
            <Campo label="Data" type="date" icon="cal" value={checkin.date} onChange={(v) => setCheckin({ ...checkin, date: v })} />
            <Campo label="Ora" type="time" icon="clock" value={checkin.time} onChange={(v) => setCheckin({ ...checkin, time: v })} />
          </div>
        </AltriDettagli>
        {t ? <DocumentiCollegati trip={trip} kind={'transport'} refId={t.id} /> : null}
        {errors.form ? <Errore>{errors.form}</Errore> : null}
      </form>
    </Foglio>
  )
}
