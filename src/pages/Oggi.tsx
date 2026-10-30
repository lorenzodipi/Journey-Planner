import { Fragment } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'wouter'
import { budgetStatus, fxOf, paidFromSections, summarizeExpenses } from '../lib/budget'
import { buildExport, downloadJson, exportFileName, serializeExport } from '../lib/exportData'
import { doneCount } from '../lib/checklist'
import { daysBetween, formatDay, formatShort } from '../lib/dates'
import { hopSummary } from '../lib/dayRoute'
import { formatDuration, itemDuration } from '../lib/duration'
import { categoryIcon } from '../lib/categoryIcon'
import { itemMapsHref } from '../lib/itemMaps'
import { formatMoney, round2 } from '../lib/money'
import { originOf } from '../lib/origin'
import { minutesOfDay } from '../lib/sun'
import { destinationClock, eventsForDay, homeCountry, homeTime, nextItem, tripToday, type DayEvent } from '../lib/today'
import { rainWindow, weatherLabel, weatherSymbol, type DayWeather, type HourWeather } from '../lib/weather'
import { useDayRoute } from '../state/dayRoute'
import { useForecast } from '../state/forecast'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Day, DayItem, Place, Trip } from '../types'
import { catSymbol, sceneFor } from '../ui/art'
import { ChevronDownG, ChevronRightG, CheckG, LogoSym, NodeCheck, Ring } from '../ui/glyphs'
import { MapsPill } from '../ui/MapsPill'
import { Ic } from '../ui/Sprite'
import { KIND_LABEL } from '../ui/ItemRow'
import { useItemActions } from '../ui/useItemActions'

/** Data/ora corrente, aggiornata ogni minuto (l'orologio e la tappa in corso restano giusti anche a schermo acceso). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const longDateIn = (iso: string, timeZone: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(new Date(iso))
const flightTime = (iso: string, timeZone: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso))
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const fromMin = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export function Oggi() {
  const trip = useTrip()
  const now = useNow()
  const today = tripToday(trip, now) // oggi nel fuso della destinazione
  if (daysBetween(today, trip.startDate) > 0) return <OggiPre trip={trip} now={now} toStart={daysBetween(today, trip.startDate)} />
  if (daysBetween(today, trip.endDate) < 0) return <OggiPost trip={trip} />
  return <OggiDuring trip={trip} now={now} today={today} />
}

/* ------------------------------------------------------------------ prima del viaggio ------------------------------------------------------------------ */

function OggiPre({ trip, now, toStart }: { trip: Trip; now: Date; toStart: number }) {
  const t = useTrips()
  const legs = trip.flights.flatMap((f) => f.legs.map((leg) => ({ f, leg }))).sort((a, b) => a.leg.departAt.localeCompare(b.leg.departAt))
  const flight = legs.find((x) => x.leg.departAt >= now.toISOString()) ?? legs[0] ?? null
  const total = trip.checklist.length
  const done = trip.checklist.filter((i) => i.done).length
  const KIND_ORDER = { todo: 0, docs: 1, packing: 2 } as const
  const open = trip.checklist.filter((i) => !i.done).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.position - b.position)
  const people = trip.travelers.length

  async function toggle(id: string, isDone: boolean, qty?: number) {
    const message = (qty ?? 1) > 1 ? await t.setChecklistCount(id, isDone ? 0 : (qty as number)) : await t.setChecklistDone(id, !isDone)
    if (message) showToast(message)
  }

  return (
    <main className="screen">
      <section className="tkt cori" aria-label="Biglietto di partenza">
        <LogoSym className="tkt-logo" />
        <div className="tkt-top">
          <div className="tkt-meta">
            <span className="tkt-t">{trip.title}</span>
            <span className="num">
              {formatShort(trip.startDate)} – {formatShort(trip.endDate)}
              {people > 0 && ` · ${people} ${people === 1 ? 'persona' : 'persone'}`}
            </span>
          </div>
          <p className="tkt-lab">Alla partenza mancano</p>
          <div className="tkt-count" role="timer" aria-label={`Mancano ${toStart} ${toStart === 1 ? 'giorno' : 'giorni'} alla partenza`}>
            <span className="tkt-num num">{toStart}</span>
            <span className="tkt-unit">
              <b>{toStart === 1 ? 'giorno' : 'giorni'}</b>
              <span>alla partenza</span>
            </span>
          </div>
        </div>
        <div className="tkt-perf" aria-hidden="true" />
        <div className="tkt-bot">
          {flight ? (
            <>
              <p className="tkt-lab">Prossima partenza</p>
              <div className="tkt-route">
                <span className="tkt-ap">{flight.leg.from}</span>
                <Ic name="i-tra-plane" size={44} />
                <span className="tkt-ap">{flight.leg.to}</span>
              </div>
              <p className="tkt-when num">
                {cap(longDateIn(flight.leg.departAt, flight.leg.fromTz))} · {flightTime(flight.leg.departAt, flight.leg.fromTz)}
              </p>
            </>
          ) : (
            <>
              <p className="tkt-lab">{trip.destination || 'Il viaggio'}</p>
              <p className="tkt-when">{trip.flights.length === 0 ? 'Nessun volo inserito' : 'Nessun volo in programma'}</p>
              <Link href="/altro/trasporti" className="btn soft sm" style={{ marginTop: '12px' }}>
                Vai ai trasporti
              </Link>
            </>
          )}
        </div>
      </section>

      {total > 0 && (
        <section aria-label="Checklist">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
              <Ring value={done / total} label={`${done}/${total}`} size={64} />
              <div>
                <h2 className="h-md">Prima di partire</h2>
                <p className="b-sm">
                  {done} {done === 1 ? 'voce fatta' : 'voci fatte'} su {total}
                </p>
              </div>
            </div>
            {open.length > 0 && (
              <div style={{ borderTop: '1.5px solid var(--border-strong)' }}>
                {open.slice(0, 2).map((i, k) => {
                  const row = (
                    <div className="row" style={{ minHeight: '52px', padding: '4px 16px' }}>
                      <button type="button" className="hit" role="checkbox" aria-checked={false} aria-label={`Segna fatto: ${i.text}`} onClick={() => void toggle(i.id, i.done, i.quantity)}>
                        <span className="cb" />
                      </button>
                      <span className="grow tt">{i.text}</span>
                    </div>
                  )
                  return k === 0 ? row : <div style={{ borderTop: '1px solid var(--hairline)' }}>{row}</div>
                })}
              </div>
            )}
            <Link href="/altro/checklist" className="row" style={{ borderTop: '1.5px solid var(--border-strong)', fontWeight: 700 }}>
              {open.length > 0 ? `Vedi tutte le ${open.length} voci` : 'Apri la checklist'}
              <span style={{ marginLeft: 'auto' }}>
                <ChevronRightG />
              </span>
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}

/* ------------------------------------------------------------------ durante il viaggio ------------------------------------------------------------------ */

type StepState = 'done' | 'now' | 'next'

interface Step {
  key: string
  state: StepState
  glyph: string
  title: string
  meta: string
  time?: string
  endTime?: string
  late?: boolean
  mapsHref?: string
  item?: DayItem
  dur?: number
}

const glyphFor = (place: Place | undefined, kind: DayItem['kind']): string => {
  if (kind === 'meal') return 'gl-cat-food'
  if (place) return `gl-${catSymbol(categoryIcon(place.category)).slice(2)}`
  return 'gl-nav-pin'
}

const eventGlyph = (e: DayEvent): string => {
  if (e.kind === 'flight') return 'gl-tra-plane'
  if (e.kind === 'stay') return 'gl-sez-bed'
  if (e.mode === 'metro') return 'gl-tra-metro'
  if (e.mode === 'train') return 'gl-tra-train'
  if (e.mode === 'plane') return 'gl-tra-plane'
  if (e.mode === 'walk') return 'gl-tra-walk'
  return 'gl-tra-bus'
}

function WeatherHero({ day, hours, city, nowHour }: { day: DayWeather; hours: HourWeather[] | undefined; city: string; nowHour: number }) {
  const current = hours?.find((h) => h.h === nowHour) ?? hours?.[Math.min(nowHour, hours.length - 1)]
  const code = current?.code ?? day.code
  const temp = current?.t ?? day.max
  const rain = rainWindow(hours, 0)
  const rainLater = rainWindow(hours, nowHour)
  // tutte e 24 le ore del giorno, scorribili; si parte da «Ora»
  const picks = useMemo(
    () => (hours ?? []).map((h) => ({ label: h.h === nowHour ? 'Ora' : `${h.h}:00`, h, now: h.h === nowHour })),
    [hours, nowHour],
  )
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = strip.current
    const n = el?.querySelector<HTMLElement>('.wxi.now')
    if (el && n) el.scrollLeft = Math.max(0, n.offsetLeft - 8)
  }, [picks.length])
  const w = weatherLabel(code)
  const sentence = rainLater ? `Pioggia dalle ${rainLater.from}` : rain ? 'Pioggia già passata' : undefined
  return (
    <section className="wxc cori" aria-label={`Meteo a ${city}`}>
      <Ic name={weatherSymbol(code)} size={48} />
      <div className="wxm">
        <span className="wxl">Meteo a {city}</span>
        <span className="wxt num">{temp}°</span>
      </div>
      <div className="wxd">
        <span className="wxn">{w.label}</span>
        {sentence && <span>{sentence}</span>}
        <span className="num">Minima {day.min}°</span>
      </div>
      {picks.length > 0 && (
        <div className="wxh" ref={strip} role="list" aria-label={`Meteo ora per ora a ${city}, scorri in orizzontale`} tabIndex={0}>
          {picks.map(({ label, h, now }) => (
            <div className={`wxi ${now ? 'now' : ''}`.trim()} role="listitem">
              <span className="num">{label}</span>
              <Ic name={weatherSymbol(h.code)} size={30} />
              <b className="num">{h.t}°</b>
            </div>
          ))}
        </div>
      )}
      {rainLater && (
        <p className="wxr">
          <Ic name="i-sez-rain" size={22} />
          Pioggia dalle {rainLater.from} alle {rainLater.to} · porta l’ombrello
        </p>
      )}
    </section>
  )
}

function OggiDuring({ trip, now, today }: { trip: Trip; now: Date; today: string }) {
  const forecast = useForecast(trip)
  const actions = useItemActions()
  const focus: Day | undefined = trip.days.find((d) => d.date >= today) ?? trip.days[0]
  const dayIndex = focus ? trip.days.findIndex((d) => d.id === focus.id) : 0
  const isToday = focus?.date === today
  const nowMin = minutesOfDay(now, trip.timezone)
  const route = useDayRoute(trip, focus ?? { id: '', date: '', city: '', items: [] })
  const current = focus && isToday ? nextItem(focus, nowMin) : null
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const origin = originOf(trip)
  const homeTz = origin?.timezone ?? deviceTz
  const clock = destinationClock(trip.timezone, homeTz, now)
  const homeName = origin?.name ?? homeCountry(navigator.language)
  const city = focus?.city || trip.destination || 'Destinazione'
  const day = forecast.days.find((d) => d.date === focus?.date)
  const placeOf = (it: DayItem) => trip.places.find((p) => p.id === it.placeId)

  // le tappe del giorno e gli eventi (voli, trasferimenti, check-in/out) nello stesso filo
  const steps = useMemo<Step[]>(() => {
    if (!focus) return []
    const out: (Step & { sort: number })[] = []
    focus.items.forEach((it, i) => {
      const place = placeOf(it)
      const dur = itemDuration(it, place)
      const start = it.time ? toMin(it.time) : undefined
      const end = it.endTime ? toMin(it.endTime) : start != null && dur ? start + dur : undefined
      const state: StepState = it.done ? 'done' : current?.item.id === it.id && current.status === 'now' ? 'now' : 'next'
      out.push({
        key: it.id,
        state,
        glyph: glyphFor(place, it.kind),
        title: it.title,
        meta: [dur ? formatDuration(dur) : '', it.note || place?.category || KIND_LABEL[it.kind]].filter(Boolean).join(' · '),
        time: it.time,
        endTime: end != null ? fromMin(end) : undefined,
        late: state === 'next' && isToday && start != null && start + (dur ?? 30) < nowMin,
        mapsHref: itemMapsHref(it, trip.places),
        item: it,
        dur: end != null && start != null ? end - start : dur,
        sort: start ?? 24 * 60 + 1 + i,
      })
    })
    for (const e of eventsForDay(trip, focus.date)) {
      const isOut = e.kind === 'stay' && e.title.startsWith('Check-out')
      const isIn = e.kind === 'stay' && !isOut
      const start = e.time ? toMin(e.time) : undefined
      out.push({
        key: `${e.ref?.type}-${e.ref?.id}-${e.title}`,
        state: isToday && start != null && start + 30 < nowMin ? 'done' : 'next',
        glyph: eventGlyph(e),
        title: e.title,
        meta: e.sub ?? '',
        time: e.time || undefined,
        sort: isOut ? -1 : isIn ? 24 * 60 : (start ?? 24 * 60),
      })
    }
    return out.sort((a, b) => a.sort - b.sort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, trip, current?.item.id, current?.status, nowMin])

  const timedItems = focus?.items ?? []
  const doneN = timedItems.filter((i) => i.done).length
  const legByTo = useMemo(() => {
    // il tratto che porta a ciascuna tappa con posizione (route.legs è nell'ordine delle tappe)
    const m = new Map<string, (typeof route.legs)[number]>()
    route.legs.forEach((leg, i) => {
      const to = route.stops[i + 1]
      if (to) m.set(to.id, leg)
    })
    return m
  }, [route.legs, route.stops])
  const nowAt = steps.findIndex((s) => s.state === 'now')

  return (
    <main className="screen oggi-c">
      <header className="hero pad">
        <div className="hrow">
          <div>
            <h1>Oggi</h1>
            <p className="hsub">
              {focus ? `${formatDay(focus.date)} · giorno ${dayIndex + 1} di ${trip.days.length}` : trip.title}
            </p>
          </div>
          <div className="acts" />
        </div>
        <div className="hps clk-row">
          <div className="clk a cori">
            <span className="cl">{city}</span>
            <span className="num ct">{clock.time}</span>
          </div>
          <div className="clk b">
            <span className="cl">{homeName}</span>
            <span className="num ct">{homeTime(homeTz, now)}</span>
          </div>
        </div>
        {day && isToday && <WeatherHero day={day} hours={day.hours} city={city} nowHour={Math.floor(nowMin / 60)} />}
      </header>

      <section aria-label="Programma di oggi">
        <div className="sec-h" style={{ marginBottom: '10px' }}>
          <h2 className="h-md">Programma di oggi</h2>
          {timedItems.length > 0 && (
            <span className="b-bold num">
              {doneN} di {timedItems.length} {doneN === 1 ? 'fatta' : 'fatte'}
            </span>
          )}
        </div>
        {timedItems.length > 0 ? (
          <>
            <div className="bar" role="progressbar" aria-label="Tappe fatte" aria-valuemin={0} aria-valuemax={timedItems.length} aria-valuenow={doneN} style={{ height: '10px' }}>
              <i style={{ width: `${(doneN / timedItems.length) * 100}%` }} />
            </div>
            <div style={{ height: '16px' }} />
          </>
        ) : null}
        {steps.length > 0 ? (
          <ol className="tp-steps">
            {steps.map((s, i) => {
              const prev = steps[i - 1]
              const leg = s.item ? legByTo.get(s.item.id) : undefined
              const hop = leg && prev ? hopSummary(leg, route.routes[leg.key]) : null
              return (
                <Fragment key={s.key}>
                  {hop && (
                    <li className={`tp-seg${nowAt >= 0 && i > nowAt ? ' after' : ''}`}>
                      <span className="tp-rail" />
                      <span className="tp-sg">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <use href={`#${hop.symbol}`} />
                        </svg>
                        {hop.text}
                      </span>
                    </li>
                  )}
                  <StepRow s={s} nowMin={nowMin} onState={s.item ? (done) => (done !== !!s.item?.done ? void actions.toggleDone(s.item as DayItem) : undefined) : undefined} />
                </Fragment>
              )
            })}
          </ol>
        ) : (
          <div className="card empty">
            <p className="h-sm">Giornata libera</p>
            <p className="b-sm muted" style={{ marginTop: '4px' }}>Aggiungi le tappe dalla scheda Giorni.</p>
          </div>
        )}
      </section>
      {actions.dialog}
    </main>
  )
}

function StepRow({ s, nowMin, onState }: { s: Step; nowMin: number; onState?: (done: boolean) => void }) {
  const node = (
    <span className="tp-rail">
      <span className={`tp-nd ${s.state}`}>
        {s.state === 'done' ? (
          <NodeCheck />
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <use href={`#${s.glyph}`} />
          </svg>
        )}
      </span>
    </span>
  )
  if (s.state === 'now') {
    const start = s.time ? toMin(s.time) : undefined
    const end = s.endTime ? toMin(s.endTime) : undefined
    const total = start != null && end != null ? end - start : undefined
    const elapsed = start != null ? Math.max(0, Math.min(total ?? 0, nowMin - start)) : 0
    return (
      <li className="tp-stp now">
        {node}
        <div className="tp-body tp-card cori" aria-label="Tappa in corso">
          <div className="tp-top">
            <div>
              <div className="tp-t">{s.title}</div>
              {s.meta && <div className="tp-m">{s.meta}</div>}
            </div>
            <div className="tp-r">
              <span className="tp-badge now">Ora</span>
            </div>
          </div>
          {s.time && (
            <div className="tp-when">
              <span className="num tp-big">{s.endTime ? `${s.time} – ${s.endTime}` : s.time}</span>
              {total ? <span className="num">{formatDuration(total)}</span> : null}
            </div>
          )}
          {total ? (
            <div className="tp-pr">
              <div className="tp-pbar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={elapsed} aria-label="Tempo trascorso in questa tappa">
                <i style={{ width: `${(elapsed / total) * 100}%` }} />
              </div>
              <span className="num">Restano {formatDuration(Math.max(0, total - elapsed))}</span>
            </div>
          ) : null}
          <div className="tp-acts">
            {s.mapsHref && <MapsPill kind="big" href={s.mapsHref} label={s.title} />}
            {onState && (
              <label className="tp-sel" style={{ position: 'relative' }}>
                <span className="tp-sel-t">
                  <span className="tp-sel-l">Stato della tappa:</span>
                  <span className="tp-sel-v">In corso</span>
                </span>
                <ChevronDownG size={20} sw={2.6} />
                <select
                  aria-label="Stato della tappa: In corso. Cambia stato"
                  value="now"
                  onChange={(e) => onState(e.currentTarget.value === 'done')}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                >
                  <option value="now">In corso</option>
                  <option value="done">Fatta</option>
                  <option value="todo">Da fare</option>
                </select>
              </label>
            )}
          </div>
        </div>
      </li>
    )
  }
  return (
    <li className={`tp-stp ${s.state}`}>
      {node}
      <div className="tp-body">
        <div className="tp-top">
          <div>
            <div className="tp-t">{s.title}</div>
            {s.meta && <div className="tp-m">{s.meta}</div>}
          </div>
          <div className="tp-r">
            {s.time && <span className="tp-time">{s.time}</span>}
            {s.state === 'done' ? (
              <span className="tp-st">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.5 12.5l3.8 3.8 7.2-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Fatta
              </span>
            ) : (
              <span className="tp-badge next">{s.late ? 'Da fare' : 'Dopo'}</span>
            )}
          </div>
        </div>
        {(s.mapsHref || (s.item && s.state !== 'done')) && (
          <div className="tp-foot">
            {s.mapsHref && <MapsPill kind="tp" href={s.mapsHref} label={s.title} />}
            {s.item && s.state === 'next' && s.late && onState && (
              <button type="button" className="btn soft sm" onClick={() => onState(true)}>
                Segna fatta
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ dopo il viaggio ------------------------------------------------------------------ */

function OggiPost({ trip }: { trip: Trip }) {
  const t = useTrips()
  const nights = Math.max(0, daysBetween(trip.startDate, trip.endDate))
  const nDays = trip.days.length || nights + 1
  const cities = [...new Set(trip.days.map((d) => d.city).filter(Boolean))]
  const items = trip.days.flatMap((d) => d.items)
  const doneItems = items.filter((i) => i.done).length
  const visited = trip.places.filter((p) => p.status === 'done')
  // il volo di rientro: l'ultima tratta del viaggio
  const legs = trip.flights.flatMap((f) => f.legs).sort((a, b) => a.departAt.localeCompare(b.departAt))
  const back = legs[legs.length - 1]
  const dayOfPlace = (id: string) => trip.days.find((d) => d.items.some((i) => i.placeId === id))
  const review = visited
    .map((p) => ({ p, day: dayOfPlace(p.id) }))
    .sort((a, b) => (a.day?.date ?? '9').localeCompare(b.day?.date ?? '9'))
  const fx = fxOf(trip)
  const spent = round2(summarizeExpenses(trip.expenses, trip.travelers, fx).total + paidFromSections(trip, fx).paid)
  const limit = budgetStatus(trip.budgetLimit, spent, 0)

  async function share() {
    const text = `${trip.title}: ${nDays} giorni${cities.length ? `, ${cities.length} città` : ''}, ${doneItems} tappe fatte, ${visited.length} luoghi visitati.`
    try {
      if (navigator.share) await navigator.share({ title: trip.title, text })
      else {
        await navigator.clipboard.writeText(text)
        showToast('Riepilogo copiato')
      }
    } catch {
      // chiuso senza condividere
    }
  }
  async function save() {
    try {
      await downloadJson(exportFileName([trip]), serializeExport(buildExport([trip])))
      showToast(__NATIVE__ ? 'File pronto: scegli dove salvarlo' : 'File scaricato')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Esportazione non riuscita')
    }
  }
  void t

  return (
    <main className="screen">
      <section style={{ background: 'var(--tinta-azzurro)', color: 'var(--on-tinta)', borderRadius: '28px', padding: '24px', position: 'relative', overflow: 'hidden' }} aria-label="Bentornati">
        <LogoSym width={62} height={73} style={{ position: 'absolute', right: '24px', top: '20px' }} />
        <p lang="ja" style={{ font: "700 14px/20px 'Zen Kaku Gothic New','Hiragino Sans','Yu Gothic',sans-serif", letterSpacing: '.04em', position: 'relative' }}>
          旅の思い出
        </p>
        <h1 style={{ marginTop: '24px', position: 'relative', font: '500 40px/44px var(--font-display)', letterSpacing: '-.02em' }}>Bentornati</h1>
        <p style={{ position: 'relative', marginTop: '4px', fontWeight: 500, color: 'var(--on-tinta-muted)' }}>
          {nDays} giorni e {nights} notti{trip.destination ? ` in ${trip.destination}` : ''}
        </p>
        {back && (
          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '2px dashed var(--on-tinta-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="h-lg num">{back.from}</span>
              <Ic name="i-tra-plane" size={28} />
              <span className="h-lg num">{back.to}</span>
            </div>
            <span className="b-bold">rientro {formatShort(trip.endDate)}</span>
          </div>
        )}
      </section>

      <section aria-label="Il viaggio in numeri">
        <div className="sec-h" style={{ marginBottom: '10px' }}>
          <h2 className="h-md">Il viaggio in numeri</h2>
        </div>
        <div className="statg">
          <div className="stat" style={{ background: 'var(--tinta-menta)' }}>
            <p className="big">{nDays}</p>
            <div className="stat-t">
              <p className="b-bold">{nDays === 1 ? 'giorno' : 'giorni'}</p>
              <p className="of">{formatShort(trip.startDate)} – {formatShort(trip.endDate)}</p>
            </div>
            <img className="stat-pic" src={sceneFor('panorama')} alt="" />
            <div className="stat-x dots" aria-hidden="true">
              {Array.from({ length: nDays }, () => (
                <i />
              ))}
            </div>
          </div>
          {cities.length > 0 && (
            <div className="stat" style={{ background: 'var(--tinta-azzurro)' }}>
              <p className="big">{cities.length}</p>
              <div className="stat-t">
                <p className="b-bold">{cities.length === 1 ? 'città' : 'città'}</p>
                <p className="of">{cities.length > 1 ? `da ${cities[0]} a ${cities[cities.length - 1]}` : cities[0]}</p>
              </div>
              <img className="stat-pic" src={sceneFor('district')} alt="" />
            </div>
          )}
          {items.length > 0 && (
            <div className="stat" style={{ background: 'var(--tinta-lavanda)' }}>
              <p className="big">{doneItems}</p>
              <div className="stat-t">
                <p className="b-bold">{doneItems === 1 ? 'tappa fatta' : 'tappe fatte'}</p>
                <p className="of">su {items.length} {items.length === 1 ? 'pianificata' : 'pianificate'}</p>
              </div>
              <img className="stat-pic" src={sceneFor('temple')} alt="" />
              <div className="stat-x sx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={doneItems} aria-label={`Tappe fatte su ${items.length} pianificate`}>
                <i style={{ width: `${(doneItems / items.length) * 100}%` }} />
              </div>
            </div>
          )}
          {trip.places.length > 0 && (
            <div className="stat" style={{ background: 'var(--tinta-confetto)' }}>
              <p className="big">{visited.length}</p>
              <div className="stat-t">
                <p className="b-bold">{visited.length === 1 ? 'luogo visitato' : 'luoghi visitati'}</p>
                <p className="of">su {trip.places.length} {trip.places.length === 1 ? 'salvato' : 'salvati'}</p>
              </div>
              <img className="stat-pic" src={sceneFor('nature')} alt="" />
              <div className="stat-x sx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={trip.places.length} aria-valuenow={visited.length} aria-label={`Luoghi visitati su ${trip.places.length} salvati`}>
                <i style={{ width: `${(visited.length / trip.places.length) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {review.length > 0 && (
        <section aria-label="Luoghi visitati">
          <div className="sec-h" style={{ marginBottom: '10px' }}>
            <h2 className="h-md">Da rivedere</h2>
            <span className="b-bold num">
              {review.length} {review.length === 1 ? 'luogo' : 'luoghi'}
            </span>
          </div>
          <div className="rows">
            {review.slice(0, 3).map(({ p, day }) => (
              <div className="prow">
                <span className="thumb" style={{ width: '56px', height: '56px' }}>
                  <img src={sceneFor(categoryIcon(p.category))} alt="" />
                </span>
                <div className="grow">
                  <p className="pt2">{p.name}</p>
                  <p className="pm">{[p.city, day && formatDay(day.date)].filter(Boolean).join(' · ')}</p>
                  <span className="sp vi">
                    <CheckG size={14} sw={3} />
                    Visitato
                  </span>
                </div>
                <MapsPill kind="btn" href={mapsHrefFor(p)} label={p.name} />
              </div>
            ))}
          </div>
        </section>
      )}

      <Link href="/altro/budget" className="row card" style={{ padding: '12px 16px' }}>
        <Ic name="i-sez-budget" size={44} />
        <span className="grow">
          <span className="tt" style={{ display: 'block', fontWeight: 700 }}>
            Spese
          </span>
          <span className="mm num" style={{ whiteSpace: 'nowrap' }}>{formatMoney(spent, trip.baseCurrency)} spesi</span>
        </span>
        {limit && trip.budgetLimit ? (
          <span style={{ textAlign: 'right' }}>
            <span className={`sp ${limit.state === 'over' ? 'bad' : limit.state === 'warn' ? 'warn' : 'ok'}`}>
              <CheckG size={14} sw={3} />
              {limit.state === 'over' ? 'Oltre il budget' : 'Sotto il budget'}
            </span>
            <b className="b-bold num" style={{ display: 'block' }}>
              {formatMoney(Math.abs(round2(trip.budgetLimit - spent)), trip.baseCurrency)}
            </b>
          </span>
        ) : null}
        <span>
          <ChevronRightG />
        </span>
      </Link>

      <div className="cta" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button type="button" className="btn block" onClick={() => void share()}>
          Condividi il riepilogo
        </button>
        <button type="button" className="btn soft block" onClick={() => void save()}>
          Salva tutti i dati del viaggio
        </button>
      </div>
    </main>
  )
}

import { mapsLinkFor } from '../lib/mapsUrl'
const mapsHrefFor = (p: Place) => mapsLinkFor(p)
void doneCount
