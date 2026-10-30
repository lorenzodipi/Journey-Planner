import { useMemo, useState } from 'react'
import '../fw-giorni.css'
import { Link } from 'wouter'
import { parseYmd } from '../lib/dates'
import { formatDuration, totalDuration } from '../lib/duration'
import { mapsLinkFor } from '../lib/mapsUrl'
import { eventsForDay, tripToday } from '../lib/today'
import { useTrip } from '../state/trip'
import type { Day, Trip } from '../types'
import { ART } from '../ui/art'
import { CloseG, SearchG } from '../ui/glyphs'
import { MapsPill } from '../ui/MapsPill'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { Ic } from '../ui/Sprite'

const wd = new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
const mon = new Intl.DateTimeFormat('it-IT', { month: 'short' })
const dm = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })
const wdm = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const clean = (s: string) => s.replace('.', '')

type Filter = 'all' | 'planned' | 'free'

/** Il giorno ha qualcosa da sistemare: un biglietto non acquistato o un alloggio da prenotare. */
function needsAttention(trip: Trip, day: Day): boolean {
  if (eventsForDay(trip, day.date).some((e) => e.flag && !e.flag.ok)) return true
  if (trip.flights.some((f) => !f.paid && f.legs.some((l) => l.departAt.slice(0, 10) === day.date))) return true
  return trip.stays.some((s) => !s.booked && s.checkIn === day.date)
}

interface Entry {
  day: Day
  title: string
  meta: string
  planned: boolean
  warn: boolean
  today: boolean
}

function describe(trip: Trip, day: Day, today: string): Entry {
  const events = eventsForDay(trip, day.date)
  const n = day.items.length
  const done = day.items.filter((i) => i.done).length
  const firstItem = day.items.find((i) => i.time) ?? day.items[0]
  const planned = n > 0 || events.some((e) => e.kind !== 'stay') || Boolean(day.title)
  const title = day.title || firstItem?.title || events.find((e) => e.kind !== 'stay')?.title || ''
  let meta = ''
  if (n > 0) {
    const mins = totalDuration(day.items, trip.places)
    const parts = [`${n} ${n === 1 ? 'tappa' : 'tappe'}`]
    if (done > 0) parts.push(`${done} ${done === 1 ? 'fatta' : 'fatte'}`)
    else if (mins > 0) parts.push(formatDuration(mins))
    meta = parts.join(' · ')
  } else if (events.length > 0) {
    const e = events.find((x) => x.kind !== 'stay') ?? events[0]
    meta = [e.sub, e.time].filter(Boolean).join(' · ')
  }
  return { day, title, meta, planned, warn: needsAttention(trip, day), today: day.date === today }
}

/** Giorni consecutivi nella stessa città, uno sotto l'altro come nel calendario del mock. */
function groupByCity(entries: Entry[]): { city: string; entries: Entry[] }[] {
  const out: { city: string; entries: Entry[] }[] = []
  for (const e of entries) {
    const last = out[out.length - 1]
    if (last && last.city === (e.day.city || '')) last.entries.push(e)
    else out.push({ city: e.day.city || '', entries: [e] })
  }
  return out
}

function rangeLabel(first: string, last: string, count: number): string {
  const a = parseYmd(first)
  const b = parseYmd(last)
  const days = `${count} ${count === 1 ? 'giorno' : 'giorni'}`
  if (count === 1) return `${clean(wdm.format(a))} · ${days}`
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${clean(dm.format(b))} · ${days}`
  return `${clean(dm.format(a))} – ${clean(dm.format(b))} · ${days}`
}

const CITY_ICONS = ['district', 'nature', 'temple', 'castle', 'night', 'food'] as const

export function Giorni() {
  const trip = useTrip()
  const today = tripToday(trip)
  const [filter, setFilter] = useState<Filter>('all')
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  const entries = useMemo(() => trip.days.map((d) => describe(trip, d, today)), [trip, today])
  const planned = entries.filter((e) => e.planned).length
  const q = query.trim().toLowerCase()
  const shown = entries.filter((e) => {
    if (filter === 'planned' && !e.planned) return false
    if (filter === 'free' && e.planned) return false
    if (!q) return true
    const hay = [e.day.city, e.title, e.day.title, ...e.day.items.map((i) => i.title)].join(' ').toLowerCase()
    return hay.includes(q)
  })
  const groups = groupByCity(shown)
  const subtitle = trip.days.length > 0 ? `${clean(dm.format(parseYmd(trip.days[0].date)))} – ${clean(dm.format(parseYmd(trip.days[trip.days.length - 1].date)))} · ${trip.days.length} ${trip.days.length === 1 ? 'giorno' : 'giorni'}` : undefined

  return (
    <main className="screen">
      <PageHeader
        title="Giorni"
        subtitle={subtitle}
        actions={
          <button type="button" className="rbtn" aria-label={searching ? 'Chiudi la ricerca' : 'Cerca nei giorni'} aria-expanded={searching} onClick={() => (setSearching(!searching), setQuery(''))}>
            {searching ? <CloseG /> : <SearchG />}
          </button>
        }
      />

      {searching && (
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '52px' }}>
          <SearchG />
          <input
            type="search"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Città, tappa o titolo"
            aria-label="Cerca nei giorni"
            style={{ flex: 1, minWidth: 0, height: '48px', border: 0, background: 'transparent', color: 'var(--ink)', font: '500 16px/24px var(--font-sans)', outline: 'none' }}
          />
        </div>
      )}

      {trip.days.length > 0 && (
        <div className="chips" role="group" aria-label="Filtra i giorni">
          <button type="button" className={`chip${filter === 'all' ? ' on' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            Tutti <span className="n">{entries.length}</span>
          </button>
          <button type="button" className={`chip${filter === 'planned' ? ' on' : ''}`} aria-pressed={filter === 'planned'} onClick={() => setFilter('planned')}>
            Pianificati <span className="n">{planned}</span>
          </button>
          <button type="button" className={`chip${filter === 'free' ? ' on' : ''}`} aria-pressed={filter === 'free'} onClick={() => setFilter('free')}>
            Da pianificare <span className="n">{entries.length - planned}</span>
          </button>
        </div>
      )}

      {trip.days.length === 0 && (
        <EmptyState art={ART.calendario} title="Nessun giorno" text="Imposta le date del viaggio da Altro → Modifica viaggio: i giorni si creano da soli." />
      )}
      {trip.days.length > 0 && shown.length === 0 && <EmptyState art={ART.calendario} title="Nessun giorno trovato" text="Prova con un altro filtro o un'altra ricerca." />}

      {groups.map((g, gi) => {
        const first = g.entries[0].day
        const last = g.entries[g.entries.length - 1].day
        const onlyTravel = g.entries.every((e) => e.day.items.length === 0 && eventsForDay(trip, e.day.date).some((x) => x.kind === 'flight'))
        const icon = onlyTravel ? 'airport' : CITY_ICONS[gi % CITY_ICONS.length]
        const label = g.city || 'Da definire'
        return (
          <section aria-label={label} key={`${gi}-${first.id}`}>
            <div className="cityh" style={{ marginBottom: '8px' }}>
              <Ic name={`i-cat-${icon}`} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 className="h-sm">{label}</h2>
                <p className="b-sm muted">{rangeLabel(first.date, last.date, g.entries.length)}</p>
              </div>
              {g.city && <MapsPill kind="sm" href={mapsLinkFor({ lat: null, lng: null, name: g.city, city: trip.destination })} label={g.city} />}
            </div>
            <div className="calg">
              {g.entries.map((e) => {
                const d = parseYmd(e.day.date)
                const free = e.title === '' && e.meta === ''
                const title = free ? 'Giorno libero' : e.title
                const meta = free ? 'Da pianificare' : e.meta
                return (
                  <Link
                    key={e.day.id}
                    href={`/giorni/${e.day.id}`}
                    className={`cal${e.today ? ' today' : ''}${free ? ' empty' : ''}`}
                    aria-label={`${clean(wd.format(d))} ${d.getDate()} ${clean(mon.format(d))}: ${title}${e.warn ? ', da sistemare' : ''}`}
                  >
                    <span className="ch">
                      <b>{clean(wd.format(d))}</b>
                      <span>{e.today ? 'Oggi' : clean(mon.format(d))}</span>
                    </span>
                    <span className="cbd">
                      <b className="cn num">{d.getDate()}</b>
                      <span className="ctt">{title}</span>
                      <span className="cm">{meta}</span>
                      {e.warn && (
                        <span className="sp warn" style={{ marginTop: '6px' }}>
                          Da sistemare
                        </span>
                      )}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}
