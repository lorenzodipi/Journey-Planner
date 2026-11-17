// Carta d'imbarco di un volo (componente Ticket, mock Fa-38 e Fa-57, #36). Chiusa: codici, orari, durata totale e scali.
// Aperta (mock «Carta d'imbarco per persona»): una carta per persona e per tratta. In alto la tratta (con scalo) e la
// persona; poi posto e stato del check-in, il QR o il codice a barre salvato (#38, si ingrandisce a schermo intero)
// o il riquadro per aggiungerlo, Terminal · Gate · Imbarco · Chiusura, lo scalo dopo la tratta; sotto bagaglio e
// tariffa, note, codice di prenotazione, il biglietto della persona, Maps e il PDF, Modifica il volo ed Elimina.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup } from 'react-aria-components'
import { airportCity } from '../lib/airports'
import { imageUrl } from '../lib/bookingFiles'
import { bigliettoPersona, linkFlightradar, modoPersone, nomiCorti, postoPersona, scaloDopo, statoCheckin, type StatoCheckin } from '../lib/cartaImbarco'
import { checkImmagine, codiceAltraTratta, codiciDi, codicePer } from '../lib/codici'
import { formatMoney } from '../lib/money'
import { durataLunga, fasciaScali, riepilogoVolo } from '../lib/voli'
import { discOf, initials, useMe } from '../state/me'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import type { Flight, Trip } from '../types'
import { Avatar, Avatars, Pulsante } from './base'
import { cx } from './cx'
import { Sv, type SvName } from './icons'
import { t } from '../i18n'

const PLANE = 'M482.3 192c34.2 0 93.7 29 93.7 64c0 36-59.5 64-93.7 64l-116.6 0L265.2 495.9c-5.7 10-16.3 16.1-27.8 16.1l-56.2 0c-10.6 0-18.3-10.2-15.4-20.4l49-171.6L112 320 68.8 377.6c-3 4-7.8 6.4-12.8 6.4l-42 0c-7.8 0-14-6.3-14-14c0-1.3 .2-2.6 .5-3.9L32 256 .5 145.9c-.4-1.3-.5-2.6-.5-3.9c0-7.8 6.3-14 14-14l42 0c5 0 9.8 2.4 12.8 6.4L112 192l102.9 0-49-171.6C162.9 10.2 170.6 0 181.2 0l56.2 0c11.5 0 22.1 6.2 27.8 16.1L365.7 192l116.6 0z'

interface Props {
  trip: Trip
  flight: Flight
  open: boolean
  onToggle: () => void
  onEdit: () => void
  /** Apre la carta d'imbarco a schermo intero, per la persona e (con scalo) la tratta scelte. */
  onCode: (who: string | undefined, leg: number | undefined) => void
  onDelete: () => void
  /** visualizzatore (0049): niente Modifica, Elimina e niente caricamento delle carte d'imbarco */
  lettura?: boolean
}

const PILLOLA: Record<StatoCheckin['tipo'], { cls: string; icon: SvName }> = {
  atterrato: { cls: 'ok', icon: 'check' },
  involo: { cls: 'neu', icon: 'plane' },
  fatto: { cls: 'ok', icon: 'check' },
  aprira: { cls: 'neu', icon: 'cal' },
  dafare: { cls: 'warn', icon: 'clock' },
}

/** Selettore a segmenti della carta (tratta o persona): RadioGroup. Se un nome non ci sta per intero si passa alla forma
 *  corta (iniziali per le persone, codici degli aeroporti per le tratte); se nemmeno così le voci ci stanno, il selettore
 *  scorre al suo interno, con una sfumatura dal lato in cui c'è ancora qualcosa da vedere. */
function Segmenti({ label, value, onChange, className, children }: { label: string; value: string; onChange: (v: string) => void; className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [lati, setLati] = useState({ sx: false, dx: false })
  // larghezza a cui i nomi interi non ci stavano: si torna ai nomi solo se il selettore diventa più largo
  const [stretto, setStretto] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const misura = () => {
      const w = el.clientWidth
      setStretto((s) => {
        if (s !== null) return w > s + 1 ? null : s
        const tagliato = [...el.querySelectorAll<HTMLElement>('.nm')].some((n) => n.offsetParent !== null && n.scrollWidth > n.clientWidth + 1)
        return tagliato ? w : null
      })
      const max = el.scrollWidth - el.clientWidth
      const sx = max > 1 && el.scrollLeft > 1
      const dx = max > 1 && el.scrollLeft < max - 1
      setLati((p) => (p.sx === sx && p.dx === dx ? p : { sx, dx }))
    }
    misura()
    el.addEventListener('scroll', misura, { passive: true })
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(misura)
    ro?.observe(el)
    return () => {
      el.removeEventListener('scroll', misura)
      ro?.disconnect()
    }
  }, [])
  // dopo il passaggio alla forma corta si rimisura (sfumature e scorrimento cambiano)
  useLayoutEffect(() => {
    ref.current?.dispatchEvent(new Event('scroll'))
  }, [stretto])
  return (
    <div className={cx('ci-seg', className, stretto !== null && 'stretto')}>
      <AriaRadioGroup ref={ref} className={cx('ci-segin', lati.sx && 'sx', lati.dx && 'dx')} aria-label={label} orientation="horizontal" value={value} onChange={onChange}>
        {children}
      </AriaRadioGroup>
    </div>
  )
}

/** Immagine salvata del codice (copia sul telefono se c'è, anche offline). */
function useImmagine(path: string | undefined) {
  const [src, setSrc] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  useEffect(() => {
    setSrc(null)
    setErrore(null)
    if (!path) return
    let url: string | null = null
    let stop = false
    imageUrl(path).then(
      (u) => (stop ? u.startsWith('blob:') && URL.revokeObjectURL(u) : ((url = u), setSrc(u))),
      (e: Error) => !stop && setErrore(e.message),
    )
    return () => {
      stop = true
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    }
  }, [path])
  return { src, errore }
}

export function CartaVolo({ trip, flight, open, onToggle, onEdit, onDelete, onCode, lettura }: Props) {
  const tr = useTrips()
  const me = useMe(trip)
  const r = riepilogoVolo(flight)
  const scalo = fasciaScali(r.scali)
  const people = flight.forTravelers?.length ? flight.forTravelers : trip.travelers.map((p) => p.id)
  const names = people.map((id) => trip.travelers.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
  const brand = flight.airline?.trim() || t('Volo')
  const numeri = r.numeri.length > 0 ? `${flight.airline ? t('Volo ') : ''}${r.numeri.join(' · ')}` : flight.airline ? '' : flight.title

  const [legIdx, setLegIdx] = useState(0)
  const [scelto, setScelto] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const multiLeg = flight.legs.length > 1
  const li = Math.min(legIdx, flight.legs.length - 1)
  const leg = flight.legs[li]
  const seq = multiLeg ? leg.seq : undefined
  const who = scelto && names.some((p) => p.id === scelto) ? scelto : (names.find((p) => p.id === me?.id) ?? names[0])?.id
  const persona = names.find((p) => p.id === who)
  const corti = nomiCorti(names)
  const modo = modoPersone(names.map((p) => corti[p.id]))
  const codes = codiciDi(trip, 'flight', flight.id)
  const codice = codicePer(codes, who, seq)
  const stato = statoCheckin(leg, Boolean(codice), flight.checkinAt)
  const partito = stato.tipo === 'atterrato' || stato.tipo === 'involo'
  const { src, errore } = useImmagine(open && codice && stato.tipo !== 'atterrato' ? codice.filePath : undefined)
  const altra = multiLeg && !codice ? codiceAltraTratta(codes, who, leg.seq) : undefined
  const legAltra = altra ? flight.legs.find((l) => l.seq === altra.leg) : undefined
  const rotta = (l: { from: string; to: string }) => `${airportCity(l.from)} → ${airportCity(l.to)}`

  const posto = postoPersona(leg, who)
  const nome = persona ? corti[persona.id] : ''
  const etichettaPosto = (() => {
    const base = names.length > 1 && modo === 'iniziali' ? t('Posto di {nome}', { nome }) : names.length === 1 && persona && persona.id === me?.id ? t('Il tuo posto') : t('Posto')
    return multiLeg && leg.flightNumber ? `${base} · ${leg.flightNumber}` : base
  })()
  const senzaPosto = !posto && stato.tipo === 'aprira'
  const dopo = scaloDopo(flight, li, durataLunga)
  const note = [flight.notes, leg.notes].map((x) => x?.trim()).filter(Boolean).join('\n')
  const prezzo = bigliettoPersona(flight, names.length || 1)
  const radar = linkFlightradar(leg.flightNumber)
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${airportCity(leg.from)} ${leg.from} aeroporto${leg.terminal ? ` terminal ${leg.terminal}` : ''}`)}`

  async function aggiungi(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      let f = file
      if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        try {
          const { primaPaginaPng } = await import('../lib/pdfImmagine')
          f = await primaPaginaPng(file)
        } catch {
          return showToast(t('Non riesco a leggere questo PDF: prova con una foto o uno screenshot del QR.'))
        }
      }
      const bad = checkImmagine(f)
      if (bad) return showToast(bad)
      const m = await tr.saveTicketCode(trip.id, 'flight', flight.id, who ?? null, f, undefined, seq)
      showToast(m ?? t('Carta d\'imbarco salvata sul telefono'))
    } finally {
      setBusy(false)
    }
  }

  async function usaAltra() {
    if (!altra) return
    setBusy(true)
    const m = await tr.setTicketCodeLeg(altra, null)
    setBusy(false)
    showToast(m ?? t('Ora la stessa carta d\'imbarco vale per tutte le tratte'))
  }

  async function copia(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      showToast(t('Codice copiato'))
    } catch {
      showToast(t('Non riesco a copiare: seleziona il codice a mano.'))
    }
  }

  const cta = (() => {
    if (codice || lettura || stato.tipo !== 'dafare') return null
    if (altra) {
      const prima = altra.leg === 1
      return {
        titolo: t('Carta d\'imbarco per {rotta}', { rotta: rotta(leg) }),
        testo: prima ? t('Hai caricato il QR della prima tratta. Se la compagnia ne ha dato uno per ogni volo aggiungi questo, altrimenti usa lo stesso.') : t('Hai caricato il QR di {rotta}. Se la compagnia ne ha dato uno per ogni volo aggiungi questo, altrimenti usa lo stesso.', { rotta: legAltra ? rotta(legAltra) : '' }),
        usa: prima ? t('Usa quella della prima tratta') : t('Usa quella di {rotta}', { rotta: legAltra ? rotta(legAltra) : '' }),
      }
    }
    if (names.length > 1 && modo === 'iniziali') return { titolo: t('{nome} non ha ancora la carta d\'imbarco', { nome }), testo: t('Dopo il check-in aggiungi qui il suo QR o il PDF: si aprirà anche senza rete.') }
    return { titolo: t('Nessuna carta d\'imbarco'), testo: t('Dopo il check-in aggiungi qui il QR o il PDF: si aprirà anche senza rete.') }
  })()

  const pill = PILLOLA[stato.tipo]
  const condiviso = multiLeg && li > 0 && codice && !codice.leg
  const bottoni = [!partito, !!radar].filter(Boolean).length

  return (
    <div className="k-Ticket">
      <div className="tk">
        <div className={open ? 'a v-top' : 'a v-top closed'}>
          <div className="hd">
            <span className="brand">{flight.airline?.trim() ? brand : flight.title}</span>
            <span className="fl">{numeri}</span>
          </div>
          <div className="body">
            <button type="button" aria-expanded={open} aria-label={t('{title}: da {fromCity} a {toCity}', { title: flight.title, fromCity: r.fromCity, toCity: r.toCity })} onClick={onToggle} style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}>
              <div className="rt" data-adatta="">
                <div className="pt">
                  <div className="code">{r.from}</div>
                  <div className="city">{r.fromCity}</div>
                  <div className="time">{r.departTime}</div>
                </div>
                <div className="mid">
                  <span className="dot" />
                  <span className="ln" />
                  <span className="pl">
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 576 512">
                      <path d={PLANE} fill="currentColor" />
                    </svg>
                  </span>
                  <span className="ln" />
                  <span aria-hidden="true" className="hole" />
                  <div className="dur">{r.duration}</div>
                </div>
                <div className="pt r">
                  <div className="code">{r.to}</div>
                  <div className="city">{r.toCity}</div>
                  <div className="time">
                    {r.arriveTime}
                    {r.plus > 0 ? <sup style={{ marginLeft: 2, fontSize: 12 }}>+{r.plus}</sup> : null}
                  </div>
                </div>
              </div>
              {scalo ? (
                <div className="stop">
                  <Sv name="plane" size={16} />
                  <span>
                    <b>{scalo.titolo}</b> · {scalo.resto}
                  </span>
                </div>
              ) : null}
              <div className="pax">
                <span>
                  {names.length === 1 ? (
                    <b>{names[0].name}</b>
                  ) : (
                    <Avatars people={names.map((p) => ({ initials: initials(p.name), n: discOf(trip, p.id) }))} ring={false} label={names.map((p) => p.name).join(', ')} max={4} />
                  )}
                </span>
                {/* niente data accanto alla freccia: è già nel titolo del gruppo sopra la carta */}
                <span className="dt">
                  <span aria-hidden="true" className={open ? 'tgl up' : 'tgl'}>
                    <Sv name="chev" size={20} />
                  </span>
                </span>
              </div>
            </button>
          </div>
        </div>
        {open ? (
          <div className="b ci">
            {multiLeg ? (
              <Segmenti label={t('Tratta')} className={cx('tratte', flight.legs.length > 2 && 'n3')} value={leg.id} onChange={(id) => setLegIdx(Math.max(0, flight.legs.findIndex((l) => l.id === id)))}>
                {flight.legs.map((l) => (
                  <AriaRadio key={l.id} value={l.id} className={({ isSelected }) => cx('ci-opz', isSelected && 'on')} aria-label={rotta(l)}>
                    {flight.legs.length > 2 ? null : <span className="nm">{rotta(l)}</span>}
                    <span className="nc">{`${l.from} → ${l.to}`}</span>
                  </AriaRadio>
                ))}
              </Segmenti>
            ) : null}

            {names.length > 1 ? (
              <Segmenti label={t('Carta d\'imbarco di')} className={cx('persone', modo)} value={who ?? ''} onChange={setScelto}>
                {names.map((p) => {
                  const daFare = statoCheckin(leg, Boolean(codicePer(codes, p.id, seq)), flight.checkinAt).tipo === 'dafare'
                  return (
                    <AriaRadio key={p.id} value={p.id} className={({ isSelected }) => cx('ci-opz', isSelected && 'on')} aria-label={daFare ? t('{nome}, check-in da fare', { nome: p.name }) : p.name}>
                      <span className="ci-av">
                        <Avatar initials={initials(p.name)} n={discOf(trip, p.id)} />
                        {daFare ? <span className="ci-todo" aria-hidden="true" /> : null}
                      </span>
                      <span className="nm">{corti[p.id]}</span>
                    </AriaRadio>
                  )
                })}
              </Segmenti>
            ) : null}

            <div className="ci-posto">
              <div className="ci-p">
                <span className="k">{etichettaPosto}</span>
                <span className={cx('ci-num', !posto && 'vuoto')} data-adatta="">{posto ?? '—'}</span>
                {senzaPosto ? <span className="s">{t('Si sceglie al check-in')}</span> : null}
              </div>
              <div className="ci-st">
                <span className={cx('ci-pill', pill.cls)}>
                  <Sv name={pill.icon} size={14} />
                  {stato.testo}
                </span>
                {senzaPosto && stato.apre ? <span className="s">{stato.apre}</span> : null}
              </div>
            </div>

            {codice && stato.tipo !== 'atterrato' ? (
              <div className="ci-cod">
                <button type="button" className="ci-qr" aria-label={t('Mostra la carta d\'imbarco a schermo intero')} onClick={() => onCode(who, seq)}>
                  {src ? <img src={src} alt="" /> : <span className="s">{errore ?? t('Sto aprendo il codice…')}</span>}
                </button>
                <p className="s">{condiviso ? t('È la stessa carta d\'imbarco della prima tratta. Tocca il codice per ingrandirlo.') : t('Tocca il codice per ingrandirlo. Si apre anche senza rete.')}</p>
              </div>
            ) : null}

            {cta ? (
              <div className="ci-cta">
                <div className="ci-ctat">
                  <b>{cta.titolo}</b>
                  <span className="s">{cta.testo}</span>
                </div>
                <input ref={input} type="file" accept="image/*,application/pdf" hidden aria-label={t('QR, PDF o foto della carta d\'imbarco')} onChange={(e) => (void aggiungi(e.currentTarget.files?.[0]), (e.currentTarget.value = ''))} />
                <Pulsante size="sm" iconLeading="upload" isLoading={busy} onPress={() => input.current?.click()}>
                  {t('Aggiungi la carta d\'imbarco')}
                </Pulsante>
                {cta.usa ? (
                  <Pulsante size="sm" color="secondary" iconLeading="copy" isDisabled={busy} onPress={() => void usaAltra()}>
                    {cta.usa}
                  </Pulsante>
                ) : null}
              </div>
            ) : null}

            <div>
              <div className="grid ci-grid" data-adatta="celle">
                {[
                  [t('Terminal'), leg.terminal],
                  [t('Gate'), leg.gate],
                  [t('Imbarco'), leg.boardingTime],
                  [t('Chiusura'), leg.gateClose],
                ].map(([k, v]) => (
                  <div className="f" key={k}>
                    <div className="k">{k}</div>
                    <div className="v">{v?.trim() || '—'}</div>
                  </div>
                ))}
              </div>
              {!leg.gate?.trim() && !partito ? <p className="s ci-nota">{t('Il gate compare di solito un\'ora prima della partenza.')}</p> : null}
            </div>

            {dopo ? (
              <div className="ci-scalo">
                <b>{dopo.titolo}</b>
                <span>{dopo.testo}</span>
              </div>
            ) : null}

            <hr className="ci-hr" />

            {flight.baggage?.trim() || flight.policy?.trim() ? (
              <div className="ci-sez">
                <h3 className="ci-sec">{t('Bagaglio e tariffa')}</h3>
                {flight.baggage?.trim() ? (
                  <div className="ci-row">
                    <Sv name="valigia" size={20} />
                    <span>{flight.baggage.trim()}</span>
                  </div>
                ) : null}
                {flight.policy?.trim() ? (
                  <div className="ci-row">
                    <Sv name="righe" size={20} />
                    <span>{flight.policy.trim()}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {note ? (
              <div className="ci-sez">
                <h3 className="ci-sec">{t('Note')}</h3>
                <p className="ci-note">{note}</p>
              </div>
            ) : null}

            {flight.bookingRef?.trim() ? (
              <div className="ci-box">
                <div className="ci-pnr">
                  <span className="k">{t('Codice di prenotazione')}</span>
                  <span className="v">{flight.bookingRef.trim()}</span>
                </div>
                <button type="button" className="fa-lnk" aria-label={t('Copia il codice di prenotazione')} onClick={() => void copia(flight.bookingRef?.trim() ?? '')}>
                  <Sv name="copy" size={16} />
                  {t('Copia')}
                </button>
              </div>
            ) : null}

            {prezzo != null ? (
              <div className="ci-prezzo">
                <span>{names.length > 1 && nome ? t('Biglietto di {nome}', { nome }) : t('Biglietto')}</span>
                <b>{formatMoney(prezzo, flight.currency)}</b>
              </div>
            ) : null}

            {bottoni > 0 ? (
              <div className={cx('ci-btns', bottoni > 1 && 'n2')}>
                {!partito ? (
                  <Pulsante size="sm" color="secondary" iconLeading="pin" href={maps} target="_blank" aria-label={t('Apri l\'aeroporto di {city} in Maps', { city: airportCity(leg.from) })}>
                    {t('Maps')}
                  </Pulsante>
                ) : null}
                {radar ? (
                  <Pulsante size="sm" color="secondary" iconLeading="radar" href={radar} target="_blank" aria-label={t('Segui il volo {numero} su Flightradar24', { numero: leg.flightNumber?.trim() ?? '' })}>
                    {t('Segui il volo')}
                  </Pulsante>
                ) : null}
              </div>
            ) : null}

            {lettura ? null : (
              <div className="ci-fine">
                <button type="button" className="fa-lnk" onClick={onEdit}>
                  {t('Modifica il volo')}
                </button>
                <button type="button" className="fa-lnk dng" onClick={onDelete}>
                  {t('Elimina')}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
