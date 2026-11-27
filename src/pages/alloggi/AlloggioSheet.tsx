// Foglio «Nuovo alloggio» / «Modifica alloggio» (#39, #58), a gruppi: Dove (prima il link di Google Maps, che compila il
// resto), Quando (check-in → check-out con le notti), Costo, Camera e contatti, Accesso e Wi-Fi, Altri dettagli (persone nella
// prenotazione, telefono, email, chi dorme qui).
import { useConflitto } from '../../faraway/useConflitto'
import { DocumentiCollegati } from '../documenti/DocumentiCollegati'
import { useRef, useState, type ReactNode } from 'react'
import type { StayInput } from '../../lib/logistics'
import { leggiCodici, scriviCodici } from '../../lib/codiciAccesso'
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
import { totaleVoce, usePagamentoVoce } from '../spese/pagamentoVoce'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { t } from '../../i18n'

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
    if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl)\//i.test(text)) return setMapsInfo(t('Link corto: apri il link, copia quello completo dalla barra del browser e incollalo qui per compilare i campi.'))
    const info = parseMapsUrl(text)
    if (!info) return
    if (info.name && !name.trim()) setName(info.name)
    if (city.trim() && address.trim()) return setMapsInfo(t('Link letto.'))
    setMapsInfo(t('Leggo l’indirizzo…'))
    try {
      const r = await reverseGeocode(info.lat, info.lng)
      if (!city.trim() && r.city) setCity(r.city)
      if (!address.trim() && r.address) setAddress(r.address)
      setMapsInfo(r.address || r.city ? t('Campi compilati dal link: controlla che siano giusti.') : t('Link letto, ma non trovo l’indirizzo: scrivilo a mano.'))
    } catch {
      setMapsInfo(t('Link letto, ma non riesco a leggere l’indirizzo ora: scrivilo a mano.'))
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
  // più codici d'ingresso (portone, stanza…): `nuovo` dà il focus al campo appena aggiunto
  const chiaveCodice = useRef(0)
  const [codici, setCodici] = useState<{ k: number; nome: string; codice: string; nuovo?: boolean }[]>(() => {
    const letti = leggiCodici(s?.accessCode)
    return (letti.length > 0 ? letti : [{ nome: '', codice: '' }]).map((c) => ({ ...c, k: chiaveCodice.current++ }))
  })
  // il nome del codice si chiede quando ce n'è più d'uno (o uno ha già il suo nome) e non sparisce più mentre si scrive
  const [conNomi, setConNomi] = useState(() => codici.length > 1 || Boolean(codici[0]?.nome))
  const cambiaCodice = (k: number, cambia: { nome?: string; codice?: string }) => setCodici((v) => v.map((c) => (c.k === k ? { ...c, ...cambia, nuovo: false } : c)))
  const [wifi, setWifi] = useState(s?.wifiName ?? '')
  const [wifiPw, setWifiPw] = useState(s?.wifiPassword ?? '')
  const [dorme, setDorme] = useState<string[]>(s?.participants ?? [])
  const [code, setCode] = useState(s?.bookingCode ?? '')
  const [cost, setCost] = useState(amountToText(s?.totalCost))
  const [currency, setCurrency] = useState(s?.currency ?? trip.localCurrency ?? trip.baseCurrency)
  const [paid, setPaid] = useState(s?.paid ?? false)
  const [who, setWho] = useState<string[]>(s?.forTravelers?.length ? s.forTravelers : all)
  const [breakfast, setBreakfast] = useState(s?.breakfast ?? false)
  const [dinner, setDinner] = useState(s?.dinner ?? false)
  const [kitchen, setKitchen] = useState(s?.kitchen ?? false)
  const [notes, setNotes] = useState(s?.notes ?? '')
  const [errors, setErrors] = useState<{ guests?: string; email?: string; name?: string; when?: string; cost?: string; paidBy?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const people = who.length === 0 ? all : who
  const nome = (id: string) => trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'
  const pag = usePagamentoVoce({ trip, voce: s, meId: me?.id, people, totale: totaleVoce(cost, 'total', people.length), currency })

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!name.trim()) err.name = t('Scrivi il nome dell’alloggio.')
    if (!checkIn || !checkOut) err.when = t('Scegli le date di check-in e di check-out.')
    else if (checkOut <= checkIn) err.when = t('Il check-out deve essere dopo il check-in.')
    const amount = parseAmount(cost)
    if (cost.trim() && amount === null) err.cost = t('Il costo non è chiaro: scrivi per esempio 450,00.')
    const pc = paid && amount ? pag.controlla() : null
    if (pc) Object.assign(err, pc)
    const ospiti = guests.trim() ? Number(guests) : null
    if (ospiti !== null && (!Number.isInteger(ospiti) || ospiti < 1 || ospiti > 99)) err.guests = t('Scrivi quante persone, per esempio 2.')
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) err.email = t('L’email non è valida: controlla la chiocciola e il dominio.')
    setErrors(err)
    if (Object.keys(err).length > 0 || pc === false) return
    const v = pag.valori()
    const input: StayInput = {
      name, city, checkIn, checkOut, checkInInfo: inInfo, checkOutInfo: outInfo, address, mapsUrl,
      totalCost: amount, currency, breakfast, dinner, kitchen, booked: true, paid, notes,
      room, roomType, bookingCode: code, guests: ospiti, phone, email, participants: dorme,
      accessCode: scriviCodici(codici), wifiName: wifi, wifiPassword: wifiPw,
      ...(paid && amount
        ? { paidBy: v.paidBy ?? v.payerIds[0], payerAmounts: v.payerAmounts, splitMode: v.splitMode, splitShares: v.splitShares }
        : { paidBy: s?.paidBy ?? undefined, payerAmounts: s?.payerAmounts, splitMode: s?.splitMode, splitShares: s?.splitShares }),
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
    showToast(s ? t('Alloggio aggiornato') : t('Alloggio salvato'))
    onClose()
  }

  const amountNow = parseAmount(cost)
  const altri = compilati([guests, phone, email, dorme])
  const puoiIncollare = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText
  async function incolla() {
    try {
      const v = (await navigator.clipboard.readText()).trim()
      if (!v) return showToast(t('Negli appunti non c’è niente da incollare.'))
      await leggiLink(v)
    } catch {
      showToast(t('Non riesco a leggere gli appunti: incolla il link nel campo.'))
    }
  }
  const ora = (label: string, v: string, set: (v: string) => void) => (
    <Campo label={label} icon="clock" type={soloOra(v) ? 'time' : 'text'} value={v} onChange={set} hint={soloOra(v) ? undefined : t('Scritto a mano: cancellalo per scegliere un orario.')} />
  )
  /** Data e ora affiancate; un orario scritto a mano («15:00–22:00») va sotto, a tutta larghezza, per leggersi intero. */
  const dataOra = (data: ReactNode, v: string, set: (v: string) => void) => (
    <div className="dt" style={soloOra(v) ? undefined : { gridTemplateColumns: 'minmax(0,1fr)' }}>
      {data}
      {ora(t('Ora'), v, set)}
    </div>
  )
  const aTesta = amountNow && people.length > 1 ? t(': {v0} a testa', { v0: formatMoney(Math.round((amountNow / people.length) * 100) / 100, currency) }) : ''

  return (
    <Foglio
      open={open}
      full
      title={s ? t('Modifica alloggio') : t('Nuovo alloggio')}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="alloggio-form" isLoading={busy}>
          {s ? t('Salva le modifiche') : t('Salva l’alloggio')}
        </Pulsante>
      }
    >
      <form id="alloggio-form" className="frm grp" onSubmit={submit} noValidate>
        <Gruppo titolo={t('Dove')}>
          <Campo
            label={t('Link di Google Maps')}
            icon="link"
            type="url"
            value={mapsUrl}
            onChange={(v) => void leggiLink(v)}
            placeholder={t('Incolla il link')}
            autoComplete="off"
            hint={mapsInfo || t('Incollalo e compilo da solo nome, città e indirizzo.')}
            trailing={
              puoiIncollare && !mapsUrl.trim() ? (
                <button type="button" className="fa-btn soft sm" style={{ minHeight: 36, padding: '0 16px' }} onClick={() => void incolla()}>
                  {t('Incolla')}
                </button>
              ) : undefined
            }
          />
          <Campo label={t('Nome')} value={name} onChange={setName} placeholder={t('es. Hotel del centro')} error={errors.name} />
          <div className="fa-2c">
            <Campo label={t('Città')} icon="pin" value={city} onChange={setCity} placeholder={t('Città')} />
            <Campo label={t('Indirizzo')} value={address} onChange={setAddress} placeholder={t('Via e numero')} />
          </div>
        </Gruppo>
        <Gruppo titolo={t('Quando')}>
          <Percorso
            durata={nottiTesto(checkIn, checkOut)}
            da={{
              titolo: 'Check-in',
              children: (
                dataOra(<Campo label={t('Data')} type="date" icon="cal" value={checkIn} onChange={(v) => (setCheckIn(v), !checkOut || checkOut <= v ? setCheckOut('') : null)} />, inInfo, setInInfo)
              ),
            }}
            a={{
              titolo: 'Check-out',
              children: (
                dataOra(<Campo label={t('Data')} type="date" icon="cal" value={checkOut} onChange={setCheckOut} min={checkIn || undefined} />, outInfo, setOutInfo)
              ),
            }}
          />
          {errors.when ? <Errore>{errors.when}</Errore> : null}
        </Gruppo>
        <Gruppo titolo={t('Costo')}>
          <PerChi trip={trip} meId={me?.id} value={people} onChange={setWho} />
          <div className="fa-2c">
            <Campo label={t('Costo')} importo value={cost} onChange={setCost} placeholder={t('es. 450,00')} error={errors.cost} />
            <CampoValuta value={currency} onChange={setCurrency} valute={tripCurrencies(trip, s?.currency)} />
          </div>
          <span className="fa-help" style={{ marginTop: -8 }}>{t('Per tutto il soggiorno{aTesta}.', { aTesta })}</span>
          <Interruttore label={t('Pagato')} hint={paid ? t('Con un costo, l’alloggio diventa una spesa.') : t('Non pagato')} isSelected={paid} onChange={setPaid} />
          {paid && cost.trim() ? pag.vista(errors.paidBy) : null}
        </Gruppo>
        <Gruppo titolo={t('Camera e contatti')}>
          <div className="fa-2c">
            <Campo label={t('Tipo di camera')} value={roomType} onChange={setRoomType} placeholder={t('es. Doppia')} />
            <Campo label={t('Camera')} value={room} onChange={setRoom} placeholder={t('es. 402')} maxLength={10} />
          </div>
          <Campo label={t('Codice di prenotazione')} value={code} onChange={(v) => setCode(v.toUpperCase())} autoComplete="off" placeholder={t('es. 4K7QX2')} />
          <div className="fa-fld" role="group" aria-label={t('Pasti e servizi')}>
            {t('Pasti e servizi')}
            <div className="fa-chips wrap">
              <Chip on={breakfast} onPress={() => setBreakfast(!breakfast)}>{t('Colazione')}</Chip>
              <Chip on={dinner} onPress={() => setDinner(!dinner)}>{t('Cena')}</Chip>
              <Chip on={kitchen} onPress={() => setKitchen(!kitchen)}>{t('Cucina')}</Chip>
            </div>
          </div>
          <Campo label={t('Note')} textarea value={notes} onChange={setNotes} placeholder={t('es. Deposito bagagli dopo il check-out')} />
        </Gruppo>
        <Gruppo titolo={t('Accesso e Wi-Fi')}>
          {codici.map((c, i) => (
            <div key={c.k} style={{ display: 'grid', gap: 16 }}>
              {conNomi ? (
                <Campo label={t('Nome del codice {n}', { n: i + 1 })} value={c.nome} onChange={(v) => cambiaCodice(c.k, { nome: v })} autoComplete="off" placeholder={i === 0 ? t('es. Portone') : t('es. Stanza')} autoFocus={c.nuovo} />
              ) : null}
              <Campo
                label={conNomi ? t('Codice d\'accesso {n}', { n: i + 1 }) : t('Codice d\'accesso')}
                value={c.codice}
                onChange={(v) => cambiaCodice(c.k, { codice: v })}
                autoComplete="off"
                placeholder={t('es. 4821')}
                hint={conNomi ? undefined : t('Della porta o della cassetta delle chiavi.')}
              />
              {codici.length > 1 ? (
                <button type="button" className="fa-lnk" style={{ color: 'var(--danger)', justifySelf: 'start', paddingLeft: 0 }} aria-label={t('Togli il codice {n}', { n: i + 1 })} onClick={() => setCodici((v) => v.filter((x) => x.k !== c.k))}>
                  {t('Togli')}
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="fa-lnk"
            style={{ justifySelf: 'start', paddingLeft: 0 }}
            onClick={() => {
              setConNomi(true)
              setCodici((v) => [...v, { k: chiaveCodice.current++, nome: '', codice: '', nuovo: true }])
            }}
          >
            {t('Aggiungi un altro codice d\'ingresso')}
          </button>
          <Campo label={t('Rete Wi-Fi')} value={wifi} onChange={setWifi} autoComplete="off" placeholder={t('es. Nome della rete')} />
          <Campo label={t('Password Wi-Fi')} value={wifiPw} onChange={setWifiPw} autoComplete="off" placeholder={t('es. Password della rete')} />
          <p className="fa-help">{t('Li vedono solo i viaggiatori, non chi segue il viaggio.')}</p>
        </Gruppo>
        <AltriDettagli pieni={altri} contenuto={trip.travelers.length > 1 ? t('Persone, telefono, email, chi dorme qui') : t('Persone, telefono, email')} errore={errors.email || errors.guests ? errors : undefined}>
          <Contatore label={t('Persone nella prenotazione')} value={guests.trim() && Number.isFinite(Number(guests)) ? Number(guests) : null} onChange={(n) => setGuests(n === null ? '' : String(n))} vuoto />
          {errors.guests ? <Errore>{errors.guests}</Errore> : null}
          <Campo label={t('Telefono')} type="tel" value={phone} onChange={setPhone} placeholder={t('es. +39 333 123 4567')} />
          <Campo label={t('Email')} type="email" value={email} onChange={setEmail} placeholder={t('nome@esempio.it')} error={errors.email} />
          {trip.travelers.length > 1 ? (
            <div className="fa-fld" role="group" aria-label={t('Chi dorme qui')}>
              {t('Chi dorme qui')}
              <div className="fa-chips wrap">
                {trip.travelers.map((p) => (
                  <Chip key={p.id} on={dorme.includes(p.id)} onPress={() => setDorme(dorme.includes(p.id) ? dorme.filter((x) => x !== p.id) : [...dorme, p.id])}>{nome(p.id)}</Chip>
                ))}
              </div>
              <span className="fa-help">{t('Solo informativo: non cambia la copertura delle notti.')}</span>
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
