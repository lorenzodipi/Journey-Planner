import { Fragment } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
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
    <main class="screen">
      <section class="tkt cori" aria-label="Biglietto di partenza">
        <LogoSym class="tkt-logo" />
        <div class="tkt-top">
          <div class="tkt-meta">
            <span class="tkt-t">{trip.title}</span>
            <span class="num">
              {formatShort(trip.startDate)} – {formatShort(trip.endDate)}
              {people > 0 && ` · ${people} ${people === 1 ? 'persona' : 'persone'}`}
            </span>
          </div>
          <p class="tkt-lab">Alla partenza mancano</p>
          <div class="tkt-count" role="timer" aria-label={`Mancano ${toStart} ${toStart === 1 ? 'giorno' : 'giorni'} alla partenza`}>
            <span class="tkt-num num">{toStart}</span>
            <span class="tkt-unit">
              <b>{toStart === 1 ? 'giorno' : 'giorni'}</b>
              <span>alla partenza</span>
            </span>
          </div>
        </div>
        <div class="tkt-perf" aria-hidden="true" />
        <div class="tkt-bot">
          {flight ? (
            <>
              <p class="tkt-lab">Prossima partenza</p>
              <div class="tkt-route">
                <span class="tkt-ap">{flight.leg.from}</span>
                <Ic name="i-tra-plane" size={44} />
                <span class="tkt-ap">{flight.leg.to}</span>
              </div>
              <p class="tkt-when num">
                {cap(longDateIn(flight.leg.departAt, flight.leg.fromTz))} · {flightTime(flight.leg.departAt, flight.leg.fromTz)}
              </p>
            </>
          ) : (
            <>
              <p class="tkt-lab">{trip.destination || 'Il viaggio'}</p>
              <p class="tkt-when">{trip.flights.length === 0 ? 'Nessun volo inserito' : 'Nessun volo in programma'}</p>
              <Link href="/altro/trasporti" class="btn soft sm" style={{ marginTop: '12px' }}>
                Vai ai trasporti
              </Link>
            </>
          )}
        </div>
      </section>

      {total > 0 && (
        <section aria-label="Checklist">
          <div class="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
              <Ring value={done / total} label={`${done}/${total}`} size={64} />
              <div>
                <h2 class="h-md">Prima di partire</h2>
                <p class="b-sm">
                  {done} {done === 1 ? 'voce fatta' : 'voci fatte'} su {total}
                </p>
              </div>
            </div>
            {open.length > 0 && (
              <div style={{ borderTop: '1.5px solid var(--border-strong)' }}>
                {open.slice(0, 2).map((i, k) => {
                  const row = (
                    <div class="row" style={{ minHeight: '52px', padding: '4px 16px' }}>
                      <button type="button" class="hit" role="checkbox" aria-checked={false} aria-label={`Segna fatto: ${i.text}`} onClick={() => void toggle(i.id, i.done, i.quantity)}>
                        <span class="cb" />
                      </button>
                      <span class="grow tt">{i.text}</span>
                    </div>
                  )
                  return k === 0 ? row : <div style={{ borderTop: '1px solid var(--hairline)' }}>{row}</div>
                })}
              </div>
            )}
            <Link href="/altro/checklist" class="row" style={{ borderTop: '1.5px solid var(--border-strong)', fontWeight: 700 }}>
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
  // sei orari: una mattina presto, «Ora» e le ore che seguono, con l'inizio della pioggia
  const picks = useMemo(() => {
    if (!hours) return [] as { label: string; h: HourWeather; now?: boolean }[]
    const want = new Set<number>([9, 12, 15, 18, 21])
    if (rainLater) want.add(rainLater.from)
    const list = [...want].filter((h) => Math.abs(h - nowHour) >= 2).sort((a, b) => a - b)
    const out: { label: string; h: HourWeather; now?: boolean }[] = list
      .map((h) => hours.find((x) => x.h === h))
      .filter((x): x is HourWeather => !!x)
      .map((h) => ({ label: `${h.h}:00`, h }))
    const nowH = hours.find((h) => h.h === nowHour)
    if (nowH) out.push({ label: 'Ora', h: nowH, now: true })
    out.sort((a, b) => a.h.h - b.h.h)
    // al massimo sei: si tengono quelli più vicini a «Ora»
    while (out.length > 6) {
      const far = out.reduce((best, x, i) => (!x.now && Math.abs(x.h.h - nowHour) > Math.abs(out[best].h.h - nowHour) ? i : best), 0)
      out.splice(far, 1)
    }
    return out
  }, [hours, nowHour, rainLater])
  const w = weatherLabel(code)
  const sentence = rainLater ? `Pioggia dalle ${rainLater.from}` : rain ? 'Pioggia già passata' : undefined
  return (
    <section class="wxc cori" aria-label={`Meteo a ${city}`}>
      <Ic name={weatherSymbol(code)} size={48} />
      <div class="wxm">
        <span class="wxl">Meteo a {city}</span>
        <span class="wxt num">{temp}°</span>
      </div>
      <div class="wxd">
        <span class="wxn">{w.label}</span>
        {sentence && <span>{sentence}</span>}
        <span class="num">Minima {day.min}°</span>
      </div>
      {picks.length > 0 && (
        <div class="wxh" role="list" aria-label={`Meteo ora per ora a ${city}`}>
          {picks.map(({ label, h, now }) => (
            <div class={`wxi ${now ? 'now' : ''}`.trim()} role="listitem">
              <span class="num">{label}</span>
              <Ic name={weatherSymbol(h.code)} size={30} />
              <b class="num">{h.t}°</b>
            </div>
          ))}
        </div>
      )}
      {rainLater && (
        <p class="wxr">
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
    <main class="screen oggi-c">
      <header class="hero pad">
        <div class="hrow">
          <div>
            <h1>Oggi</h1>
            <p class="hsub">
              {focus ? `${formatDay(focus.date)} · giorno ${dayIndex + 1} di ${trip.days.length}` : trip.title}
            </p>
          </div>
          <div class="acts" />
        </div>
        <div class="hps clk-row">
          <div class="clk a cori">
            <span class="cl">{city}</span>
            <span class="num ct">{clock.time}</span>
          </div>
          <div class="clk b">
            <span class="cl">{homeName}</span>
            <span class="num ct">{homeTime(homeTz, now)}</span>
          </div>
        </div>
        {day && isToday && <WeatherHero day={day} hours={day.hours} city={city} nowHour={Math.floor(nowMin / 60)} />}
      </header>

      <section aria-label="Programma di oggi">
        <div class="sec-h" style={{ marginBottom: '10px' }}>
          <h2 class="h-md">Programma di oggi</h2>
          {timedItems.length > 0 && (
            <span class="b-bold num">
              {doneN} di {timedItems.length} {doneN === 1 ? 'fatta' : 'fatte'}
            </span>
          )}
        </div>
        {timedItems.length > 0 ? (
          <>
            <div class="bar" role="progressbar" aria-label="Tappe fatte" aria-valuemin={0} aria-valuemax={timedItems.length} aria-valuenow={doneN} style={{ height: '10px' }}>
              <i style={{ width: `${(doneN / timedItems.length) * 100}%` }} />
            </div>
            <div style={{ height: '16px' }} />
          </>
        ) : null}
        {steps.length > 0 ? (
          <ol class="tp-steps">
            {steps.map((s, i) => {
              const prev = steps[i - 1]
              const leg = s.item ? legByTo.get(s.item.id) : undefined
              const hop = leg && prev ? hopSummary(leg, route.routes[leg.key]) : null
              return (
                <Fragment key={s.key}>
                  {hop && (
                    <li class={`tp-seg${nowAt >= 0 && i > nowAt ? ' after' : ''}`}>
                      <span class="tp-rail" />
                      <span class="tp-sg">
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
          <div class="card empty">
            <p class="h-sm">Giornata libera</p>
            <p class="b-sm muted" style={{ marginTop: '4px' }}>Aggiungi le tappe dalla scheda Giorni.</p>
          </div>
        )}
      </section>
      {actions.dialog}
    </main>
  )
}

function StepRow({ s, nowMin, onState }: { s: Step; nowMin: number; onState?: (done: boolean) => void }) {
  const node = (
    <span class="tp-rail">
      <span class={`tp-nd ${s.state}`}>
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
      <li class="tp-stp now">
        {node}
        <div class="tp-body tp-card cori" aria-label="Tappa in corso">
          <div class="tp-top">
            <div>
              <div class="tp-t">{s.title}</div>
              {s.meta && <div class="tp-m">{s.meta}</div>}
            </div>
            <div class="tp-r">
              <span class="tp-badge now">Ora</span>
            </div>
          </div>
          {s.time && (
            <div class="tp-when">
              <span class="num tp-big">{s.endTime ? `${s.time} – ${s.endTime}` : s.time}</span>
              {total ? <span class="num">{formatDuration(total)}</span> : null}
            </div>
          )}
          {total ? (
            <div class="tp-pr">
              <div class="tp-pbar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={elapsed} aria-label="Tempo trascorso in questa tappa">
                <i style={{ width: `${(elapsed / total) * 100}%` }} />
              </div>
              <span class="num">Restano {formatDuration(Math.max(0, total - elapsed))}</span>
            </div>
          ) : null}
          <div class="tp-acts">
            {s.mapsHref && <MapsPill kind="big" href={s.mapsHref} label={s.title} />}
            {onState && (
              <label class="tp-sel" style={{ position: 'relative' }}>
                <span class="tp-sel-t">
                  <span class="tp-sel-l">Stato della tappa:</span>
                  <span class="tp-sel-v">In corso</span>
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
    <li class={`tp-stp ${s.state}`}>
      {node}
      <div class="tp-body">
        <div class="tp-top">
          <div>
            <div class="tp-t">{s.title}</div>
            {s.meta && <div class="tp-m">{s.meta}</div>}
          </div>
          <div class="tp-r">
            {s.time && <span class="tp-time">{s.time}</span>}
            {s.state === 'done' ? (
              <span class="tp-st">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.5 12.5l3.8 3.8 7.2-8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Fatta
              </span>
            ) : (
              <span class="tp-badge next">{s.late ? 'Da fare' : 'Dopo'}</span>
            )}
          </div>
        </div>
        {(s.mapsHref || (s.item && s.state !== 'done')) && (
          <div class="tp-foot">
            {s.mapsHref && <MapsPill kind="tp" href={s.mapsHref} label={s.title} />}
            {s.item && s.state === 'next' && s.late && onState && (
              <button type="button" class="btn soft sm" onClick={() => onState(true)}>
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
    <main class="screen">
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
              <span class="h-lg num">{back.from}</span>
              <Ic name="i-tra-plane" size={28} />
              <span class="h-lg num">{back.to}</span>
            </div>
            <span class="b-bold">rientro {formatShort(trip.endDate)}</span>
          </div>
        )}
      </section>

      <section aria-label="Il viaggio in numeri">
        <div class="sec-h" style={{ marginBottom: '10px' }}>
          <h2 class="h-md">Il viaggio in numeri</h2>
        </div>
        <div class="statg">
          <div class="stat" style={{ background: 'var(--tinta-menta)' }}>
            <p class="big">{nDays}</p>
            <div class="stat-t">
              <p class="b-bold">{nDays === 1 ? 'giorno' : 'giorni'}</p>
              <p class="of">{formatShort(trip.startDate)} – {formatShort(trip.endDate)}</p>
            </div>
            <img class="stat-pic" src={sceneFor('panorama')} alt="" />
            <div class="stat-x dots" aria-hidden="true">
              {Array.from({ length: nDays }, () => (
                <i />
              ))}
            </div>
          </div>
          {cities.length > 0 && (
            <div class="stat" style={{ background: 'var(--tinta-azzurro)' }}>
              <p class="big">{cities.length}</p>
              <div class="stat-t">
                <p class="b-bold">{cities.length === 1 ? 'città' : 'città'}</p>
                <p class="of">{cities.length > 1 ? `da ${cities[0]} a ${cities[cities.length - 1]}` : cities[0]}</p>
              </div>
              <img class="stat-pic" src={sceneFor('district')} alt="" />
            </div>
          )}
          {items.length > 0 && (
            <div class="stat" style={{ background: 'var(--tinta-lavanda)' }}>
              <p class="big">{doneItems}</p>
              <div class="stat-t">
                <p class="b-bold">{doneItems === 1 ? 'tappa fatta' : 'tappe fatte'}</p>
                <p class="of">su {items.length} {items.length === 1 ? 'pianificata' : 'pianificate'}</p>
              </div>
              <img class="stat-pic" src={sceneFor('temple')} alt="" />
              <div class="stat-x sx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={doneItems} aria-label={`Tappe fatte su ${items.length} pianificate`}>
                <i style={{ width: `${(doneItems / items.length) * 100}%` }} />
              </div>
            </div>
          )}
          {trip.places.length > 0 && (
            <div class="stat" style={{ background: 'var(--tinta-confetto)' }}>
              <p class="big">{visited.length}</p>
              <div class="stat-t">
                <p class="b-bold">{visited.length === 1 ? 'luogo visitato' : 'luoghi visitati'}</p>
                <p class="of">su {trip.places.length} {trip.places.length === 1 ? 'salvato' : 'salvati'}</p>
              </div>
              <img class="stat-pic" src={sceneFor('nature')} alt="" />
              <div class="stat-x sx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={trip.places.length} aria-valuenow={visited.length} aria-label={`Luoghi visitati su ${trip.places.length} salvati`}>
                <i style={{ width: `${(visited.length / trip.places.length) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {review.length > 0 && (
        <section aria-label="Luoghi visitati">
          <div class="sec-h" style={{ marginBottom: '10px' }}>
            <h2 class="h-md">Da rivedere</h2>
            <span class="b-bold num">
              {review.length} {review.length === 1 ? 'luogo' : 'luoghi'}
            </span>
          </div>
          <div class="rows">
            {review.slice(0, 3).map(({ p, day }) => (
              <div class="prow">
                <span class="thumb" style={{ width: '56px', height: '56px' }}>
                  <img src={sceneFor(categoryIcon(p.category))} alt="" />
                </span>
                <div class="grow">
                  <p class="pt2">{p.name}</p>
                  <p class="pm">{[p.city, day && formatDay(day.date)].filter(Boolean).join(' · ')}</p>
                  <span class="sp vi">
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

      <Link href="/altro/budget" class="row card" style={{ padding: '12px 16px' }}>
        <Ic name="i-sez-budget" size={44} />
        <span class="grow">
          <span class="tt" style={{ display: 'block', fontWeight: 700 }}>
            Spese
          </span>
          <span class="mm num" style={{ whiteSpace: 'nowrap' }}>{formatMoney(spent, trip.baseCurrency)} spesi</span>
        </span>
        {limit && trip.budgetLimit ? (
          <span style={{ textAlign: 'right' }}>
            <span class={`sp ${limit.state === 'over' ? 'bad' : limit.state === 'warn' ? 'warn' : 'ok'}`}>
              <CheckG size={14} sw={3} />
              {limit.state === 'over' ? 'Oltre il budget' : 'Sotto il budget'}
            </span>
            <b class="b-bold num" style={{ display: 'block' }}>
              {formatMoney(Math.abs(round2(trip.budgetLimit - spent)), trip.baseCurrency)}
            </b>
          </span>
        ) : null}
        <span>
          <ChevronRightG />
        </span>
      </Link>

      <div class="cta" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button type="button" class="btn block" onClick={() => void share()}>
          Condividi il riepilogo
        </button>
        <button type="button" class="btn soft block" onClick={() => void save()}>
          Salva tutti i dati del viaggio
        </button>
      </div>
    </main>
  )
}

import { mapsLinkFor } from '../lib/mapsUrl'
const mapsHrefFor = (p: Place) => mapsLinkFor(p)
void doneCount
