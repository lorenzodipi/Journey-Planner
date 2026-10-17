import { daysBetween, formatDay, formatShort } from '../lib/dates'
import { FORECAST_DAYS, forecastAvailableFrom, inForecastRange, weatherLabel, type DayWeather } from '../lib/weather'
import type { ForecastState } from '../state/forecast'
import { Card } from './PageHeader'

interface Props {
  forecast: ForecastState
  /** giorno in primo piano (YYYY-MM-DD) */
  date: string
  /** oggi nel fuso della destinazione */
  today: string
  /** giorni del viaggio, per la striscia dei prossimi giorni */
  tripDates: string[]
}

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

export function WeatherCard({ forecast, date, today, tripDates }: Props) {
  const byDate = new Map(forecast.days.map((d) => [d.date, d]))
  const day = byDate.get(date)
  const strip = tripDates.filter((d) => d > date && byDate.has(d)).slice(0, 4)

  let body
  if (day) body = <Main day={day} />
  else if (forecast.loading) body = <p class="text-sm text-muted">Carico le previsioni…</p>
  else if (!inForecastRange(today, date) && daysBetween(today, date) >= FORECAST_DAYS)
    body = <p class="text-sm text-muted">Le previsioni per questo giorno saranno disponibili dal {formatShort(forecastAvailableFrom(date))}.</p>
  else if (forecast.error) body = <p class="text-sm text-muted">{forecast.error} Riprova più tardi.</p>
  else body = <p class="text-sm text-muted">Previsioni non disponibili per questo giorno.</p>

  return (
    <Card class="rise">
      <div class="mb-2 flex items-baseline justify-between gap-3">
        <h2 class="font-display text-lg font-semibold">Meteo</h2>
        {forecast.savedAt && <span class="text-xs text-muted">aggiornato alle {hhmm(forecast.savedAt)}</span>}
      </div>
      {body}
      {strip.length > 0 && (
        <ul class="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-3" aria-label="Prossimi giorni">
          {strip.map((d) => {
            const w = byDate.get(d) as DayWeather
            return (
              <li class="text-center text-xs">
                <p class="text-muted">{formatDay(d).split(' ')[0]}</p>
                <p class="text-xl" aria-label={weatherLabel(w.code).label}>{weatherLabel(w.code).icon}</p>
                <p class="font-medium tabular-nums">{w.max}°</p>
                <p class="tabular-nums text-muted">{w.min}°</p>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function Main({ day }: { day: DayWeather }) {
  const w = weatherLabel(day.code)
  return (
    <div class="flex items-center gap-4">
      <span class="text-5xl leading-none" aria-hidden="true">{w.icon}</span>
      <div class="min-w-0 flex-1">
        <p class="font-medium">{w.label}</p>
        <p class="text-sm text-muted">
          Max <span class="font-medium text-ink tabular-nums">{day.max}°</span> · min <span class="tabular-nums">{day.min}°</span>
          {day.rainPct != null && ` · pioggia ${day.rainPct}%`}
        </p>
      </div>
    </div>
  )
}
