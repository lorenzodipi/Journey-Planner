// Giorno (mock Fa-09…Fa-15, issue #32): mappa con «Percorso migliore», tappe con stati e spostamenti,
// card aperta in linea, fogli Aggiungi / Modifica / Sposta / Elimina; sotto le tappe Alloggio, Spese e
// Prenotazioni del giorno, e i giorni vicini.
import { conDipendenze, dipendenze } from '../lib/registro'
import { vistaDelGiorno } from '../lib/paesi'
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearch } from 'wouter'
import { expenseBase, fxOf } from '../lib/budget'
import { parseYmd } from '../lib/dates'
import { formatDistance } from '../lib/dayRoute'
import { dayExpenses, dayMovements, dayStays } from '../lib/dayView'
import { prenotazioniDelGiorno } from '../lib/prenotazioni'
import { formatMoney, round2 } from '../lib/money'
import { parseMapsUrl } from '../lib/mapsUrl'
import { planRoute } from '../lib/routeOrder'
import { minutesOfDay } from '../lib/sun'
import { durata, fase, riepilogoPercorso, stimaSpostamento } from '../lib/tappa'
import { modoGoogle, testoMezzo } from '../lib/spostamenti'
import { tripToday } from '../lib/today'
import { useDaySegments } from '../state/daySegments'
import { useHere } from '../state/here'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { DayItem, Expense, ItemStatus, Stay } from '../types'
import { DaySheet, type DaySheetState } from '../ui/DaySheet'
import { DayMapPanel } from '../ui/DayMapPanel'
import { PulsanteIcona, Pulsante, Sezione } from '../faraway/base'
import { useConferma } from '../faraway/Foglio'
import { MeteoGiornoCard } from './giorno/MeteoGiornoCard'
import { meteoDellaTappa, cittaTappa, cittaDelGiorno } from '../lib/meteoGiorno'
import { useCityForecasts } from '../state/cityForecast'
import { Sv } from '../faraway/icons'
import { RigaAlloggio } from '../faraway/CartaAlloggio'
import { Riga, useUnaAperta } from '../faraway/Righe'
import { AlloggioSheet } from './alloggi/AlloggioSheet'
import { Affianca, BarraIndietro, Colonna, Schermata } from '../faraway/shell'
import { useVistaAccanto } from '../faraway/mappaAccanto'
import { GiorniAccanto } from './Giorni'
import { Vuoto } from '../faraway/Stati'
import { linkedExpense, TappeLista } from '../faraway/Tappe'
import { SpostaSheet } from './giorno/SpostaSheet'
import { SpesaSheet } from './spese/SpesaSheet'
import { iconaSpesa } from '../lib/ricevuta'
import { TappaSheet } from './giorno/TappaSheet'
import { SpostamentoSheet } from './giorno/SpostamentoSheet'
import { alloggiDelGiorno } from '../lib/fattibilita'
import { useInCorso } from '../faraway/Attesa'

const wdm = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const fmt = (ymd: string) => wdm.format(parseYmd(ymd)).replace(/\./g, '')

type Sheet = { kind: 'add' } | { kind: 'edit'; item: DayItem } | { kind: 'move'; item: DayItem; postpone: boolean } | { kind: 'seg'; item: DayItem } | null

export function Giorno({ params }: { params: { id: string } }) {
  const trip = useTrip()
  // finestra espansa (pieghevole in orizzontale, computer): Giorni a sinistra e questo giorno a destra, nella stessa pagina
  const accanto = useVistaAccanto()
  if (accanto && trip.days.length > 0) return <GiorniAccanto scelto={params.id} />
  return <DettaglioGiorno id={params.id} />
}

/** Il dettaglio di un giorno. `incastrato`: dentro il pannello di destra di Giorni (niente schede né «Indietro»). */
export function DettaglioGiorno({ id, incastrato }: { id: string; incastrato?: boolean }) {
  const trip = useTrip()
  const t = useTrips()
  const [, navigate] = useLocation()
  const search = useSearch()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [legacy, setLegacy] = useState<DaySheetState>(null)
  const [spesa, setSpesa] = useState<Expense | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [ask, confirmNode] = useConferma()
  const stayOpen = useUnaAperta()
  const [stayEdit, setStayEdit] = useState<Stay | null>(null)
  const here = useHere()

  const index = trip.days.findIndex((d) => d.id === id)
  const day = trip.days[index]
  const { route, stopById, segments, imp } = useDaySegments(trip, day)

  // da Giorni, su un giorno libero: «Aggiungi tappa» già aperto
  useEffect(() => {
    if (day && new URLSearchParams(search).get('aggiungi') === '1') {
      setSheet({ kind: 'add' })
      navigate(`/giorni/${day.id}`, { replace: true })
    }
  }, [day?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // da una notifica o da un link: la tappa indicata si apre da sola
  useEffect(() => {
    const id = new URLSearchParams(search).get('tappa')
    if (day && id && day.items.some((i) => i.id === id)) {
      setOpenId(id)
      navigate(`/giorni/${day.id}`, { replace: true })
    }
  }, [day?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!day) {
    return (
      <Schermata bar={<BarraIndietro title="Giorni" back="/giorni" senzaIndietro={incastrato} />} tabs={!incastrato} incastrata={incastrato} rete={!incastrato}>
        <Vuoto art="calendario" title="Giorno non trovato" text="Questo giorno non esiste più: torna all'elenco e scegline un altro." action="Vai ai giorni" actionIcon="back" onAction={() => navigate('/giorni')} />
      </Schermata>
    )
  }

  const n = index + 1
  const prev = trip.days[index - 1]
  const next = trip.days[index + 1]
  const today = tripToday(trip)
  const dayView = vistaDelGiorno(trip, day.date)
  const ctx = { isToday: day.date === today, isPast: day.date < today, nowMin: minutesOfDay(new Date(), dayView.timezone), timeZone: dayView.timezone }
  const city = day.city || trip.destination
  const previsioniCitta = useCityForecasts(trip, cittaDelGiorno(trip, day).map((c) => c.city))
  const legs = [...segments.values()]
  const stopState = new Map(day.items.map((i) => {
    const f = fase(i, i.placeId ? trip.places.find((p) => p.id === i.placeId) : undefined, ctx)
    return [i.id, f === 'past' ? 'next' : f] as const
  }))
  const percorso = riepilogoPercorso(day.items.length, legs)

  // «Maps»: percorso con tutte le tappe in ordine (fino a 10 punti)
  const ll = (s: { lat: number; lng: number }) => encodeURIComponent(`${s.lat},${s.lng}`)
  const rs = route.stops
  const routeHref =
    rs.length >= 2
      ? `https://www.google.com/maps/dir/?api=1&origin=${ll(rs[0])}&destination=${ll(rs[rs.length - 1])}${rs.length > 2 ? `&waypoints=${rs.slice(1, -1).slice(0, 8).map(ll).join('%7C')}` : ''}&travelmode=${modoGoogle(legs.map((l) => l.mode))}`
      : rs.length === 1
        ? `https://www.google.com/maps/search/?api=1&query=${ll(rs[0])}`
        : undefined

  const fromHere = (item: DayItem): string | null => {
    const stop = stopById.get(item.id)
    if (!stop) return null
    if (here && ctx.isToday) {
      const s = stimaSpostamento(here, stop, [], imp)
      return `${durata(s.minutes)} ${testoMezzo(s.mode)} da qui`
    }
    const i = day.items.indexOf(item)
    const prevItem = day.items[i - 1]
    const seg = segments.get(item.id)
    if (prevItem && seg) return `${durata(seg.minutes)} ${testoMezzo(seg.mode)} da ${prevItem.title}`
    return null
  }

  const onStatus = async (item: DayItem, status: ItemStatus) => {
    if (status === 'postponed') return setSheet({ kind: 'move', item, postpone: true })
    const m = await t.setItemStatus(trip.id, item.id, status)
    if (m) showToast(m)
  }

  const onDelete = async (item: DayItem) => {
    const exp = linkedExpense(trip, item)
    const ok = await ask({
      title: 'Eliminare la tappa?',
      message: conDipendenze(`${item.title} sparisce dal Giorno ${n}${exp ? ' e dalla spesa collegata' : ''}. Non si può annullare.`, dipendenze(trip, 'tappa', item.id)),
      confirm: 'Elimina la tappa',
      cancel: 'Tieni la tappa',
    })
    if (!ok) return
    let m = await t.setItemDeleted(item.id, true)
    if (!m && exp) m = await t.saveItemCost(trip.id, item.id, null)
    if (m) showToast(m)
    else setOpenId(null)
  }

  const onPin = (id: string) => {
    setOpenId(id)
    const el = document.getElementById(`tappa-${id}`)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el?.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
    setHighlight(id)
    window.setTimeout(() => setHighlight((c) => (c === id ? null : c)), 1500)
  }

  // «Ottimizza percorso» (#18): le tappe senza orario sul tragitto più breve dall'ultima con orario o dall'alloggio
  const stays = dayStays(trip.stays, day.date)
  const casa = alloggiDelGiorno(trip, day)
  const casaUrl = casa.escluso ? undefined : (casa.partenza ?? casa.arrivo ?? stays.night)?.mapsUrl
  const homePoint = casaUrl ? parseMapsUrl(casaUrl) : null
  const plan = planRoute(day.items.map((i) => ({ id: i.id, position: i.position, time: i.timeLock === 'locked' ? (i.time ?? '00:00') : i.time, lat: stopById.get(i.id)?.lat, lng: stopById.get(i.id)?.lng })), homePoint)
  const [occ, faiOcc] = useInCorso()
  const optimize = async () => {
    if (!plan) return
    if (plan.changed.length === 0) return showToast('Il percorso è già il più corto')
    const old = new Map(day.items.map((i) => [i.id, i.position ?? 0]))
    const previous = plan.changed.map((c) => ({ id: c.id, position: old.get(c.id) ?? 0 }))
    const m = await faiOcc('ottimizza', () => t.setItemPositions(plan.changed))
    if (m) return showToast(m)
    showToast(plan.afterM < plan.beforeM - 50 ? `Percorso accorciato da ${formatDistance(plan.beforeM)} a ${formatDistance(plan.afterM)}` : 'Tappe senza orario messe dopo quelle con orario', {
      label: 'Annulla',
      run: () => void t.setItemPositions(previous).then((x) => x && showToast(x)),
    })
  }

  const fx = fxOf(trip)
  const expenses = dayExpenses(trip, day)
  const total = round2(expenses.reduce((s, e) => s + (expenseBase(e, fx) ?? 0), 0))
  const bookings = prenotazioniDelGiorno(trip, day)
  const payer = new Map(trip.travelers.map((p) => [p.id, p.name]))
  const spostamenti = dayMovements(trip, day).filter((e) => e.kind !== 'stay')
  const stayList = [...stays.checkOut, ...stays.checkIn.filter((s) => s.id !== stays.night?.id), ...(stays.night ? [stays.night] : [])]

  return (
    <Schermata
      gap={32}
      tabs={!incastrato}
      incastrata={incastrato}
      rete={!incastrato}
      bar={<BarraIndietro title={incastrato ? fmt(day.date).replace(/^./, (c) => c.toUpperCase()) : 'Giorni'} back="/giorni" senzaIndietro={incastrato} right={<PulsanteIcona icon="dots" label="Modifica il giorno" onPress={() => setLegacy({ kind: 'day', day })} />} />}
    >
      <Affianca>
        {/* pieghevole aperto: mappa, meteo, alloggio, spese e prenotazioni a sinistra; le tappe a destra */}
        <Colonna lato="sinistra">
          {day.items.length > 0 || route.transports.length > 0 ? (
            <section className="fa-card xl" style={{ padding: 0, overflow: 'hidden' }} aria-label="Mappa del giorno">
              <div className="fa-dm" style={{ position: 'relative' }}>
                <DayMapPanel route={route} center={dayView.center} selectedId={openId} onSelect={onPin} height={240} bare stopState={stopState} />
                {route.stops.length > 1 ? (
                  <span className="fa-pillst soft" style={{ position: 'absolute', left: 12, top: 12, background: 'var(--surface-card)', zIndex: 2 }}>
                    Percorso migliore
                  </span>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 16px' }}>
                <div>
                  <div className="fa-b">{percorso.title}</div>
                  {percorso.sub ? (
                    <div className="fa-m" style={{ color: 'var(--ink-muted)' }}>
                      {percorso.sub}
                    </div>
                  ) : route.missing > 0 ? (
                    <div className="fa-m">{route.missing === 1 ? '1 tappa senza posizione' : `${route.missing} tappe senza posizione`}</div>
                  ) : null}
                </div>
                {routeHref ? (
                  <a className="fa-btn sm out" href={routeHref} target="_blank" rel="noopener noreferrer">
                    <Sv name="pin" size={18} />
                    Maps
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}

          <MeteoGiornoCard trip={trip} day={day} />
        </Colonna>
        <Colonna lato="destra" alta>
          <div className="fa-stack" style={{ gap: 0 }}>
            <TappeLista
              trip={trip}
              day={day}
              header={{ title: `Giorno ${n} · ${city}`, date: fmt(day.date) }}
              ctx={ctx}
              segments={segments}
              openId={openId}
              onToggle={(id) => setOpenId((c) => (c === id ? null : id))}
              onStatus={(i, s) => void onStatus(i, s)}
              onEdit={(item) => setSheet({ kind: 'edit', item })}
              onMove={(item) => setSheet({ kind: 'move', item, postpone: false })}
              onDelete={(item) => void onDelete(item)}
              onReorder={(item, to) => void t.moveItemTo(day.id, item.id, to).then((m) => m && showToast(m))}
              fromHere={fromHere}
              onSeg={(item) => setSheet({ kind: 'seg', item })}
              meteoDi={(item) => meteoDellaTappa(previsioniCitta.get(cittaTappa(trip, day, item)), day.date, item.time)}
              highlight={highlight}
            />
            {day.items.length === 0 ? <p className="fa-m">Giornata ancora libera: aggiungi la prima tappa.</p> : null}
          </div>

          <Pulsante iconLeading="plus" onPress={() => setSheet({ kind: 'add' })}>
            Aggiungi tappa
          </Pulsante>
          {plan && day.items.filter((i) => !i.time).length > 1 ? (
            <Pulsante color="secondary" iconLeading="move" isLoading={occ === 'ottimizza'} onPress={() => void optimize()}>
              Ottimizza percorso
            </Pulsante>
          ) : null}
        </Colonna>
        <Colonna lato="sinistra" mobile>
          {spostamenti.length > 0 ? (
            <section style={{ display: 'grid', gap: 16 }} aria-label="Voli e spostamenti">
              <Sezione title="Voli e spostamenti" />
              <div className="fa-list">
                {spostamenti.map((e, i) => (
                  <Riga
                    key={`${e.ref?.id ?? i}-${e.at}`}
                    icon={e.kind === 'flight' ? 'i-tra-plane' : `i-tra-${e.mode && ['bus', 'car', 'ferry', 'metro', 'taxi', 'train', 'plane'].includes(e.mode) ? e.mode : 'train'}`}
                    title={e.title}
                    sub={[e.time ? (e.endTime ? `${e.time} → ${e.endTime}` : e.time) : null, e.sub].filter(Boolean).join(' · ')}
                    onPress={() => navigate(e.kind === 'flight' ? '/altro/voli' : '/altro/trasporti')}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {stayList.length > 0 ? (
            <section style={{ display: 'grid', gap: 16 }} aria-label="Alloggio">
              <Sezione title="Alloggio" right={<Link href="/altro/alloggi" className="fa-lnk">Tutti</Link>} />
              <div className="fa-list">
              {stayList.map((s) => (
                <RigaAlloggio
                  key={s.id}
                  trip={trip}
                  stay={s}
                  date={day.date}
                  open={stayOpen.isOpen(s.id)}
                  onToggle={() => stayOpen.toggle(s.id)}
                  onEdit={() => setStayEdit(s)}
                  onDelete={async () => {
                    const ok = await ask({ title: 'Eliminare l’alloggio?', message: conDipendenze(`${s.name} sparisce dagli alloggi e dalle spese. Puoi annullare subito dopo.`, dipendenze(trip, 'alloggio', s.id)), confirm: 'Elimina l’alloggio', cancel: 'Tieni l’alloggio', destructive: true })
                    if (!ok) return
                    const m = await t.setStayDeleted(s.id, true)
                    showToast(m ?? 'Alloggio eliminato', m ? undefined : { label: 'Annulla', run: () => void t.setStayDeleted(s.id, false) })
                  }}
                />
              ))}
              </div>
            </section>
          ) : null}

          {expenses.length > 0 ? (
            <section style={{ display: 'grid', gap: 16 }} aria-label="Spese del giorno">
              <Sezione title="Spese del giorno" right={<span className="fa-c">{formatMoney(total, trip.baseCurrency)}</span>} />
              <div className="fa-list">
                {expenses.map((e) => (
                  <Riga
                    key={e.id}
                    icon={iconaSpesa(e)}
                    title={e.label}
                    sub={[e.paidBy ? `Pagata da ${payer.get(e.paidBy) ?? '—'}` : null, e.category].filter(Boolean).join(' · ')}
                    end={<span className="amt">{formatMoney(e.amount, e.currency)}</span>}
                    onPress={() => setSpesa(e)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {bookings.length > 0 ? (
            <section style={{ display: 'grid', gap: 16 }} aria-label="Prenotazioni del giorno">
              <Sezione title="Prenotazioni del giorno" right={<Link href="/altro/prenotazioni" className="fa-lnk">Tutte</Link>} />
              <div className="fa-list">
                {bookings.map(({ booking: b, tappa }) => (
                  <Riga key={b.id} icon="i-sez-ticket" title={b.title} sub={[tappa ? `Tappa: ${tappa.title}` : trip.bookingLinks ? 'Non collegata a una tappa' : '', b.code ? `Codice ${b.code}` : ''].filter(Boolean).join(' · ') || 'Prenotazione'} onPress={() => setLegacy({ kind: 'edit-booking', booking: b })} />
                ))}
              </div>
            </section>
          ) : null}
        </Colonna>
      </Affianca>

      {prev || next ? (
        <nav aria-label="Giorni vicini" style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          {prev ? (
            <Link href={`/giorni/${prev.id}`} replace className="fa-btn sm out" aria-label={`Giorno precedente, ${fmt(prev.date)}`}>
              <Sv name="back" size={18} />
              {fmt(prev.date)}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/giorni/${next.id}`} replace className="fa-btn sm out" aria-label={`Giorno successivo, ${fmt(next.date)}`}>
              {fmt(next.date)}
              <Sv name="chevr" size={18} />
            </Link>
          ) : null}
        </nav>
      ) : null}

      {sheet?.kind === 'add' || sheet?.kind === 'edit' ? (
        <TappaSheet key={sheet.kind === 'edit' ? sheet.item.id : 'new'} trip={trip} day={day} item={sheet.kind === 'edit' ? sheet.item : undefined} open dayNumber={n} onClose={() => setSheet(null)} />
      ) : null}
      {sheet?.kind === 'move' ? (
        <SpostaSheet
          key={sheet.item.id}
          trip={trip}
          current={day}
          open
          title={sheet.postpone ? 'Rimanda a un altro giorno' : 'Sposta in un altro giorno'}
          action={sheet.postpone ? 'Rimanda qui' : 'Sposta qui'}
          onClose={() => setSheet(null)}
          onMove={async (to) => {
            const m = await t.moveItemToDay(trip.id, sheet.item.id, to, sheet.postpone)
            if (!m) setOpenId(null)
            return m
          }}
        />
      ) : null}
      {(() => {
        if (sheet?.kind !== 'seg') return null
        const i = day.items.findIndex((x) => x.id === sheet.item.id)
        const da = day.items[i - 1]
        const a = day.items[i]
        const leg = da && a ? route.legs.find((l) => l.fromId === da.id && l.toId === a.id) : undefined
        return da && a && leg ? <SpostamentoSheet key={a.id} open da={da} a={a} leg={leg} strada={route.routes[leg.key]} imp={imp} onClose={() => setSheet(null)} /> : null
      })()}
      {stayEdit ? <AlloggioSheet key={stayEdit.id} trip={trip} stay={stayEdit} open onClose={() => setStayEdit(null)} /> : null}
      {confirmNode}
      <div className="legacy">
        <DaySheet trip={trip} state={legacy} onChange={setLegacy} />
        {spesa ? <SpesaSheet key={spesa.id} trip={trip} expense={spesa} open onClose={() => setSpesa(null)} /> : null}
      </div>
    </Schermata>
  )
}

