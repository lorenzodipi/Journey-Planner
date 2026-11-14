// Pagina Prenotazioni (mock Fa-44, #40): pillole per tipo e biglietti per giorno, come quelli dei trasporti.
// Chiuso: tipo, titolo, stato, quando e codice. Aperto in linea: costo, dati e azioni (Copia, Codice, Link, File,
// Collega/Scollega una tappa, Modifica, Elimina).
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import { BOOKING_BUDGET_CATEGORY, BOOKING_LABEL } from '../../lib/bookingMeta'
import { isFileCached, openBookingFile } from '../../lib/bookingFiles'
import { formatShort } from '../../lib/dates'
import { dateInZone } from '../../lib/flights'
import { formatMoney } from '../../lib/money'
import { FILTRI, FILTRI_VUOTI, filtraArchivio, giornoDellaTappa, mancanti, nelFiltro, oraPrenotazione, perGiorno, quando, sottotitolo, STATO_LABEL, statoDi, tappeDi, type FiltriArchivio, type FiltroPrenotazioni } from '../../lib/prenotazioni'
import { CATEGORIE_BASE } from '../../lib/ricevuta'
import { tripToday } from '../../lib/today'
import { conDipendenze, dipendenze } from '../../lib/registro'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import type { Booking } from '../../types'
import { Ic } from '../../ui/Sprite'
import { Campo, Chip, Pulsante } from '../../faraway/base'
import { CodiceBiglietto } from '../../faraway/CodiceBiglietto'
import { cx } from '../../faraway/cx'
import { useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { useUnaAperta } from '../../faraway/Righe'
import { Affianca, BarraIndietro, Schermata } from '../../faraway/shell'
import { Vuoto, VuotoFiltro } from '../../faraway/Stati'
import { giornoSpese } from '../spese/testi'
import { filtriAttivi, FiltriPrenotazioniSheet } from './FiltriSheet'
import { PrenotazioneSheet } from './PrenotazioneSheet'
import { useInCorso } from '../../faraway/Attesa'

const icona = (b: Booking) => CATEGORIE_BASE.find((c) => c.label === BOOKING_BUDGET_CATEGORY[b.type])?.icon ?? 'i-sez-ticket'

export function PrenotazioniPage() {
  const trip = useTrip()
  const t = useTrips()
  const [ask, confirmNode] = useConferma()
  const open = useUnaAperta()
  const [filtro, setFiltro] = useState<FiltroPrenotazioni>('all')
  const [sheet, setSheet] = useState<{ booking?: Booking } | null>(null)
  const [codice, setCodice] = useState<Booking | null>(null)
  const [arch, setArch] = useState<FiltriArchivio>(FILTRI_VUOTI)
  const [offline, setOffline] = useState<Set<string>>(new Set())
  const [filtriOpen, setFiltriOpen] = useState(false)
  const attivi = filtriAttivi(arch)
  const today = tripToday(trip)
  const tz = trip.timezone
  const shown = useMemo(() => filtraArchivio(trip.bookings, arch).filter((b) => nelFiltro(b, filtro)), [trip.bookings, filtro, arch])
  const gruppi = useMemo(() => perGiorno(shown, tz), [shown, tz])

  // da un link (es. «Prossima prenotazione» in Oggi): la prenotazione indicata si apre da sola e la pagina scorre fino a lei.
  // Il parametro si toglie subito, anche se la prenotazione non c'è più, così ricaricando non succede di nuovo.
  const search = useSearch()
  const [, navigate] = useLocation()
  const daAprire = new URLSearchParams(search).get('apri')
  useEffect(() => {
    if (!daAprire) return
    navigate('/altro/prenotazioni', { replace: true })
    if (!trip.bookings.some((b) => b.id === daAprire)) return
    setFiltro('all')
    setArch(FILTRI_VUOTI)
    open.setOpen(daAprire)
    // dopo il rendering con i filtri azzerati la riga esiste: si scorre fin lì
    window.setTimeout(() => {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      document.getElementById(`prenotazione-${daAprire}`)?.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
    }, 60)
  }, [daAprire]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void Promise.all(trip.bookings.filter((b) => b.filePath).map(async (b) => ((await isFileCached(b.filePath as string)) ? (b.filePath as string) : null))).then((r) => setOffline(new Set(r.filter((x): x is string => !!x))))
  }, [trip.bookings])

  async function copia(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      showToast('Codice copiato')
    } catch {
      showToast('Non riesco a copiare: seleziona il codice a mano.')
    }
  }
  async function apri(b: Booking) {
    try {
      await openBookingFile(b.filePath as string)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Non riesco ad aprire il file.')
    }
  }
  const [occ, faiOcc] = useInCorso()
  async function scollega(b: Booking, itemId: string) {
    // BOOK-027: scollegare non elimina né la prenotazione né la tappa
    const m = await faiOcc(`scollega:${itemId}`, () => t.setBookingItems(trip.id, b.id, tappeDi(trip, b.id).filter((x) => x !== itemId)))
    showToast(m ?? 'Prenotazione scollegata')
  }
  async function elimina(b: Booking) {
    const ok = await ask({ title: 'Eliminare la prenotazione?', message: conDipendenze(`${b.title} sparisce dalle prenotazioni${b.cost != null ? ' e dalle spese' : ''}; le tappe collegate restano. Puoi annullare subito dopo.`, dipendenze(trip, 'prenotazione', b.id)), confirm: 'Elimina la prenotazione', cancel: 'Tieni la prenotazione', destructive: true })
    if (!ok) return
    const m = await faiOcc(`elimina:${b.id}`, () => t.setBookingDeleted(b.id, true))
    showToast(m ?? 'Prenotazione eliminata', m ? undefined : { label: 'Annulla', run: () => void t.setBookingDeleted(b.id, false) })
  }

  return (
    <Schermata
      bar={<BarraIndietro title="Prenotazioni" back="/altro" />}
      fab={trip.bookings.length === 0 ? null : { label: 'Prenotazione', aria: 'Aggiungi una prenotazione', onPress: () => setSheet({}) }}
      overlay={
        <>
          {sheet ? <PrenotazioneSheet key={sheet.booking?.id ?? 'new'} trip={trip} booking={sheet.booking} open onClose={() => setSheet(null)} /> : null}
          {codice ? <CodiceBiglietto key={codice.id} trip={trip} kind="booking" refId={codice.id} title={codice.title} when={codice.validFrom ? [giornoSpese(dateInZone(codice.validFrom, tz), today), oraPrenotazione(codice, tz)].filter(Boolean).join(', ') : undefined} detail={codice.code} travelerIds={codice.forTravelers} open onClose={() => setCodice(null)} /> : null}
          {filtriOpen ? <FiltriPrenotazioniSheet bookings={trip.bookings.filter((b) => nelFiltro(b, filtro))} filters={arch} onApply={(f) => (setArch(f), open.setOpen(null))} onClose={() => setFiltriOpen(false)} /> : null}
          {confirmNode}
        </>
      }
    >
      {trip.bookings.length > 0 ? (
        <>
          <Campo label="Cerca" hideLabel icon="search" value={arch.q} onChange={(q) => setArch({ ...arch, q })} placeholder="Cerca titolo, luogo, codice" />
          <div className="fa-frow">
            <button type="button" className={cx('fa-fbtn', attivi > 0 && 'on')} aria-label={attivi > 0 ? `Apri i filtri, ${attivi} attivi` : 'Apri i filtri'} onClick={() => setFiltriOpen(true)}>
              <Sv name="filter" size={18} />
              Filtri
              {attivi > 0 ? <b>{attivi}</b> : null}
            </button>
            <div className="fa-chips scroll" role="group" aria-label="Tipo di prenotazione">
              {FILTRI.map((f) => (
                <Chip key={f.v} on={filtro === f.v} onPress={() => (setFiltro(f.v), open.setOpen(null))}>{f.l}</Chip>
              ))}
            </div>
          </div>
        </>
      ) : null}
      {trip.bookings.length === 0 ? (
        <Vuoto title="Nessuna prenotazione" text="Ristoranti, treni, noleggi e attività con codice, link e biglietto sempre a portata di mano." action="Aggiungi una prenotazione" onAction={() => setSheet({})} />
      ) : shown.length === 0 ? (
        <VuotoFiltro title="Nessuna prenotazione trovata" text="Prova con un altro tipo o togli i filtri." action="Mostra tutte" onAction={() => (setFiltro('all'), setArch(FILTRI_VUOTI))} />
      ) : null}
      <Affianca uguali>
        {/* pieghevole aperto: a righe, 1 a sinistra, 2 a destra, 3 sotto l’1… */}
          {gruppi.map((g) => (
          <section key={g.ymd || 'senza'} aria-label={g.ymd ? giornoSpese(g.ymd, today) : 'Da pianificare'} className="fa-gruppo">
            <div className="fa-sech">
              <h2 className="fa-h3">{g.ymd ? giornoSpese(g.ymd, today) : 'Da pianificare'}</h2>
            </div>
            {g.items.map((b) => {
              const isOpen = open.isOpen(b.id)
              const ora = oraPrenotazione(b, tz)
              const sub = sottotitolo(b, tz) || BOOKING_LABEL[b.type]
              const payer = trip.travelers.find((p) => p.id === b.paidBy)
              const cached = !!b.filePath && offline.has(b.filePath)
              const stato = statoDi(b)
              const tappe = trip.bookingLinks ? tappeDi(trip, b.id) : []
              const giornoB = b.validFrom ? giornoSpese(dateInZone(b.validFrom, tz), today) : ''
              const righe: [string, string][] = [
                ['Validità', b.validFrom && b.validTo && dateInZone(b.validTo, tz) > dateInZone(b.validFrom, tz) ? `${formatShort(dateInZone(b.validFrom, tz))} → ${formatShort(dateInZone(b.validTo, tz))}` : ''],
                ['Fornitore', b.provider ?? ''],
                ['Contatto', b.contact ?? ''],
                ['Cancellazione', b.cancellationPolicy ?? ''],
                // lo stato non è più una pillola sulla card chiusa: è una voce del dettaglio
                ['Stato', STATO_LABEL[stato]],
                ['Tappa', trip.bookingLinks ? (tappe.length === 0 ? 'Non collegata' : tappe.map((id) => giornoDellaTappa(trip, id)?.title ?? 'Tappa').join(', ')) : ''],
                ['Allegato', b.filePath ? (cached ? 'Disponibile offline' : b.keepOffline ? 'Sarà disponibile offline' : 'Serve la rete per aprirlo') : ''],
                ['Fuori periodo', quando(b, trip) === 'fuori-periodo' ? 'Fuori dalle date del viaggio' : ''],
                ['Manca', mancanti(trip, b).join(' · ')],
                ['Nota', b.notes ?? ''],
              ]
              return (
                <div key={b.id} id={`prenotazione-${b.id}`} className="k-TicketOrizzontale">
                  <div className={cx('tk tv th', stato !== 'confirmed' && 'todo', isOpen && 'open')}>
                    <div className="a v-top">
                      <button type="button" className="hdl" aria-expanded={isOpen} onClick={() => open.toggle(b.id)}>
                        <span className="kd kd-disco" aria-hidden="true">
                          <Ic name={icona(b)} size={40} />
                        </span>
                        <span className="ti">
                          <b>{b.title}</b>
                          <span>{sub}</span>
                        </span>
                        <span className="chv" aria-hidden="true">
                          <Sv name="chev" size={20} />
                        </span>
                      </button>
                      {/* senza ora il giorno non si ripete: c'è già nel titolo del gruppo sopra la card */}
                      {ora || b.code ? (
                        <div className="hz3">
                          {ora ? (
                            <div className="hs l">
                              <span className="tm">{ora}</span>
                              <b>{giornoB || 'Ora'}</b>
                            </div>
                          ) : null}
                          {b.code ? (
                            <div className={cx('hs', ora ? 'r' : 'l')}>
                              <span className="tm cod cdc">{b.code}</span>
                              <b>Codice</b>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {isOpen ? (
                      <div className="b">
                        <div className="pr" style={b.cost == null ? { alignItems: 'center' } : undefined}>
                          <div>
                            <div className={cx('pv', b.cost == null && 'no pic')}>
                              {b.cost == null ? 'Costo non inserito' : `${formatMoney(b.cost, b.currency ?? trip.baseCurrency)}${b.scope === 'per_person' ? ' a persona' : ''}`}
                            </div>
                            {b.cost != null ? <div className="pn">{payer ? `Pagato da ${payer.name.split(/\s+/)[0]}` : 'Costo'}</div> : null}
                          </div>
                          {b.cost == null ? (
                            <Pulsante size="sm" iconLeading="plus" onPress={() => setSheet({ booking: b })}>
                              Aggiungi costo
                            </Pulsante>
                          ) : null}
                        </div>
                        <dl className="dl">
                          {righe
                            .filter(([, v]) => v)
                            .map(([k, v]) => (
                              <div key={k}>
                                <dt>{k}</dt>
                                <dd style={k === 'Nota' ? { whiteSpace: 'pre-line' } : undefined}>{v}</dd>
                              </div>
                            ))}
                        </dl>
                        <div className="acts2">
                          {b.code ? (
                            <Pulsante size="sm" color="secondary" iconLeading="copy" onPress={() => void copia(b.code as string)} aria-label={`Copia il codice ${b.code}`}>
                              Copia
                            </Pulsante>
                          ) : null}
                          <Pulsante size="sm" color="secondary" iconLeading="qr" onPress={() => setCodice(b)}>
                            Codice
                          </Pulsante>
                          {b.url ? (
                            <Pulsante size="sm" color="secondary" iconLeading="globe" href={b.url} target="_blank">
                              Link
                            </Pulsante>
                          ) : null}
                          {b.filePath ? (
                            <Pulsante size="sm" color="secondary" iconLeading="file" isLoading={occ === `apri:${b.id}`} onPress={() => void faiOcc(`apri:${b.id}`, () => apri(b))}>
                              File
                            </Pulsante>
                          ) : null}
                          {trip.bookingLinks && tappe.length === 0 ? (
                            <Pulsante size="sm" color="secondary" iconLeading="pin" onPress={() => setSheet({ booking: b })}>
                              Collega
                            </Pulsante>
                          ) : null}
                          {tappe.map((id) => (
                            <Pulsante key={id} size="sm" color="secondary" iconLeading="pin" isLoading={occ === `scollega:${id}`} onPress={() => void scollega(b, id)} aria-label={`Scollega dalla tappa ${giornoDellaTappa(trip, id)?.title ?? ''}`}>
                              Scollega
                            </Pulsante>
                          ))}
                          <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={() => setSheet({ booking: b })}>
                            Modifica
                          </Pulsante>
                          <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" isLoading={occ === `elimina:${b.id}`} onPress={() => void elimina(b)}>
                            Elimina
                          </Pulsante>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </Affianca>
    </Schermata>
  )
}
