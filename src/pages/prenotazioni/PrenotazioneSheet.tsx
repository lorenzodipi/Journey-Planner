// Foglio «Nuova prenotazione» / «Modifica prenotazione» (#40): tipo, titolo, luogo, dettaglio, persone, data e ora,
// codice, link, costo con «Pagato da» e «Per chi», file allegato e «Disponibile offline».
import { useState } from 'react'
import { BOOKING_LABEL, BOOKING_NEW_TYPES } from '../../lib/bookingMeta'
import { checkFile } from '../../lib/bookingFiles'
import { dateInZone } from '../../lib/flights'
import { amountToText, parseAmount, tripCurrencies } from '../../lib/money'
import { oraPrenotazione } from '../../lib/prenotazioni'
import { safeUrl, type BookingInput } from '../../lib/planningData'
import { discOf, initials, useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Booking, BookingType, Trip } from '../../types'
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
  booking?: Booking
  open: boolean
  onClose: () => void
}

export function PrenotazioneSheet({ trip, booking: b, open, onClose }: Props) {
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
  const [paidBy, setPaidBy] = useState(b?.paidBy ?? (b?.payerIds?.length === 1 ? b.payerIds[0] : b ? '' : (me?.id ?? (all.length === 1 ? all[0] : ''))))
  const [who, setWho] = useState<string[]>(b?.forTravelers?.length ? b.forTravelers : all)
  const [file, setFile] = useState<File | null>(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [offline, setOffline] = useState(b?.keepOffline ?? true)
  const [notes, setNotes] = useState(b?.notes ?? '')
  const [errors, setErrors] = useState<{ title?: string; when?: string; url?: string; cost?: string; paidBy?: string; party?: string; file?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const people = who.length === 0 ? all : who
  const nome = (id: string) => trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'
  const hasFile = !!b?.filePath && !removeFile

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!title.trim()) err.title = 'Scrivi un titolo, per esempio «Cena a Gion Karyo».'
    if (time && !date) err.when = 'Con l’ora serve anche la data.'
    else if (until && date && until < date) err.when = 'La fine non può essere prima dell’inizio.'
    if (url.trim() && !safeUrl(url)) err.url = 'Il link non è valido: scrivi un indirizzo che inizia con https://'
    const amount = parseAmount(cost)
    if (cost.trim() && amount === null) err.cost = 'Il costo non è chiaro: scrivi per esempio 45,00.'
    if (amount && !paidBy) err.paidBy = 'Manca chi ha pagato. Scegli una persona.'
    const n = party.trim() ? Number(party) : null
    if (n !== null && (!Number.isInteger(n) || n < 1)) err.party = 'Scrivi un numero di persone, per esempio 4.'
    if (file) err.file = checkFile(file) ?? undefined
    setErrors(err)
    if (Object.values(err).some(Boolean)) return
    const input: BookingInput = {
      type, title, code, url, validFrom: date, validTo: until, keepOffline: offline, notes,
      cost: amount, currency, scope, payerIds: amount !== null && paidBy ? [paidBy] : [], file, removeFile,
      time: date ? time : '', place, detail, partySize: n,
      paidBy: amount ? paidBy || undefined : (b?.paidBy ?? undefined),
      forTravelers: all.every((id) => people.includes(id)) ? [] : people,
    }
    setBusy(true)
    const message = b ? await tr.updateBooking(trip.id, b, input) : await tr.createBooking(trip.id, input)
    setBusy(false)
    if (message) return setErrors({ form: message })
    showToast(b ? 'Prenotazione aggiornata' : 'Prenotazione salvata')
    onClose()
  }

  return (
    <Foglio
      open={open}
      full
      title={b ? 'Modifica prenotazione' : 'Nuova prenotazione'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="prenotazione-form" isLoading={busy}>
          {busy ? 'Salvataggio…' : b ? 'Salva le modifiche' : 'Salva la prenotazione'}
        </Pulsante>
      }
    >
      <form id="prenotazione-form" className="frm" onSubmit={submit} noValidate>
        <div className="fa-fld" role="group" aria-label="Tipo">
          Tipo
          <div className="fa-chips scroll">
            {tipi.map((x) => (
              <Chip key={x} on={type === x} onPress={() => setType(x)}>{BOOKING_LABEL[x]}</Chip>
            ))}
          </div>
        </div>
        <Campo label="Titolo" value={title} onChange={setTitle} placeholder="Cena a Gion Karyo" error={errors.title} />
        <div className="fa-2c">
          <Campo label="Luogo" icon="pin" value={place} onChange={setPlace} placeholder="Gion" />
          <Campo label="Dettaglio" value={detail} onChange={setDetail} placeholder="Tavolo 6" maxLength={40} />
        </div>
        <div className="fa-2c">
          <Campo label="Data" type="date" icon="cal" value={date} onChange={(v) => (setDate(v), until && until < v ? setUntil(v) : null)} />
          <Campo label="Ora" type="time" icon="clock" value={time} onChange={setTime} />
          <Campo label="Fino al (facoltativo)" type="date" icon="cal" value={until} onChange={setUntil} min={date || undefined} />
          <Campo label="Persone" inputMode="numeric" value={party} onChange={setParty} placeholder="4" error={errors.party} />
        </div>
        {errors.when ? <Errore>{errors.when}</Errore> : null}
        <Campo label="Codice di conferma" value={code} onChange={(v) => setCode(v.toUpperCase())} autoComplete="off" />
        <Campo label="Link" type="url" value={url} onChange={setUrl} placeholder="https://…" error={errors.url} />
        <div className="fa-2c">
          <Campo label="Costo" inputMode="decimal" value={cost} onChange={setCost} placeholder="es. 45,00" error={errors.cost} />
          <div className="fa-fld">
            <label htmlFor="pr-val">Valuta</label>
            <span className="fa-in">
              <input id="pr-val" list="pr-valute" value={currency} onChange={(e) => setCurrency(e.currentTarget.value.toUpperCase().slice(0, 3))} maxLength={3} />
            </span>
          </div>
        </div>
        <div className="fa-chips" role="group" aria-label="Il costo è">
          <Chip on={scope === 'per_person'} onPress={() => setScope('per_person')}>A persona</Chip>
          <Chip on={scope === 'total'} onPress={() => setScope('total')}>Totale</Chip>
        </div>
        {cost.trim() ? (
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
        <div className="fa-fld">
          <label htmlFor="pr-file">Allegato (PDF o immagine, fino a 10 MB)</label>
          {hasFile && !file ? (
            <div className="fa-chips">
              <span className="fa-m">C’è un file salvato.</span>
              <Chip on={false} onPress={() => setRemoveFile(true)}>Rimuovi il file</Chip>
            </div>
          ) : null}
          {removeFile && !file ? <span className="fa-m">Il file verrà tolto al salvataggio. <button type="button" className="fa-lnk" onClick={() => setRemoveFile(false)}>Annulla</button></span> : null}
          <input id="pr-file" type="file" accept="application/pdf,image/*" onChange={(e) => (setFile(e.currentTarget.files?.[0] ?? null), setErrors({ ...errors, file: undefined }))} />
          {file ? <span className="fa-m">{hasFile ? 'Sostituirà il file attuale: ' : ''}{file.name}</span> : null}
          {errors.file ? <Errore>{errors.file}</Errore> : null}
        </div>
        <Interruttore label="Disponibile offline" hint="Il file resta sul telefono e si apre anche senza rete." isSelected={offline} onChange={setOffline} />
        <Campo label="Nota" textarea value={notes} onChange={setNotes} />
        {errors.form ? <Errore>{errors.form}</Errore> : null}
        <datalist id="pr-valute">{tripCurrencies(trip, b?.currency).map((c) => <option key={c} value={c} />)}</datalist>
      </form>
    </Foglio>
  )
}
