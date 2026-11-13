// Giorni (mock Fa-08, issue #31): riga meteo per città, gruppi per città/viaggio/rientro,
// calendarietti del componente SelettoreGiorni (passato grigio, oggi, futuro, libero).
import { paesiDi, paeseDelGiorno } from '../lib/paesi'
import { gradi } from '../lib/formati'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { groupDays, type DayCell } from '../lib/dayGroups'
import { parseYmd } from '../lib/dates'
import { tripToday } from '../lib/today'
import { useTrip } from '../state/trip'
import { nowWeather, tripCities, useCityForecastsStato } from '../state/cityForecast'
import { Ic } from '../ui/Sprite'
import { PulsanteIcona, useFocoIniziale } from '../faraway/base'
import { soloLettura } from '../lib/ruolo'
import { cx } from '../faraway/cx'
import { BarraGrande, Schermata } from '../faraway/shell'
import { useSottoIlBanner, useVistaAccanto } from '../faraway/mappaAccanto'
import { DettaglioGiorno } from './Giorno'
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

function Calendarietto({ cell, onOpen, scoperta, scelto }: { cell: DayCell; onOpen: () => void; scoperta?: boolean; scelto?: boolean }) {
  const d = parseYmd(cell.day.date)
  const w = cap(wk.format(d))
  const m = cap(mo.format(d))
  return (
    <button type="button" className={cx('cl', cell.state !== 'future' && cell.state, scelto && 'sel')} aria-current={scelto ? 'true' : undefined} data-giorno={cell.day.id} aria-label={`${w} ${d.getDate()} ${m}, ${cell.label}, ${cell.status}${scoperta ? ', notte senza alloggio' : ''}`} onClick={onOpen}>
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
  // finestra espansa (pieghevole in orizzontale, computer): il dettaglio di un giorno accanto all'elenco
  const accanto = useVistaAccanto()
  if (accanto && trip.days.length > 0) return <GiorniAccanto />
  return <ElencoGiorni />
}

/** Il giorno mostrato a destra quando nessuno è stato scelto: oggi durante il viaggio, altrimenti il primo giorno. */
export function giornoIniziale(days: { id: string; date: string }[], today: string): string | undefined {
  return (days.find((d) => d.date === today) ?? days[0])?.id
}

/** Giorni a sinistra, larghi come un telefono, e il giorno scelto a destra. Il giorno scelto è nell'indirizzo (/giorni/:id),
 *  così «Indietro» e i link funzionano come sul telefono; toccando un altro giorno l'indirizzo si sostituisce. */
export function GiorniAccanto({ scelto }: { scelto?: string }) {
  const trip = useTrip()
  const id = scelto ?? giornoIniziale(trip.days, tripToday(trip)) ?? ''
  return <ElencoGiorni scelto={id} />
}

function PannelloGiorno({ id }: { id: string }) {
  const box = useRef<HTMLElement>(null)
  useSottoIlBanner(box)
  // un altro giorno riparte dall'inizio
  useEffect(() => {
    box.current?.scrollTo({ top: 0 })
  }, [id])
  return (
    <aside ref={box} className="fa-gpanel" aria-label="Giorno scelto">
      <DettaglioGiorno key={id} id={id} incastrato />
    </aside>
  )
}

function ElencoGiorni({ scelto }: { scelto?: string }) {
  const trip = useTrip()
  const accanto = scelto !== undefined
  const scoperte = new Set(nottiScoperte(trip))
  const [, navigate] = useLocation()
  const today = tripToday(trip)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const focoRicerca = useFocoIniziale<HTMLInputElement>(searching)
  const cities = useMemo(() => tripCities(trip), [trip])
  const { map: forecasts, inAttesa } = useCityForecastsStato(trip, cities)
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

  const open = (cell: DayCell) => navigate(`/giorni/${cell.day.id}${cell.state === 'free' ? '?aggiungi=1' : ''}`, accanto ? { replace: true } : undefined)

  // con il dettaglio accanto: il giorno scelto (anche da «giorno successivo» a destra) resta in vista nell'elenco
  useEffect(() => {
    if (!scelto) return
    document.querySelector<HTMLElement>(`[data-giorno="${CSS.escape(scelto)}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [scelto])

  return (
    <Schermata
      gap={16}
      className={accanto ? 'fa-lmappa fa-gaccanto' : undefined}
      overlay={accanto && scelto ? <PannelloGiorno id={scelto} /> : undefined}
      fisso
      fissa={
        searching ? (
          <div className="fa-fld">
            <label htmlFor="cerca-giorni" className="sr-only">
              Cerca nei giorni
            </label>
            <span className="fa-in">
              <Sv name="search" size={20} />
              <input ref={focoRicerca} id="cerca-giorni" type="search" value={query} onChange={(e) => setQuery(e.currentTarget.value)} placeholder="Città, tappa o titolo" enterKeyHint="search" />
            </span>
          </div>
        ) : null
      }
      bar={
        <BarraGrande
          title={trip.title}
          sub={sub}
          actions={<PulsanteIcona icon={searching ? 'close' : 'search'} label={searching ? 'Chiudi la ricerca' : 'Cerca nei giorni'} expanded={searching} onPress={() => (setSearching(!searching), setQuery(''))} />}
        />
      }
    >

      {weather.length === 0 && inAttesa.size > 0 && !q ? (
        <div className="k-Meteo" role="status" aria-busy="true" aria-label="Meteo delle città in caricamento">
          <ul className="chips sk" role="presentation" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="chip">
                <span className="fa-sk" style={{ height: 44, width: i === 0 ? 120 : 136 }} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {weather.length > 0 && !q ? (
        <div className="k-Meteo">
          <ul className="chips" role="list" tabIndex={0} aria-label="Meteo delle città, scorri in orizzontale">
            {weather.map(({ city, w }) => (
              <li className="chip" key={city} aria-label={`${city}, ${w!.t} gradi`}>
                <Wx kind={wxKind(w!.code)} size={24} />
                <span>
                  <b>{city}</b> {gradi(w!.t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {trip.days.length > 0 && !soloLettura(trip) ? <AvvisoNotti trip={trip} /> : null}
      {trip.days.length === 0 ? <Vuoto art="calendario" title="Nessun giorno" text="Imposta le date del viaggio da Altro → Modifica viaggio: i giorni si creano da soli." /> : null}
      {trip.days.length > 0 && shown.length === 0 ? <Vuoto art="calendario" title="Nessun giorno trovato" text="Prova con un'altra città o tappa." /> : null}

      {/* pieghevole aperto: le città una dopo l'altra, che vanno a capo come un testo (sul telefono il contenitore non esiste) */}
      <div className="fa-flusso">
        {shown.map((g, gi) => (
          <section key={`${gi}-${g.cells[0].day.id}`} className="fa-gsez" style={{ '--n': g.cells.length } as React.CSSProperties} aria-label={g.title}>
            <div className="fa-sech">
              <h2 className="fa-h3">{g.title}</h2>
              <span className="fa-c">{paesiDi(trip).length > 1 ? `${paeseDelGiorno(trip, g.cells[0].day.date).name} · ${g.meta}` : g.meta}</span>
            </div>
            <div className="k-SelettoreGiorni">
              <div className="grid">
                {g.cells.map((c) => (
                  <Calendarietto key={c.day.id} cell={c} onOpen={() => open(c)} scoperta={scoperte.has(c.day.date)} scelto={accanto && c.day.id === scelto} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </Schermata>
  )
}
