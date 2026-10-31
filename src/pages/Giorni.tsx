// Giorni (mock Fa-08, issue #31): riga meteo per città, gruppi per città/viaggio/rientro,
// calendarietti del componente SelettoreGiorni (passato grigio, oggi, futuro, libero).
import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { groupDays, type DayCell } from '../lib/dayGroups'
import { parseYmd } from '../lib/dates'
import { tripToday } from '../lib/today'
import { useTrip } from '../state/trip'
import { nowWeather, tripCities, useCityForecasts } from '../state/cityForecast'
import { Ic } from '../ui/Sprite'
import { PulsanteIcona } from '../faraway/base'
import { cx } from '../faraway/cx'
import { BarraGrande, Schermata } from '../faraway/shell'
import { Wx, wxKind } from '../faraway/Wx'
import { Sv } from '../faraway/icons'
import { AvvisoNotti } from '../faraway/AvvisoNotti'
import { nottiScoperte } from '../lib/stays'
import { Vuoto } from '../faraway/Stati'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace('.', '')
const wk = new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
const mo = new Intl.DateTimeFormat('it-IT', { month: 'short' })
const dm = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

function hourIn(timeZone: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(new Date()))
}

function Calendarietto({ cell, onOpen, scoperta }: { cell: DayCell; onOpen: () => void; scoperta?: boolean }) {
  const d = parseYmd(cell.day.date)
  const w = cap(wk.format(d))
  const m = cap(mo.format(d))
  return (
    <button type="button" className={cx('cl', cell.state !== 'future' && cell.state)} aria-label={`${w} ${d.getDate()} ${m}, ${cell.label}, ${cell.status}${scoperta ? ', notte senza alloggio' : ''}`} onClick={onOpen}>
      <span className="mo">{m}</span>
      {scoperta ? <span style={{ position: 'absolute', top: 6, right: 8, display: 'inline-flex' }} title="Notte senza alloggio"><Sv name="moon" size={16} /></span> : null}
      <i className="rg1" />
      <i className="rg2" />
      <span className="bd">
        <span className="nm">{d.getDate()}</span>
        <span className="wk">{w}</span>
        <span className="c1">{cell.label}</span>
        <span className="c2">
          <Ic name={cell.statusIcon} size={14} />
          {cell.status}
        </span>
      </span>
    </button>
  )
}

export function Giorni() {
  const trip = useTrip()
  const scoperte = new Set(nottiScoperte(trip))
  const [, navigate] = useLocation()
  const today = tripToday(trip)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const cities = useMemo(() => tripCities(trip), [trip])
  const forecasts = useCityForecasts(trip, cities)
  const groups = useMemo(() => groupDays(trip, today), [trip, today])

  const q = query.trim().toLowerCase()
  const shown = q
    ? groups
        .map((g) => ({ ...g, cells: g.cells.filter((c) => [g.title, c.label, c.day.city, c.day.title, ...c.day.items.map((i) => i.title)].join(' ').toLowerCase().includes(q)) }))
        .filter((g) => g.cells.length > 0)
    : groups

  const first = trip.days[0]?.date
  const last = trip.days[trip.days.length - 1]?.date
  const people = trip.travelers.length
  const sub = first && last ? [`${dm.format(parseYmd(first)).replace('.', '')} – ${dm.format(parseYmd(last)).replace('.', '')}`, `${trip.days.length} ${trip.days.length === 1 ? 'giorno' : 'giorni'}`, people > 1 ? `${people} persone` : null].filter(Boolean).join(' · ') : undefined

  const hour = hourIn(trip.timezone)
  // temperatura attuale di ogni città; fuori dal periodo di previsione la riga non compare
  const weather = cities.map((c) => ({ city: c, w: nowWeather(forecasts.get(c), today, hour) })).filter((x) => x.w)

  const open = (cell: DayCell) => navigate(`/giorni/${cell.day.id}${cell.state === 'free' ? '?aggiungi=1' : ''}`)

  return (
    <Schermata
      gap={15}
      bar={
        <BarraGrande
          title={trip.title}
          sub={sub}
          actions={<PulsanteIcona icon={searching ? 'close' : 'search'} label={searching ? 'Chiudi la ricerca' : 'Cerca nei giorni'} expanded={searching} onPress={() => (setSearching(!searching), setQuery(''))} />}
        />
      }
    >
      {searching ? (
        <div className="fa-fld">
          <label htmlFor="cerca-giorni" className="sr-only">
            Cerca nei giorni
          </label>
          <span className="fa-in">
            <Sv name="search" size={20} />
            <input id="cerca-giorni" type="search" autoFocus value={query} onChange={(e) => setQuery(e.currentTarget.value)} placeholder="Città, tappa o titolo" enterKeyHint="search" />
          </span>
        </div>
      ) : null}

      {weather.length > 0 && !q ? (
        <div className="k-Meteo">
          <ul className="chips" role="list" tabIndex={0} aria-label="Meteo delle città, scorri in orizzontale">
            {weather.map(({ city, w }) => (
              <li className="chip" key={city} aria-label={`${city}, ${w!.t} gradi`}>
                <Wx kind={wxKind(w!.code)} size={24} />
                <span>
                  <b>{city}</b> {w!.t}°
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {trip.days.length > 0 ? <AvvisoNotti trip={trip} /> : null}
      {trip.days.length === 0 ? <Vuoto art="calendario" title="Nessun giorno" text="Imposta le date del viaggio da Altro → Modifica viaggio: i giorni si creano da soli." /> : null}
      {trip.days.length > 0 && shown.length === 0 ? <Vuoto art="calendario" title="Nessun giorno trovato" text="Prova con un'altra città o tappa." /> : null}

      {shown.map((g, gi) => (
        <section key={`${gi}-${g.cells[0].day.id}`} style={{ display: 'grid', gap: 12 }} aria-label={g.title}>
          <div className="fa-sech">
            <h2 className="fa-h3">{g.title}</h2>
            <span className="fa-c">{g.meta}</span>
          </div>
          <div className="k-SelettoreGiorni">
            <div className="grid">
              {g.cells.map((c) => (
                <Calendarietto key={c.day.id} cell={c} onOpen={() => open(c)} scoperta={scoperte.has(c.day.date)} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </Schermata>
  )
}
