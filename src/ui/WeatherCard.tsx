import { useEffect, useRef } from 'react'
import { gradi } from '../lib/formati'
import { daysBetween, formatShort } from '../lib/dates'
import type { DaySun } from '../lib/sun'
import { FORECAST_DAYS, forecastAvailableFrom, inForecastRange, rainWindow, weatherLabel, weatherSymbol, windFrom, type HourWeather } from '../lib/weather'
import type { ForecastState } from '../state/forecast'
import { Ic } from './Sprite'

interface Props {
  forecast: ForecastState
  /** giorno in primo piano (YYYY-MM-DD) */
  date: string
  /** oggi nel fuso della destinazione */
  today: string
  /** città mostrata accanto all'orario di aggiornamento */
  city: string
  /** alba e tramonto del giorno, mostrati nella striscia oraria */
  sun: DaySun | null
  /** minuti dalla mezzanotte locale adesso (solo se il giorno è oggi): evidenzia «Ora» */
  nowMin: number | null
}

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
/** Altezza della colonna della temperatura (stessa scala del mock: 5° = 14 px, 12° = 43 px). */
const colHeight = (t: number) => Math.round(Math.max(8, Math.min(48, 14 + (t - 5) * 4.14)))

type Cell = { min: number; hour: HourWeather; now: boolean } | { min: number; event: 'sunrise' | 'sunset' }

function cellsFor(hours: HourWeather[], sun: DaySun | null, nowHour: number | null): Cell[] {
  const cells: Cell[] = hours.filter((h) => h.h >= 0 && h.h <= 23).map((hour) => ({ min: hour.h * 60, hour, now: hour.h === nowHour }))
  const add = (min: number | null | undefined, event: 'sunrise' | 'sunset') => {
    if (min != null && min >= 0 && min < 24 * 60) cells.push({ min, event })
  }
  add(sun?.sunrise, 'sunrise')
  add(sun?.sunset, 'sunset')
  // a parità di minuti l'ora viene prima dell'evento
  return cells.sort((a, b) => a.min - b.min || ('hour' in a ? -1 : 1))
}

/** Meteo del giorno (Design System v3): sintesi, striscia ora per ora scorrevole e dettagli. */
export function WeatherCard({ forecast, date, today, city, sun, nowMin }: Props) {
  const day = forecast.days.find((d) => d.date === date)
  const slider = useRef<HTMLDivElement>(null)
  const hasSlider = Boolean(day?.hours?.length)

  // la striscia parte da «Ora» (se il giorno è oggi)
  useEffect(() => {
    const el = slider.current
    if (!el) return
    const now = el.querySelector<HTMLElement>('.wc.now')
    el.scrollLeft = now ? Math.max(0, now.offsetLeft - 12) : 0
  }, [date, hasSlider])

  if (!day) {
    let text: string
    if (forecast.loading) text = 'Carico le previsioni…'
    else if (!inForecastRange(today, date) && daysBetween(today, date) >= FORECAST_DAYS)
      text = `Le previsioni per questo giorno saranno disponibili dal ${formatShort(forecastAvailableFrom(date))}.`
    else if (forecast.error) text = `${forecast.error} Riprova più tardi.`
    else text = 'Previsioni non disponibili per questo giorno.'
    return (
      <section className="card" aria-label="Meteo del giorno">
        <h2 className="b-bold">Meteo</h2>
        <p className="b-sm muted" style={{ marginTop: '4px' }}>
          {text}
        </p>
      </section>
    )
  }

  const hours = day.hours ?? []
  const nowHour = nowMin != null ? Math.floor(nowMin / 60) : null
  const current = nowHour != null ? hours.find((h) => h.h === nowHour) : undefined
  // per un altro giorno si guarda il primo pomeriggio
  const ref = current ?? hours.find((h) => h.h === 14) ?? hours[Math.floor(hours.length / 2)]
  const code = current?.code ?? day.code
  const w = weatherLabel(code)
  const rain = rainWindow(hours, nowHour ?? 0)
  const headline = `${w.label}${rain ? `, pioggia dalle ${rain.from}` : ''}`
  const big = current?.t ?? day.max
  const wettest = hours.reduce<HourWeather | null>((m, h) => ((h.rain ?? -1) > (m?.rain ?? -1) ? h : m), null)
  const cells = hasSlider ? cellsFor(hours, sun, nowHour) : []

  return (
    <section className="card" aria-label="Meteo del giorno">
      <div className="tr">
        <div>
          <p style={{ font: '500 40px/44px var(--font-display)', letterSpacing: '-.02em' }} className="num">
            {gradi(big)}
          </p>
          <p className="b-bold">{headline}</p>
          <p className="b-sm muted num">
            Minima {gradi(day.min)} · massima {gradi(day.max)}
          </p>
        </div>
        <Ic name={weatherSymbol(code)} size={56} />
      </div>

      {cells.length > 0 && (
        <>
          <div className="sec-h" style={{ margin: '16px 0 0' }}>
            <h2 className="b-bold">Ora per ora</h2>
            <span className="cap muted">
              {city}
              {forecast.savedAt ? ` · aggiornato alle ${hhmm(forecast.savedAt)}` : ''}
            </span>
          </div>
          <div className="wsl" ref={slider} role="group" aria-label="Meteo ora per ora, scorri in orizzontale" tabIndex={0}>
            {cells.map((c) =>
              'event' in c ? (
                <div className="wc ev" key={c.event}>
                  <span className="tm">{clock(c.min)}</span>
                  <Ic name={c.event === 'sunrise' ? 'i-nav-sunrise' : 'i-nav-sunset'} size={28} />
                  <span className="tp">{c.event === 'sunrise' ? 'Alba' : 'Tramonto'}</span>
                </div>
              ) : (
                <div className={`wc${c.now ? ' now' : ''}`} key={c.hour.h}>
                  <span className="tm">{c.now ? 'Ora' : clock(c.min)}</span>
                  <Ic name={weatherSymbol(c.hour.code)} size={28} />
                  <b className="tp">{gradi(c.hour.t)}</b>
                  <span className="col">
                    <i style={{ height: `${colHeight(c.hour.t)}px` }} />
                  </span>
                  <span className={`pr${(c.hour.rain ?? 0) >= 60 ? ' hi' : ''}`}>{c.hour.rain ?? 0}%</span>
                </div>
              ),
            )}
          </div>
        </>
      )}

      {ref && (
        <div className="wdet">
          {ref.feels != null && (
            <div>
              <p className="cap muted">Percepita</p>
              <p className="b-bold num">{gradi(ref.feels)}</p>
            </div>
          )}
          {ref.wind != null && (
            <div>
              <p className="cap muted">Vento</p>
              <p className="b-bold num">
                {ref.wind} km/h{ref.windDir != null ? ` da ${windFrom(ref.windDir)}` : ''}
              </p>
            </div>
          )}
          {ref.hum != null && (
            <div>
              <p className="cap muted">Umidità</p>
              <p className="b-bold num">{ref.hum}%</p>
            </div>
          )}
          {wettest?.rain != null && (
            <div>
              <p className="cap muted">Pioggia, al massimo</p>
              <p className="b-bold num">
                {wettest.rain}% alle {clock(wettest.h * 60)}
              </p>
            </div>
          )}
        </div>
      )}
      {!ref && day.rainPct != null && <p className="b-sm muted num">Probabilità di pioggia {day.rainPct}%</p>}
    </section>
  )
}

