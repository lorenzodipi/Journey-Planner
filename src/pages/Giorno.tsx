import { Fragment, type ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'wouter'
import { expenseBase, fxOf } from '../lib/budget'
import { categoryIcon } from '../lib/categoryIcon'
import { doneCount } from '../lib/checklist'
import { shiftDirection } from '../lib/dragOrder'
import { formatDay, formatShort } from '../lib/dates'
import { formatDistance, hopSummary } from '../lib/dayRoute'
import { dayBookings, dayChecklist, dayExpenses, dayMovements, dayStays } from '../lib/dayView'
import { formatMoney, round2 } from '../lib/money'
import { itemMapsHref } from '../lib/itemMaps'
import { mapsLinkFor, parseMapsUrl } from '../lib/mapsUrl'
import { formatDuration, itemDuration } from '../lib/duration'
import { planRoute } from '../lib/routeOrder'
import { minutesOfDay, sunForDay } from '../lib/sun'
import { nextItem, tripToday } from '../lib/today'
import { useDayRoute } from '../state/dayRoute'
import { showToast } from '../state/toast'
import { useForecast } from '../state/forecast'
import { useTrip, useTrips } from '../state/trip'
import type { DayItem, Place, Stay } from '../types'
import { ART, catSymbol } from '../ui/art'
import { DayMapPanel } from '../ui/DayMapPanel'
import { DaySheet, type DaySheetState } from '../ui/DaySheet'
import { CheckG, ChevronLeftG, ChevronRightG, CloseG, PlusG } from '../ui/glyphs'
import { ItemRow, KIND_LABEL, nodeGlyph, StepRow, type StepState } from '../ui/ItemRow'
import { MapsPill } from '../ui/MapsPill'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { QuantityStepper } from '../ui/QuantityStepper'
import { Ic } from '../ui/Sprite'
import { MODE_LABEL } from '../ui/TransportForm'
import { useDragReorder } from '../ui/useDragReorder'
import { useItemActions } from '../ui/useItemActions'
import { WeatherCard } from '../ui/WeatherCard'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const fromMin = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Chiave del disco di categoria («temple», «food»…) per una tappa; `pin` se non ha una categoria. */
function symbolKey(place: Place | undefined, kind: DayItem['kind']): string {
  if (kind === 'meal') return 'food'
  if (!place) return 'pin'
  const sym = catSymbol(categoryIcon(place.category))
  return sym.startsWith('i-cat-') ? sym.slice(6) : 'pin'
}

const MOVE_ICON: Record<string, string> = { plane: 'i-tra-plane', train: 'i-tra-train', metro: 'i-tra-metro', walk: 'i-tra-walk', bus: 'i-tra-bus' }

interface Pill {
  tone: 'ok' | 'warn' | 'vi'
  text: string
}

/** Riga `.prow` di una sezione (alloggio, spostamenti, spese…): disco, titolo, dettaglio, pillole e azione a destra. */
function InfoRow({ icon, title, meta, pills, onOpen, mapsHref, right }: { icon: string; title: string; meta?: string; pills?: Pill[]; onOpen?: () => void; mapsHref?: string; right?: ReactNode }) {
  return (
    <li className="prow">
      <Ic name={icon} size={44} />
      <div className="grow">
        {onOpen ? (
          <button type="button" className="pt2 tp-edit" onClick={onOpen} aria-label={`Modifica ${title}`}>
            {title}
          </button>
        ) : (
          <p className="pt2">{title}</p>
        )}
        {meta && <p className="pm">{meta}</p>}
        {pills && pills.length > 0 && (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {pills.map((p) => (
              <span className={`sp ${p.tone}`}>{p.text}</span>
            ))}
          </span>
        )}
      </div>
      {right ?? (mapsHref && <MapsPill kind="btn" href={mapsHref} label={title} />)}
    </li>
  )
}

function Section({ title, label, aside, children }: { title: string; label?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={label ?? title}>
      <div className="sec-h" style={{ marginBottom: '10px' }}>
        <h2 className="h-md">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

const DotsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </svg>
)

const allLink = (href: string, text = 'Tutti') => (
  <Link href={href} className="b-bold" style={{ color: 'var(--azzurro-ink)' }}>
    {text}
  </Link>
)

export function Giorno({ params }: { params: { id: string } }) {
  const trip = useTrip()
  const actions = useItemActions()
  const t = useTrips()
  const forecast = useForecast(trip)
  const [sheet, setSheet] = useState<DaySheetState>(null)
  const [reordering, setReordering] = useState(false)

  const index = trip.days.findIndex((d) => d.id === params.id)
  const day = trip.days[index]
  const route = useDayRoute(trip, day ?? { id: '', date: '', city: '', items: [] })
  // tocco su un pin della mappa: prima si seleziona, poi «Vai alla tappa» porta alla sua riga
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)), [])
  const stopByItem = useMemo(() => new Map(route.stops.map((s) => [s.id, s])), [route.stops])

  // le tappe senza orario si riordinano tra loro: gli indici del trascinamento sono quelli di questo elenco
  const loose = useMemo(() => (day ? day.items.filter((i) => !i.time) : []), [day])
  const { listRef, drag, start } = useDragReorder((from, to) => {
    const item = loose[from]
    const target = loose[to]
    return day && item && target ? actions.moveTo(day.id, item, day.items.indexOf(target)) : undefined
  }, 1.5)

  // il tratto che porta a ciascuna tappa, se arriva dalla tappa che la precede sulla mappa
  const legTo = useMemo(() => {
    const m = new Map<string, { from: string; leg: (typeof route.legs)[number] }>()
    route.legs.forEach((leg, i) => {
      const a = route.stops[i]
      const b = route.stops[i + 1]
      if (a && b) m.set(b.id, { from: a.id, leg })
    })
    return m
  }, [route.legs, route.stops])

  if (!day) {
    return (
      <main className="screen">
        <EmptyState art={ART.calendario} title="Giorno non trovato" text="Questo giorno non esiste più: torna all'elenco e scegline un altro." />
        <Link href="/giorni" className="btn block">
          Vai ai giorni
        </Link>
      </main>
    )
  }

  const prev = trip.days[index - 1]
  const next = trip.days[index + 1]
  const today = tripToday(trip)
  const isToday = day.date === today
  const nowMin = isToday ? minutesOfDay(new Date(), trip.timezone) : null
  const fx = fxOf(trip)
  const movements = dayMovements(trip, day)
  const stays = dayStays(trip.stays, day.date)
  const expenses = dayExpenses(trip, day)
  const bookings = dayBookings(trip, day)
  const todos = dayChecklist(trip.checklist, day)
  const sun = sunForDay(day.date, trip.center.lat, trip.center.lng, trip.timezone)
  const payer = new Map(trip.travelers.map((p) => [p.id, p.name]))
  const total = round2(expenses.reduce((n, e) => n + (expenseBase(e, fx) ?? 0), 0))
  const placeOf = (it: DayItem) => (it.placeId ? trip.places.find((p) => p.id === it.placeId) : undefined)
  const city = day.city || trip.destination

  const timed = day.items.filter((i) => i.time).sort((a, b) => (a.time as string).localeCompare(b.time as string))
  const cur = nowMin != null ? nextItem(day, nowMin) : null
  const stateOf = (it: DayItem): StepState => (it.done ? 'done' : cur?.status === 'now' && cur.item.id === it.id ? 'now' : 'next')
  const doneTimed = timed.filter((i) => i.done).length
  // «Prossima»: la prossima tappa con orario ancora da fare (oggi: dopo l'ora attuale)
  const upcoming = timed.find((i) => !i.done && (nowMin == null || toMin(i.time as string) >= nowMin))

  const subtitle = [city, day.title, `giorno ${index + 1}`, `${day.items.length} ${day.items.length === 1 ? 'tappa' : 'tappe'}`].filter(Boolean).join(' · ')

  const goToStop = (id: string) => {
    setSelectedStop(null)
    const el = document.getElementById(`tappa-${id}`)
    if (!el) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
    setHighlightId(id)
    timers.current.push(window.setTimeout(() => setHighlightId((c) => (c === id ? null : c)), 1500))
  }

  // «Ottimizza percorso»: le tappe senza orario sul tragitto più breve, dopo quelle con orario
  const homeStay = stays.night
  const homePoint = homeStay?.mapsUrl ? parseMapsUrl(homeStay.mapsUrl) : null
  const routePlan = planRoute(
    day.items.map((i) => ({ id: i.id, position: i.position, time: i.time, lat: stopByItem.get(i.id)?.lat, lng: stopByItem.get(i.id)?.lng })),
    homePoint,
  )
  const optimizeRoute = async () => {
    if (!routePlan) return
    if (routePlan.changed.length === 0) {
      showToast('Il percorso è già il più corto')
      return
    }
    const old = new Map(day.items.map((i) => [i.id, i.position ?? 0]))
    const previous = routePlan.changed.map((c) => ({ id: c.id, position: old.get(c.id) ?? 0 }))
    const error = await t.setItemPositions(routePlan.changed)
    if (error) {
      showToast(error)
      return
    }
    const shorter = routePlan.afterM < routePlan.beforeM - 50
    showToast(
      shorter
        ? `Percorso accorciato da ${formatDistance(routePlan.beforeM)} a ${formatDistance(routePlan.afterM)}`
        : 'Tappe senza orario messe dopo quelle con orario',
      { label: 'Annulla', run: () => void t.setItemPositions(previous).then((m) => m && showToast(m)) },
    )
  }
  const onPin = (id: string) => (id === selectedStop ? goToStop(id) : setSelectedStop(id))
  const selected = route.stops.find((x) => x.id === selectedStop)

  const metaOf = (item: DayItem, extra?: string): string => {
    const place = placeOf(item)
    const dur = itemDuration(item, place)
    const sameName = place ? place.name.trim().toLowerCase() === item.title.trim().toLowerCase() : true
    return [dur ? formatDuration(dur) : '', item.note || place?.category || (place ? '' : KIND_LABEL[item.kind]), !sameName && place ? place.name : '', extra].filter(Boolean).join(' · ')
  }

  const openMovement = (ref: NonNullable<(typeof movements)[number]['ref']>) => {
    if (ref.type === 'flight') {
      const flight = trip.flights.find((f) => f.id === ref.id)
      if (flight) setSheet({ kind: 'edit-flight', flight })
    } else if (ref.type === 'stay') {
      const stay = trip.stays.find((s) => s.id === ref.id)
      if (stay) setSheet({ kind: 'edit-stay', stay })
    } else {
      const transport = trip.transports.find((x) => x.id === ref.id)
      if (transport) setSheet({ kind: 'edit-transport', transport })
    }
  }

  const stayRow = (s: Stay, label: string) => {
    const meals = [s.breakfast && 'colazione inclusa', s.dinner && 'cena', s.kitchen && 'cucina'].filter(Boolean).join(' · ')
    const info = label.startsWith('Check-out') ? s.checkOutInfo : label.startsWith('Check-in') ? s.checkInInfo : undefined
    return (
      <InfoRow
        key={`${label}-${s.id}`}
        icon="i-sez-bed"
        title={s.name}
        meta={[label, info, s.city, meals].filter(Boolean).join(' · ')}
        pills={[
          { tone: s.booked ? 'ok' : 'warn', text: s.booked ? 'Prenotato' : 'Non prenotato' },
          { tone: s.paid ? 'ok' : 'warn', text: s.paid ? 'Pagato' : 'Non pagato' },
        ]}
        onOpen={() => setSheet({ kind: 'edit-stay', stay: s })}
        mapsHref={s.address || s.mapsUrl ? mapsLinkFor({ mapsUrl: s.mapsUrl, lat: null, lng: null, name: [s.name, s.address, s.city].filter(Boolean).join(' ') }) : undefined}
      />
    )
  }
  const hasStay = Boolean(stays.night) || stays.checkIn.length > 0 || stays.checkOut.length > 0

  // link «Apri il percorso» di Google Maps con le tappe in ordine
  const ll = (s: { lat: number; lng: number }) => encodeURIComponent(`${s.lat},${s.lng}`)
  const rs = route.stops
  const routeHref =
    rs.length >= 2
      ? `https://www.google.com/maps/dir/?api=1&origin=${ll(rs[0])}&destination=${ll(rs[rs.length - 1])}${
          rs.length > 2 ? `&waypoints=${rs.slice(1, -1).slice(0, 9).map(ll).join('%7C')}` : ''
        }&travelmode=${route.legs.length > 0 && route.legs.every((l) => l.kind === 'walk') ? 'walking' : 'transit'}`
      : undefined

  return (
    <main className="screen">
      <PageHeader
        title={cap(formatDay(day.date))}
        subtitle={subtitle}
        back={{ href: '/giorni', label: 'Giorni' }}
        actions={
          <button type="button" className="rbtn" aria-label="Modifica il giorno" onClick={() => setSheet({ kind: 'day', day })}>
            <DotsIcon />
          </button>
        }
      />

      {day.notes && (
        <section className="card" aria-label="Note del giorno">
          <p className="b-sm" style={{ whiteSpace: 'pre-line' }}>
            {day.notes}
          </p>
        </section>
      )}

      <WeatherCard forecast={forecast} date={day.date} today={today} city={city} sun={sun} nowMin={nowMin} />

      {(day.items.length > 0 || route.transports.length > 0) && (
        <section aria-label="Mappa del giorno">
          <DayMapPanel route={route} center={trip.center} selectedId={selected?.id} onSelect={onPin} />
          {selected && (
            <div className="row card" style={{ marginTop: '12px', minHeight: '56px', padding: '6px 8px 6px 14px' }} role="status">
              <span className="grow tt" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.name}
              </span>
              <button type="button" className="btn soft sm" onClick={() => goToStop(selected.id)}>
                Vai alla tappa
              </button>
              <button type="button" className="rbtn sm" onClick={() => setSelectedStop(null)} aria-label="Deseleziona la tappa">
                <CloseG size={16} />
              </button>
            </div>
          )}
          {routeHref && (
            <div style={{ marginTop: '12px' }}>
              <a className="btn block" href={routeHref} target="_blank" rel="noopener noreferrer" aria-label="Apri il percorso in Google Maps: percorso del giorno">
                <Ic name="i-nav-route" size={28} />
                Apri il percorso in Google Maps
              </a>
            </div>
          )}
        </section>
      )}

      {day.items.length === 0 && <EmptyState art={ART.calendario} title="Giornata ancora libera" text="Aggiungi le tappe con il pulsante qui sotto." />}

      {timed.length > 0 && (
        <Section
          title="Tappe del giorno"
          aside={
            <span className="b-bold num">
              {day.items.length} {day.items.length === 1 ? 'tappa' : 'tappe'}
            </span>
          }
        >
          <div className="tp-prog">
            <div className="tp-pl">
              <b>
                {doneTimed} di {timed.length} {timed.length === 1 ? 'tappa' : 'tappe'}
              </b>
              {upcoming && <span>Prossima: {upcoming.time}</span>}
            </div>
            <div className="tp-pb" role="progressbar" aria-valuemin={0} aria-valuemax={timed.length} aria-valuenow={doneTimed} aria-label="Tappe fatte">
              <i style={{ width: `${(doneTimed / timed.length) * 100}%` }} />
            </div>
          </div>
          <ol className="tp-steps">
            {timed.map((item, i) => {
              const place = placeOf(item)
              const state = stateOf(item)
              const before = timed[i - 1]
              const link = legTo.get(item.id)
              const hop = before && link && link.from === before.id ? hopSummary(link.leg, route.routes[link.leg.key]) : null
              const startMin = toMin(item.time as string)
              const dur = itemDuration(item, place)
              const end = item.endTime ? toMin(item.endTime) : dur ? startMin + dur : undefined
              const late = nowMin != null && state === 'next' && startMin + (dur ?? 30) < nowMin
              return (
                <Fragment key={item.id}>
                  {hop && (
                    <li className={`tp-seg${stateOf(before) === 'done' ? '' : ' after'}`}>
                      <span className="tp-rail" />
                      <span className="tp-sg">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <use href={`#${hop.symbol}`} />
                        </svg>
                        {hop.text}
                      </span>
                    </li>
                  )}
                  <StepRow
                    id={item.id}
                    title={item.title}
                    state={state}
                    glyph={nodeGlyph(symbolKey(place, item.kind))}
                    meta={metaOf(item, state === 'now' && end != null ? `fino alle ${fromMin(end)}` : undefined)}
                    time={item.time}
                    badge={nowMin != null && state === 'next' ? (late ? 'Da fare' : 'Dopo') : undefined}
                    mapsHref={itemMapsHref(item, trip.places)}
                    highlight={highlightId === item.id}
                    onOpen={() => setSheet({ kind: 'edit-item', day, item })}
                    onToggleDone={() => void actions.toggleDone(item)}
                  />
                </Fragment>
              )
            })}
          </ol>
        </Section>
      )}

      {loose.length > 0 && (
        <Section title="Senza orario">
          {reordering && (
            <p className="b-sm muted" style={{ marginBottom: '10px' }}>
              Le tappe con un orario seguono l'orario. Le altre si spostano <span className="pointer-coarse:hidden">con le frecce.</span>
              <span className="hidden pointer-coarse:inline">trascinandole dalla maniglia a destra.</span>
            </p>
          )}
          <ul className="rows" ref={listRef}>
            {loose.map((item, i) => {
              const place = placeOf(item)
              const sym = item.kind === 'meal' ? 'i-cat-food' : place ? catSymbol(categoryIcon(place.category)) : 'i-nav-pin'
              const prevLoose = loose[i - 1]
              const nextLoose = loose[i + 1]
              return (
                <ItemRow
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  icon={sym}
                  meta={metaOf(item)}
                  done={item.done}
                  mapsHref={itemMapsHref(item, trip.places)}
                  highlight={highlightId === item.id}
                  onOpen={reordering ? undefined : () => setSheet({ kind: 'edit-item', day, item })}
                  onToggleDone={reordering ? undefined : () => void actions.toggleDone(item)}
                  dragging={drag?.from === i}
                  dragStyle={
                    drag
                      ? drag.from === i
                        ? { transform: `translateY(${drag.dy}px) scale(1.01)`, transition: 'none' }
                        : { transform: `translateY(${shiftDirection(i, drag.from, drag.to) * drag.step}px)`, transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1)' }
                      : undefined
                  }
                  reorder={
                    reordering
                      ? {
                          onGrab: (e) => start(i, e),
                          onUp: prevLoose ? () => void actions.moveTo(day.id, item, day.items.indexOf(prevLoose)) : undefined,
                          onDown: nextLoose ? () => void actions.moveTo(day.id, item, day.items.indexOf(nextLoose)) : undefined,
                        }
                      : undefined
                  }
                />
              )
            })}
          </ul>
          {(loose.length > 1 || routePlan) && (
            <div className="tp-foot" style={{ marginTop: '12px' }}>
              {loose.length > 1 && (
                <button type="button" className="btn line sm" aria-pressed={reordering} onClick={() => setReordering(!reordering)}>
                  {reordering ? 'Fine' : 'Riordina le tappe'}
                </button>
              )}
              {!reordering && routePlan && (
                <button type="button" className="btn line sm" onClick={() => void optimizeRoute()}>
                  Ottimizza percorso
                </button>
              )}
            </div>
          )}
        </Section>
      )}

      {movements.length > 0 && (
        <Section title="Spostamenti" aside={allLink('/altro/trasporti')}>
          <ul className="rows">
            {movements.map((e) => (
              <InfoRow
                key={`${e.ref?.type}-${e.ref?.id}-${e.title}`}
                icon={e.kind === 'stay' ? 'i-sez-bed' : e.kind === 'flight' ? 'i-tra-plane' : (e.mode && MOVE_ICON[e.mode]) || 'i-tra-bus'}
                title={e.title}
                meta={[e.time && `${e.time}${e.endTime ? ` → ${e.endTime}` : ''}`, e.mode && MODE_LABEL[e.mode], e.sub].filter(Boolean).join(' · ')}
                pills={e.flag ? [{ tone: e.flag.ok ? 'ok' : 'warn', text: e.flag.text }] : undefined}
                onOpen={e.ref ? () => openMovement(e.ref as NonNullable<typeof e.ref>) : undefined}
                right={e.ref ? <ChevronRightG size={20} /> : undefined}
              />
            ))}
          </ul>
        </Section>
      )}

      {hasStay && (
        <Section title="Alloggio" aside={allLink('/altro/alloggi')}>
          <ul className="rows">
            {stays.checkOut.map((s) => stayRow(s, 'Check-out oggi'))}
            {stays.checkIn.filter((s) => s.id !== stays.night?.id).map((s) => stayRow(s, 'Check-in oggi'))}
            {stays.night && stayRow(stays.night, stays.night.checkIn === day.date ? 'Check-in oggi · dormi qui' : 'Dormi qui')}
          </ul>
        </Section>
      )}

      {expenses.length > 0 && (
        <Section title="Spese del giorno" aside={<span className="b-bold num">{formatMoney(total, trip.baseCurrency)}</span>}>
          <ul className="rows">
            {expenses.map((e) => {
              const inBase = expenseBase(e, fx)
              return (
                <InfoRow
                  key={e.id}
                  icon="i-sez-budget"
                  title={e.label}
                  meta={[e.category, e.paidBy && payer.get(e.paidBy) && `pagato da ${payer.get(e.paidBy)}`].filter(Boolean).join(' · ')}
                  onOpen={() => setSheet({ kind: 'edit-expense', expense: e })}
                  right={
                    <span style={{ textAlign: 'right', flexShrink: 0, paddingRight: '4px' }}>
                      <b className="b-bold num" style={{ display: 'block' }}>
                        {formatMoney(e.amount, e.currency)}
                      </b>
                      {e.currency !== trip.baseCurrency && inBase !== null && (
                        <span className="cap muted num" style={{ display: 'block' }}>
                          ≈ {formatMoney(inBase, trip.baseCurrency)}
                        </span>
                      )}
                    </span>
                  }
                />
              )
            })}
          </ul>
        </Section>
      )}

      {(bookings.length > 0 || todos.length > 0) && (
        <Section title="Prenotazioni e da fare">
          <ul className="rows">
            {bookings.map((b) => (
              <InfoRow
                key={b.id}
                icon="i-sez-ticket"
                title={b.title}
                meta={b.code ? `Codice ${b.code}` : 'Prenotazione'}
                onOpen={() => setSheet({ kind: 'edit-booking', booking: b })}
                right={<ChevronRightG size={20} />}
              />
            ))}
            {todos.map((c) => (
              <li className="row" key={c.id}>
                <button
                  type="button"
                  className="hit"
                  role="checkbox"
                  aria-checked={c.done}
                  aria-label={`${c.done ? 'Da rifare' : 'Fatto'}: ${c.text}`}
                  onClick={async () => {
                    const message = await t.setChecklistDone(c.id, !c.done)
                    if (message) showToast(message)
                  }}
                >
                  <span className={`cb${c.done ? ' on' : ''}`}>{c.done && <CheckG size={16} sw={3} />}</span>
                </button>
                <button type="button" className="grow tt tp-edit" onClick={() => setSheet({ kind: 'edit-checklist', item: c })} style={c.done ? { color: 'var(--ink-muted)', textDecoration: 'line-through' } : undefined}>
                  {c.text}
                </button>
                {(c.quantity ?? 1) > 1 && (
                  <QuantityStepper
                    label={c.text}
                    have={doneCount(c)}
                    total={c.quantity as number}
                    onChange={async (n) => {
                      const message = await t.setChecklistCount(c.id, n)
                      if (message) showToast(message)
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="cta" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button type="button" className="btn block" onClick={() => setSheet({ kind: 'new-item', day })}>
          <PlusG />
          Aggiungi tappa
        </button>
        <div className="chips" role="group" aria-label="Aggiungi al giorno">
          <button type="button" className="chip" onClick={() => setSheet({ kind: 'new-transport', day })}>
            <PlusG size={16} sw={2.6} /> Trasporto
          </button>
          <button type="button" className="chip" onClick={() => setSheet({ kind: 'new-stay', day })}>
            <PlusG size={16} sw={2.6} /> Alloggio
          </button>
          <button type="button" className="chip" onClick={() => setSheet({ kind: 'new-expense', day })}>
            <PlusG size={16} sw={2.6} /> Spesa
          </button>
        </div>
        {(prev || next) && (
          <div className="dnav">
            {prev ? (
              <Link href={`/giorni/${prev.id}`} className="btn line sm" aria-label={`Giorno precedente, ${formatShort(prev.date)}`}>
                <ChevronLeftG size={18} /> {formatShort(prev.date)}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/giorni/${next.id}`} className="btn line sm" aria-label={`Giorno successivo, ${formatShort(next.date)}`}>
                {formatShort(next.date)} <ChevronRightG size={18} />
              </Link>
            )}
          </div>
        )}
      </div>

      {actions.dialog}
      <DaySheet trip={trip} state={sheet} onChange={setSheet} />
    </main>
  )
}
