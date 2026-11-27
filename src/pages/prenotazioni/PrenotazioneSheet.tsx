// Foglio «Nuova prenotazione» / «Modifica prenotazione» (#40), a gruppi: Che cosa (tipo e stato a riquadri, persone con il
// contatore), Quando (data, ora, «Dura più giorni», tappa), Costo, Fornitore e allegato, Altri dettagli (contatto, cancellazione).
import { useConflitto } from '../../faraway/useConflitto'
import { useRef, useState } from 'react'
import { BOOKING_LABEL, BOOKING_NEW_TYPES } from '../../lib/bookingMeta'
import { checkFile } from '../../lib/bookingFiles'
import { dateInZone } from '../../lib/flights'
import { amountToText, parseAmount, tripCurrencies } from '../../lib/money'
import { oraPrenotazione, STATO_LABEL, tappeDi, tappeInAltroGiorno, tappePerScelta } from '../../lib/prenotazioni'
import { safeUrl, type BookingInput } from '../../lib/planningData'
import { useMe } from '../../state/me'
import { compilati } from '../../lib/moduli'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import { schema } from '../../lib/schema'
import type { Booking, BookingStatus, BookingType, TimeKind, Trip } from '../../types'
import { formatShort } from '../../lib/dates'
import { Campo, Chip, Interruttore, Pulsante } from '../../faraway/base'
import { CampoValuta } from '../../faraway/CampoValuta'
import { AltriDettagli, Contatore, Gruppo, IlCostoE, PerChi, Riquadri } from '../../faraway/Moduli'
import { totaleVoce, usePagamentoVoce } from '../spese/pagamentoVoce'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { t as tt } from '../../i18n'

const TIPO_GLIFO: Record<BookingType, string> = {
  restaurant: 'g-sez-food', activity: 'g-sez-visit', train: 'g-tra-train', rental: 'g-tra-car', other: 'g-cat-pin',
  ticket: 'g-sez-ticket', insurance: 'g-sez-shield', esim: 'g-sez-sim', flight: 'g-tra-plane', hotel: 'g-sez-bed',
}
/** Nomi corti per i riquadri (tre per riga a 320 px). */
const TIPO_BREVE: Partial<Record<BookingType, string>> = { insurance: tt('Polizza'), esim: 'eSIM' }
/** «L’ora è»: come leggere l'orario della prenotazione. */
const ORA_TIPI: [TimeKind, string][] = [['fixed', tt('Esatta')], ['window', tt('Una finestra')], ['indicative', tt('Indicativa')], ['unspecified', tt('Non lo so')]]

const Errore = ({ children }: { children: string }) => (
  <span className="fa-help bad" role="alert">
    <Sv name="err" size={16} />
    {children}
  </span>
)

interface Props {
  trip: Trip
  booking?: Booking
  open: boolean
  onClose: () => void
}

export function PrenotazioneSheet({ trip, booking: b, open, onClose }: Props) {
  const [procediConflitto, nodoConflitto] = useConflitto(trip, 'bookings', b?.id)
  const tr = useTrips()
  const me = useMe(trip)
  const tz = trip.timezone
  const all = trip.travelers.map((p) => p.id)
  const tipi: BookingType[] = b && !BOOKING_NEW_TYPES.includes(b.type) ? [b.type, ...BOOKING_NEW_TYPES] : BOOKING_NEW_TYPES
  const [type, setType] = useState<BookingType>(b?.type ?? 'restaurant')
  const [title, setTitle] = useState(b?.title ?? '')
  const [place, setPlace] = useState(b?.place ?? '')
  const [detail, setDetail] = useState(b?.detail ?? '')
  const [party, setParty] = useState(b?.partySize ? String(b.partySize) : '')
  const [date, setDate] = useState(b?.validFrom ? dateInZone(b.validFrom, tz) : '')
  const [time, setTime] = useState(b ? oraPrenotazione(b, tz) : '')
  const [until, setUntil] = useState(b?.validTo ? dateInZone(b.validTo, tz) : '')
  const [code, setCode] = useState(b?.code ?? '')
  const [url, setUrl] = useState(b?.url ?? '')
  const [cost, setCost] = useState(amountToText(b?.cost))
  const [currency, setCurrency] = useState(b?.currency ?? trip.localCurrency ?? trip.baseCurrency)
  const [scope, setScope] = useState<'per_person' | 'total'>(b?.scope ?? 'total')
  const [who, setWho] = useState<string[]>(b?.forTravelers?.length ? b.forTravelers : all)
  const [file, setFile] = useState<File | null>(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [offline, setOffline] = useState(b?.keepOffline ?? true)
  const [notes, setNotes] = useState(b?.notes ?? '')
  const [status, setStatus] = useState<BookingStatus>(b?.status ?? 'confirmed')
  const [timeKind, setTimeKind] = useState<TimeKind>(b?.timeKind ?? (b?.validFrom && oraPrenotazione(b, tz) ? 'fixed' : 'unspecified'))
  const [ask, confirmNode] = useConferma()
  const [provider, setProvider] = useState(b?.provider ?? '')
  const [contact, setContact] = useState(b?.contact ?? '')
  const [policy, setPolicy] = useState(b?.cancellationPolicy ?? '')
  const richiedeTappa = !!trip.bookingLinks // senza la migrazione 0031 la tappa non c'è
  const [tappa, setTappa] = useState<string>(b ? (tappeDi(trip, b.id)[0] ?? '') : '')
  const [avvisoData, setAvvisoData] = useState<{ itemId: string; title: string; date: string }[] | null>(null)
  const scelte = tappePerScelta(trip, date, place)
  const [errors, setErrors] = useState<{ title?: string; when?: string; url?: string; cost?: string; paidBy?: string; party?: string; file?: string; tappa?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const people = who.length === 0 ? all : who
  const pag = usePagamentoVoce({ trip, voce: b, meId: me?.id, people, totale: totaleVoce(cost, scope, people.length), currency })
  const hasFile = !!b?.filePath && !removeFile

  async function submit(e: { preventDefault(): void }, saltaAvviso = false) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!title.trim()) err.title = tt('Scrivi un titolo, per esempio «Cena a Gion Karyo».')
    if (time && !date) err.when = tt('Con l’ora serve anche la data.')
    else if (until && date && until < date) err.when = tt('La fine non può essere prima dell’inizio.')
    if (url.trim() && !safeUrl(url)) err.url = tt('Il link non è valido: scrivi un indirizzo che inizia con https://')
    const amount = parseAmount(cost)
    if (cost.trim() && amount === null) err.cost = tt('Il costo non è chiaro: scrivi per esempio 45,00.')
    const pc = amount ? pag.controlla() : null
    if (pc) Object.assign(err, pc)
    const n = party.trim() ? Number(party) : null
    if (n !== null && (!Number.isInteger(n) || n < 1)) err.party = tt('Scrivi un numero di persone, per esempio 4.')
    if (file) err.file = checkFile(file) ?? undefined
    if (richiedeTappa && !tappa) err.tappa = tt('Scegli la tappa a cui appartiene: la prenotazione sta sempre in una tappa.')
    setErrors(err)
    if (Object.values(err).some(Boolean) || pc === false) return
    const v = pag.valori()
    const input: BookingInput = {
      type, title, code, url, validFrom: date, validTo: until, keepOffline: offline, notes,
      cost: amount, currency, scope, payerIds: amount !== null ? v.payerIds : [], file, removeFile,
      time: date ? time : '', place, detail, partySize: n,
      ...(amount
        ? { paidBy: v.paidBy, payerAmounts: v.payerAmounts, splitMode: v.splitMode, splitShares: v.splitShares }
        : { paidBy: b?.paidBy ?? undefined }),
      forTravelers: all.every((id) => people.includes(id)) ? [] : people,
      status, provider, contact, timeKind: time ? timeKind : 'unspecified', cancellationPolicy: policy, participants: all.every((id) => people.includes(id)) ? [] : people,
      ...(richiedeTappa ? { itemIds: [tappa] } : {}),
    }
    // BOOK-025: la data cambia e la tappa sta in un altro giorno → scelta esplicita, la tappa non si sposta da sola
    const altro = b && !saltaAvviso && tappa ? tappeInAltroGiorno(trip, b.id, date).filter((t) => t.itemId === tappa) : []
    if (altro.length) return setAvvisoData(altro)
    // DAY-020, BR-39: solo con ora prestabilita e solo su conferma si propone di vincolare l'orario della tappa
    let vincola = false
    const tp = tappa ? trip.days.flatMap((d) => d.items).find((i) => i.id === tappa) : undefined
    if (schema.timeLock && tp && time && timeKind === 'fixed' && tp.timeLock !== 'locked') {
      vincola = await ask({ title: tt('Vincolare l’orario della tappa?'), message: tt('«{title}» {v1}. Vincolandola resta alle {time}, la prenotazione è a ora fissa. L’orario cambia solo se confermi.', { title: tp.title, v1: tp.time ? tt('è alle {time}', { time: tp.time }) : tt('non ha un orario'), time }), confirm: tt('Vincola alle {time}', { time }), cancel: tt('No, lascia flessibile'), destructive: false })
    }
    if (!(await procediConflitto())) return
    setBusy(true)
    const message = b ? await tr.updateBooking(trip.id, b, input) : await tr.createBooking(trip.id, input)
    if (!message && vincola && tp) {
      const m2 = tp.time === time ? null : await tr.updateItem(tp.id, { title: tp.title, kind: tp.kind, startTime: time, endTime: tp.endTime ?? '', notes: tp.note ?? '', placeId: tp.placeId ?? null })
      if (!m2) await tr.setItemLock(tp.id, 'locked', 'booking')
    }
    setBusy(false)
    if (message) return setErrors({ form: message })
    showToast(b ? tt('Prenotazione aggiornata') : tt('Prenotazione salvata'))
    onClose()
  }

  const amountNow = parseAmount(cost)
  const altri = compilati([contact, policy])
  const [piuGiorni, setPiuGiorni] = useState(!!until)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <Foglio
      open={open}
      full
      title={b ? tt('Modifica prenotazione') : tt('Nuova prenotazione')}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="prenotazione-form" isLoading={busy}>
          {b ? tt('Salva le modifiche') : tt('Salva la prenotazione')}
        </Pulsante>
      }
    >
      <form id="prenotazione-form" className="frm grp" onSubmit={submit} noValidate>
        <Gruppo titolo={tt('Che cosa')}>
          <Riquadri<BookingType> label={tt('Tipo')} cols={3} value={type} onChange={(x) => x && setType(x)} options={tipi.map((x) => ({ value: x, label: TIPO_BREVE[x] ?? BOOKING_LABEL[x], glifo: TIPO_GLIFO[x] }))} />
          <Campo label={tt('Titolo')} value={title} onChange={setTitle} placeholder={tt('es. Cena al ristorante')} error={errors.title} />
          <div className="fa-2c">
            <Campo label={tt('Luogo')} icon="pin" value={place} onChange={setPlace} placeholder={tt('Città')} />
            <Campo label={tt('Dettaglio')} value={detail} onChange={setDetail} placeholder={tt('es. Tavolo 6')} maxLength={40} />
          </div>
          <Contatore label={tt('Persone')} hint={tt('Quante persone sono nella prenotazione')} value={party.trim() && Number.isFinite(Number(party)) ? Number(party) : null} onChange={(n) => (setParty(n === null ? '' : String(n)), setErrors({ ...errors, party: undefined }))} vuoto />
          {errors.party ? <Errore>{errors.party}</Errore> : null}
          <Riquadri<BookingStatus>
            label={tt('Stato')}
            cols={3}
            value={status}
            onChange={(x) => x && setStatus(x)}
            options={[
              { value: 'to_confirm', label: STATO_LABEL.to_confirm, icona: 'clock' },
              { value: 'confirmed', label: STATO_LABEL.confirmed, icona: 'check' },
              { value: 'cancelled', label: STATO_LABEL.cancelled, icona: 'close' },
            ]}
          />
        </Gruppo>
        <Gruppo titolo={tt('Quando')}>
          <div className="fa-2c dt">
            <Campo label={tt('Data')} type="date" icon="cal" value={date} onChange={(v) => (setDate(v), until && until < v ? setUntil(v) : null)} />
            <Campo label={tt('Ora')} type="time" icon="clock" value={time} onChange={setTime} />
          </div>
          {time ? (
            <div className="fa-fld" role="group" aria-label={tt('L’ora è')}>
              {tt('L’ora è')}
              <div className="fa-chips wrap">
                {ORA_TIPI.map(([x, l]) => (
                  <Chip key={x} on={timeKind === x} onPress={() => setTimeKind(x)}>{l}</Chip>
                ))}
              </div>
            </div>
          ) : null}
          <Interruttore label={tt('Dura più giorni')} hint={piuGiorni ? tt('Scegli il giorno in cui finisce.') : tt('Per un pass o un noleggio di più giorni.')} isSelected={piuGiorni} onChange={(v) => (setPiuGiorni(v), v ? null : setUntil(''))} />
          {piuGiorni ? <Campo label={tt('Fino al')} type="date" icon="cal" value={until} onChange={setUntil} min={date || undefined} /> : null}
          {errors.when ? <Errore>{errors.when}</Errore> : null}
          {richiedeTappa ? (
            <div className="fa-fld">
              <label htmlFor="pr-tappa">{tt('Tappa')}</label>
              <span className="fa-in">
                <select id="pr-tappa" value={tappa} onChange={(e) => (setTappa(e.currentTarget.value), setErrors({ ...errors, tappa: undefined }))} aria-invalid={!!errors.tappa}>
                  <option value="">{tt('Scegli una tappa…')}</option>
                  {scelte.map((t) => (
                    <option key={t.itemId} value={t.itemId}>{`${formatShort(t.date)}${t.time ? ` ${t.time}` : ''} · ${t.title}${t.stessoGiorno ? tt(' (stesso giorno)') : ''}`}</option>
                  ))}
                </select>
              </span>
              {errors.tappa ? <Errore>{errors.tappa}</Errore> : <span className="fa-help">{scelte.length === 0 ? tt('Non ci sono ancora tappe: aggiungila prima nel giorno.') : tt('Le prime sono le tappe dello stesso giorno o luogo.')}</span>}
            </div>
          ) : null}
        </Gruppo>
        <Gruppo titolo={tt('Costo')}>
          <PerChi trip={trip} meId={me?.id} value={people} onChange={setWho} />
          <div className="fa-2c">
            <Campo label={tt('Costo')} importo value={cost} onChange={setCost} placeholder={tt('es. 45,00')} error={errors.cost} />
            <CampoValuta value={currency} onChange={setCurrency} valute={tripCurrencies(trip, b?.currency)} />
          </div>
          <IlCostoE value={scope} onChange={setScope} amount={amountNow} persone={people.length} currency={currency} />
          {cost.trim() ? (
            pag.vista(errors.paidBy)
          ) : (
            <span className="fa-help">{tt('Con un costo compare «Pagato da».')}</span>
          )}
        </Gruppo>
        <Gruppo titolo={tt('Fornitore e allegato')}>
          <Campo label={tt('Fornitore')} value={provider} onChange={setProvider} placeholder={tt('Ristorante, sito o agenzia')} />
          <Campo label={tt('Codice di prenotazione')} value={code} onChange={(v) => setCode(v.toUpperCase())} autoComplete="off" placeholder={tt('es. 4K7QX2')} />
          <Campo label={tt('Link')} type="url" icon="link" value={url} onChange={setUrl} placeholder="https://…" error={errors.url} />
          <div className="fa-fld">
            {tt('Allegato')}
            {hasFile && !file ? (
              <div className="fa-chips wrap">
                <span className="fa-m">{tt('C’è un file salvato.')}</span>
                <Chip on={false} onPress={() => setRemoveFile(true)}>{tt('Rimuovi il file')}</Chip>
              </div>
            ) : null}
            {removeFile && !file ? (
              <span className="fa-m">
                {tt('Il file verrà tolto al salvataggio.')}{' '}<button type="button" className="fa-lnk" onClick={() => setRemoveFile(false)}>{tt('Annulla')}</button>
              </span>
            ) : null}
            {file ? <span className="fa-m">{hasFile ? tt('Sostituirà il file attuale: ') : ''}{file.name}</span> : null}
            <input ref={fileRef} id="pr-file" type="file" accept="application/pdf,image/*" hidden onChange={(e) => (setFile(e.currentTarget.files?.[0] ?? null), setErrors({ ...errors, file: undefined }))} />
            <Pulsante color="secondary" iconLeading="file" onPress={() => fileRef.current?.click()}>
              {file || hasFile ? tt('Scegli un altro file') : tt('Allega PDF o immagine')}
            </Pulsante>
            {errors.file ? <Errore>{errors.file}</Errore> : <span className="fa-help">{tt('PDF o immagine, fino a 10 MB.')}</span>}
          </div>
          <Interruttore label={tt('Disponibile offline')} hint={tt('Il file resta sul telefono e si apre anche senza rete.')} isSelected={offline} onChange={setOffline} />
          <Campo label={tt('Note')} textarea value={notes} onChange={setNotes} placeholder={tt('es. Arrivare 15 minuti prima')} />
        </Gruppo>
        <AltriDettagli pieni={altri} contenuto={tt('Contatto, politica di cancellazione')}>
          <Campo label={tt('Contatto')} value={contact} onChange={setContact} placeholder={tt('Telefono o email')} />
          <Campo label={tt('Politica di cancellazione')} textarea value={policy} onChange={setPolicy} placeholder={tt('es. Gratis fino a 24 ore prima')} />
        </AltriDettagli>
        {errors.form ? <Errore>{errors.form}</Errore> : null}
      </form>
      {confirmNode}
      {avvisoData ? (
        <Foglio open title={tt('La tappa è in un altro giorno')} onClose={() => setAvvisoData(null)}>
          <p className="fa-m" style={{ margin: 0 }}>
            {tt('«{title}» sta nel giorno {v1}, la prenotazione ora è del {v2}. La tappa non si sposta da sola.', { title: avvisoData[0].title, v1: formatShort(avvisoData[0].date), v2: formatShort(date) })}
          </p>
          <Pulsante
            isDisabled={!trip.days.some((d) => d.date === date)}
            onPress={async () => {
              const dayId = trip.days.find((d) => d.date === date)?.id
              if (dayId) await tr.moveItemToDay(trip.id, avvisoData[0].itemId, dayId)
              setAvvisoData(null)
              void submit({ preventDefault() {} }, true)
            }}
          >
            {tt('Aggiorna la tappa')}
          </Pulsante>
          <Pulsante color="secondary" onPress={() => setAvvisoData(null)}>{tt('Collega diversamente')}</Pulsante>
          <Pulsante color="tertiary" onPress={() => (setAvvisoData(null), void submit({ preventDefault() {} }, true))}>{tt('Mantieni con avviso')}</Pulsante>
        </Foglio>
      ) : null}
    {nodoConflitto}
    </Foglio>
  )
}
