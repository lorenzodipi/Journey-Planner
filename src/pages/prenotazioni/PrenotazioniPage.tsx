// Pagina Prenotazioni (mock Fa-44, #40): pillole per tipo, righe compatte per giorno con orario e dettaglio,
// apertura in linea con codice (Copia), link, validità, costo, allegato, «Disponibile offline» e «Mostra il codice».
import { useEffect, useMemo, useState } from 'react'
import { BOOKING_BUDGET_CATEGORY, BOOKING_LABEL } from '../../lib/bookingMeta'
import { isFileCached, openBookingFile } from '../../lib/bookingFiles'
import { codiciDi } from '../../lib/codici'
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
import { Campo, Chip, Pillola } from '../../faraway/base'
import { UltimaModifica } from '../../faraway/UltimaModifica'
import { CodiceBiglietto } from '../../faraway/CodiceBiglietto'
import { cx } from '../../faraway/cx'
import { useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { useUnaAperta } from '../../faraway/Righe'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { Vuoto, VuotoFiltro } from '../../faraway/Stati'
import { giornoSpese } from '../spese/testi'
import { PrenotazioneSheet } from './PrenotazioneSheet'

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
  const today = tripToday(trip)
  const tz = trip.timezone
  const shown = useMemo(() => filtraArchivio(trip.bookings, arch).filter((b) => nelFiltro(b, filtro)), [trip.bookings, filtro, arch])
  const gruppi = useMemo(() => perGiorno(shown, tz), [shown, tz])

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
  async function scollega(b: Booking, itemId: string) {
    // BOOK-027: scollegare non elimina né la prenotazione né la tappa
    const m = await t.setBookingItems(trip.id, b.id, tappeDi(trip, b.id).filter((x) => x !== itemId))
    showToast(m ?? 'Prenotazione scollegata')
  }
  async function elimina(b: Booking) {
    const ok = await ask({ title: 'Eliminare la prenotazione?', message: conDipendenze(`${b.title} sparisce dalle prenotazioni${b.cost != null ? ' e dalle spese' : ''}; le tappe collegate restano. Puoi annullare subito dopo.`, dipendenze(trip, 'prenotazione', b.id)), confirm: 'Elimina la prenotazione', cancel: 'Tieni la prenotazione', destructive: true })
    if (!ok) return
    const m = await t.setBookingDeleted(b.id, true)
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
          {confirmNode}
        </>
      }
    >
      {trip.bookings.length > 0 ? (
        <div className="fa-chips scroll" role="group" aria-label="Tipo di prenotazione">
          {FILTRI.map((f) => (
            <Chip key={f.v} on={filtro === f.v} onPress={() => (setFiltro(f.v), open.setOpen(null))}>{f.l}</Chip>
          ))}
        </div>
      ) : null}
      {trip.bookings.length > 0 ? (
        <>
          <Campo label="Cerca" icon="search" value={arch.q} onChange={(q) => setArch({ ...arch, q })} placeholder="Titolo, luogo, fornitore, codice" />
          <div className="fa-chips scroll" role="group" aria-label="Stato e allegati">
            {(['to_confirm', 'confirmed', 'cancelled'] as const).map((x) => (
              <Chip key={x} on={arch.stato === x} onPress={() => setArch({ ...arch, stato: arch.stato === x ? 'all' : x })}>{STATO_LABEL[x]}</Chip>
            ))}
            <Chip on={arch.allegati === 'con'} onPress={() => setArch({ ...arch, allegati: arch.allegati === 'con' ? 'all' : 'con' })}>Con file</Chip>
            <Chip on={arch.allegati === 'senza'} onPress={() => setArch({ ...arch, allegati: arch.allegati === 'senza' ? 'all' : 'senza' })}>Senza file</Chip>
          </div>
        </>
      ) : null}
      {trip.bookings.length === 0 ? (
        <Vuoto title="Nessuna prenotazione" text="Ristoranti, treni, noleggi e attività con codice, link e biglietto sempre a portata di mano." action="Aggiungi una prenotazione" onAction={() => setSheet({})} />
      ) : shown.length === 0 ? (
        <VuotoFiltro title="Nessuna prenotazione trovata" text="Prova con un altro tipo o togli i filtri." action="Mostra tutte" onAction={() => (setFiltro('all'), setArch(FILTRI_VUOTI))} />
      ) : null}
      {gruppi.map((g) => (
        <section key={g.ymd || 'senza'} aria-label={g.ymd ? giornoSpese(g.ymd, today) : 'Da pianificare'} style={{ display: 'grid', gap: 8 }}>
          <div className="fa-sech">
            <h2 className="fa-h3">{g.ymd ? giornoSpese(g.ymd, today) : 'Da pianificare'}</h2>
          </div>
          <div className="fa-list">
            {g.items.map((b) => {
              const isOpen = open.isOpen(b.id)
              const ora = oraPrenotazione(b, tz)
              const sub = sottotitolo(b, tz) || BOOKING_LABEL[b.type]
              const payer = trip.travelers.find((p) => p.id === b.paidBy)
              const cached = !!b.filePath && offline.has(b.filePath)
              const haCodice = codiciDi(trip, 'booking', b.id).length > 0
              return (
                <div key={b.id} className={cx('fa-xr', isOpen && 'open')}>
                  <button type="button" className="fa-row" aria-expanded={isOpen} onClick={() => open.toggle(b.id)}>
                    <Ic name={icona(b)} size={44} />
                    <span style={{ minWidth: 0 }}>
                      <span className="t" style={{ display: 'block' }}>{b.title}</span>
                      <span className="s" style={{ display: 'block' }}>{sub}</span>
                      {statoDi(b) !== 'confirmed' || quando(b, trip) === 'fuori-periodo' ? (
                        <span style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {statoDi(b) !== 'confirmed' ? <Pillola tone={statoDi(b) === 'cancelled' ? 'cor' : 'mut'}>{STATO_LABEL[statoDi(b)]}</Pillola> : null}
                          {quando(b, trip) === 'fuori-periodo' ? <Pillola tone="mut">Fuori periodo</Pillola> : null}
                        </span>
                      ) : null}
                    </span>
                    <span className="end">
                      {ora || b.detail ? (
                        <span style={{ display: 'grid', justifyItems: 'end' }}>
                          {ora ? <span className="amt">{ora}</span> : null}
                          {b.detail ? <span className="s">{b.detail}</span> : null}
                        </span>
                      ) : null}
                      <Sv name="chev" size={20} className="chev" />
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="fa-xd">
                      {b.code ? (
                        <div className="kv">
                          <Sv name="qr" size={20} />
                          <div>
                            <div className="t">{b.code}</div>
                            <div className="s">Codice di conferma</div>
                            <button type="button" className="fa-btn sm out" style={{ marginTop: 8 }} onClick={() => void copia(b.code as string)} aria-label={`Copia il codice ${b.code}`}>
                              <Sv name="copy" size={18} />
                              Copia
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {b.url ? (
                        <div className="kv">
                          <Sv name="globe" size={20} />
                          <div>
                            <a className="fa-lnk" href={b.url} target="_blank" rel="noopener noreferrer">Apri il link</a>
                          </div>
                        </div>
                      ) : null}
                      {b.validFrom && b.validTo && dateInZone(b.validTo, tz) > dateInZone(b.validFrom, tz) ? (
                        <div className="kv">
                          <Sv name="cal" size={20} />
                          <div>
                            <div className="t">{formatShort(dateInZone(b.validFrom, tz))} → {formatShort(dateInZone(b.validTo, tz))}</div>
                            <div className="s">Validità</div>
                          </div>
                        </div>
                      ) : null}
                      {b.cost != null ? (
                        <div className="kv">
                          <Sv name="bag" size={20} />
                          <div>
                            <div className="t">{formatMoney(b.cost, b.currency ?? trip.baseCurrency)}{b.scope === 'per_person' ? ' a persona' : ''}</div>
                            <div className="s">{payer ? `Pagato da ${payer.name.split(/\s+/)[0]}` : 'Costo'}</div>
                          </div>
                        </div>
                      ) : null}
                      {b.filePath ? (
                        <div className="kv">
                          <Sv name="file" size={20} />
                          <div>
                            <div className="t">Allegato</div>
                            <div className="s">{cached ? 'Disponibile offline' : b.keepOffline ? 'Sarà disponibile offline' : 'Serve la rete per aprirlo'}</div>
                            <button type="button" className="fa-btn sm out" style={{ marginTop: 8 }} onClick={() => void apri(b)}>
                              Apri il file
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {trip.bookingLinks ? (
                        <div className="kv">
                          <Sv name="pin" size={20} />
                          <div>
                            {tappeDi(trip, b.id).length === 0 ? (
                              <>
                                <div className="t">Non collegata a una tappa</div>
                                <button type="button" className="fa-btn sm out" style={{ marginTop: 8 }} onClick={() => setSheet({ booking: b })}>Collega a una tappa</button>
                              </>
                            ) : (
                              tappeDi(trip, b.id).map((id) => {
                                const g = giornoDellaTappa(trip, id)
                                return (
                                  <div key={id}>
                                    <div className="t">{g?.title ?? 'Tappa'}</div>
                                    <div className="s">{g ? formatShort(g.date) : 'Tappa'}</div>
                                    <button type="button" className="fa-btn sm out" style={{ marginTop: 8 }} onClick={() => void scollega(b, id)}>Scollega</button>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      ) : null}
                      {b.provider || b.contact || b.cancellationPolicy ? (
                        <div className="kv">
                          <Sv name="user" size={20} />
                          <div>
                            {b.provider ? <div className="t">{b.provider}</div> : null}
                            {b.contact ? <div className="s">{b.contact}</div> : null}
                            {b.cancellationPolicy ? <div className="s">Cancellazione: {b.cancellationPolicy}</div> : null}
                          </div>
                        </div>
                      ) : null}
                      {mancanti(trip, b).length ? <div className="s" style={{ color: 'var(--fg-2, inherit)' }}>{mancanti(trip, b).join(' · ')}</div> : null}
                      {b.notes ? (
                        <div className="kv">
                          <Sv name="info" size={20} />
                          <div>
                            <div className="s" style={{ whiteSpace: 'pre-line' }}>{b.notes}</div>
                          </div>
                        </div>
                      ) : null}
                      <UltimaModifica trip={trip} table="bookings" rowId={b.id} />
                      <div className="acts">
                        <button type="button" className="fa-btn sm out" onClick={() => setCodice(b)}>
                          <Sv name="qr" size={18} />
                          {haCodice ? 'Mostra il codice' : 'Codice del biglietto'}
                        </button>
                        <button type="button" className="fa-btn sm out" onClick={() => setSheet({ booking: b })}>
                          <Sv name="pencil" size={18} />
                          Modifica
                        </button>
                        <button type="button" className="fa-btn sm del" style={{ color: 'var(--danger)' }} onClick={() => void elimina(b)}>
                          <Sv name="trash" size={18} />
                          Elimina
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </Schermata>
  )
}
