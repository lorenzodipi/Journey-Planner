// Foglio «Nuovo trasporto» / «Modifica trasporto» (#37, #58): mezzo, nome o numero, percorso con orari, fermate, chi viaggia,
// prezzo con «Pagato / Non pagato» e «Pagato da», codice, operatore, binario, bagaglio, politiche e note.
import { paesiDi, paeseDelGiorno } from '../../lib/paesi'
import { DocumentiCollegati } from '../documenti/DocumentiCollegati'
import { useState } from 'react'
import { amountToText, parseAmount, tripCurrencies } from '../../lib/money'
import { transportToForm, type TransportInput } from '../../lib/logistics'
import { MODE_NOME } from '../../lib/trasporti'
import { isCompleteZoned, instantToZoned, zonedToInstant } from '../../lib/zoned'
import { discOf, initials, useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Transport, TransportMode, Trip } from '../../types'
import { Campo, Chip, Interruttore, Pulsante } from '../../faraway/base'
import { ChiHaPagato } from '../../faraway/ChiHaPagato'
import { cx } from '../../faraway/cx'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'

const MODI = Object.keys(MODE_NOME) as TransportMode[]
const FERMATE = [
  { v: 'nd', l: 'Non so' },
  { v: '0', l: 'Diretto' },
  { v: '1', l: 'Una fermata' },
  { v: '2', l: '2 fermate' },
  { v: '3', l: '3 o più' },
]

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
    if (cost.trim() && amount === null) err.cost = 'Il prezzo non è chiaro: scrivi per esempio 15,50.'
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

  const nome = (id: string) => trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'

  return (
    <Foglio
      open={open}
      full
      title={t ? 'Modifica trasporto' : 'Nuovo trasporto'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="trasporto-form" isLoading={busy}>
          {busy ? 'Salvataggio…' : t ? 'Salva le modifiche' : 'Salva il trasporto'}
        </Pulsante>
      }
    >
      <form id="trasporto-form" className="frm" onSubmit={submit} noValidate>
        <div className="fa-fld" role="group" aria-label="Mezzo">
          Mezzo
          <div className="fa-chips scroll">
            {MODI.map((m) => (
              <Chip key={m} on={mode === m} onPress={() => setMode(m)}>
                {MODE_NOME[m]}
              </Chip>
            ))}
          </div>
        </div>
        <Campo label="Nome o numero del mezzo" value={title} onChange={setTitle} placeholder="es. Haruka 33" maxLength={60} />
        <div className="fa-2c">
          <Campo label="Da" icon="pin" value={from} onChange={setFrom} placeholder="Aeroporto Kansai" error={errors.from} />
          <Campo label="A" icon="pin" value={to} onChange={setTo} placeholder="Stazione di Kyoto" error={errors.to} />
        </div>
        <div className="fa-2c">
          <Campo label="Partenza, data" type="date" icon="cal" value={dd} onChange={(v) => (setDd(v), !ad || ad < v ? setAd(v) : null)} />
          <Campo label="Partenza, ora" type="time" icon="clock" value={dt} onChange={setDt} />
          <Campo label="Arrivo, data" type="date" icon="cal" value={ad} onChange={setAd} min={dd || undefined} />
          <Campo label="Arrivo, ora" type="time" icon="clock" value={at} onChange={setAt} />
        </div>
        {errors.when ? <Errore>{errors.when}</Errore> : null}
        {paesiDi(trip).length > 1 && dd ? (
          <span className="fa-help">
            {ad && paeseDelGiorno(trip, ad).name !== paeseDelGiorno(trip, dd).name ? `Parte in ${paeseDelGiorno(trip, dd).name}, arriva in ${paeseDelGiorno(trip, ad).name}` : `Giorno in ${paeseDelGiorno(trip, dd).name}`}
          </span>
        ) : null}
        <div className="fa-fld" role="group" aria-label="Fermate">
          Fermate
          <div className="fa-chips scroll">
            {FERMATE.map((f) => (
              <Chip key={f.v} on={stops === f.v} onPress={() => setStops(f.v)}>
                {f.l}
              </Chip>
            ))}
          </div>
        </div>
        {trip.travelers.length > 1 ? (
          <div className="fa-fld" role="group" aria-label="Chi viaggia">
            Chi viaggia
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
        <div className="fa-2c">
          <Campo label="Prezzo" inputMode="decimal" value={cost} onChange={setCost} placeholder="es. 15,50" error={errors.cost} autoFocus={focus === 'prezzo'} />
          <div className="fa-fld">
            <label htmlFor="tr-val">Valuta</label>
            <span className="fa-in">
              <input id="tr-val" list="tr-valute" value={currency} onChange={(e) => setCurrency(e.currentTarget.value.toUpperCase().slice(0, 3))} maxLength={3} />
            </span>
          </div>
        </div>
        <div className="fa-chips" role="group" aria-label="Il prezzo è">
          <Chip on={scope === 'per_person'} onPress={() => setScope('per_person')}>A persona</Chip>
          <Chip on={scope === 'total'} onPress={() => setScope('total')}>Totale</Chip>
        </div>
        <Interruttore label="Pagato" hint={paid ? 'Con un prezzo, il trasporto diventa una spesa.' : 'Non pagato'} isSelected={paid} onChange={setPaid} />
        {paid && cost.trim() ? (
          <ChiHaPagato travelers={trip.travelers} value={payers} onChange={setPayers} error={errors.paidBy} />
        ) : null}
        <div className="fa-2c">
          <Campo label="Codice" value={refCode} onChange={(v) => setRefCode(v.toUpperCase())} autoComplete="off" />
          <Campo label="Operatore" value={operator} onChange={setOperator} placeholder="es. JR West" />
          <Campo label="Terminal" value={terminal} onChange={setTerminal} maxLength={10} />
          <Campo label="Binario" value={platform} onChange={setPlatform} maxLength={10} />
          <Campo label="Bagaglio" value={baggage} onChange={setBaggage} />
        </div>
        <Campo label="Cambio e rimborso" textarea value={policy} onChange={setPolicy} />
        <div className="fa-2c">
          <Campo label="Apre il check-in, data" type="date" icon="cal" value={checkin.date} onChange={(v) => setCheckin({ ...checkin, date: v })} />
          <Campo label="Apre il check-in, ora" type="time" icon="clock" value={checkin.time} onChange={(v) => setCheckin({ ...checkin, time: v })} />
        </div>
        <Campo label="Nota" textarea value={notes} onChange={setNotes} />
        {t ? <DocumentiCollegati trip={trip} kind={'transport'} refId={t.id} /> : null}
        {errors.form ? <Errore>{errors.form}</Errore> : null}
        <datalist id="tr-valute">{tripCurrencies(trip, t?.currency).map((c) => <option key={c} value={c} />)}</datalist>
      </form>
    </Foglio>
  )
}
