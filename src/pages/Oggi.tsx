import { useEffect, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { daysBetween, formatDayLong, formatShort } from '../lib/dates'
import { localPerBase, formatRateNumber } from '../lib/fx'
import { minutesOfDay, sunForDay } from '../lib/sun'
import { destinationClock, eventsForDay, formatDiffHours, nextItem, tripToday } from '../lib/today'
import { useForecast } from '../state/forecast'
import { useTrip } from '../state/trip'
import { ItemRow } from '../ui/ItemRow'
import { LightBar } from '../ui/LightBar'
import { Card } from '../ui/PageHeader'
import { WeatherCard } from '../ui/WeatherCard'

/** Data/ora corrente, aggiornata ogni minuto (l'orologio e la prossima tappa restano giusti anche a schermo acceso). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function Oggi() {
  const trip = useTrip()
  const now = useNow()
  const forecast = useForecast(trip)
  const today = tripToday(trip, now) // oggi nel fuso della destinazione
  const toStart = daysBetween(today, trip.startDate)
  const toEnd = daysBetween(today, trip.endDate)
  const total = daysBetween(trip.startDate, trip.endDate) + 1
  const inTrip = toStart <= 0 && toEnd >= 0

  const headline = inTrip
    ? `Giorno ${-toStart + 1} di ${total}`
    : toStart > 0
      ? `Mancano ${toStart} ${toStart === 1 ? 'giorno' : 'giorni'}`
      : 'Viaggio concluso'

  const focus = trip.days.find((d) => d.date >= today) ?? trip.days[0]
  const isToday = focus?.date === today
  const next = focus && isToday ? nextItem(focus, minutesOfDay(now, trip.timezone)) : null
  const events = focus ? eventsForDay(trip, focus.date) : []
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const clock = destinationClock(trip.timezone, deviceTz, now)
  const sun = focus ? sunForDay(focus.date, trip.center.lat, trip.center.lng, trip.timezone) : null

  return (
    <div class="space-y-4 px-4 pt-3">
      <section
        class="rise relative overflow-hidden rounded-card px-5 pb-6 text-white shadow-card"
        style={{
          paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
          background: 'linear-gradient(145deg, var(--accent), var(--secondary))',
        }}
      >
        <p class="text-sm/none opacity-80">{trip.destination}</p>
        <h1 class="font-display mt-3 text-4xl font-semibold leading-none">{trip.title}</h1>
        <p class="mt-3 text-lg font-medium">{headline}</p>
        <p class="text-sm opacity-80">
          {formatShort(trip.startDate)} – {formatShort(trip.endDate)} · {trip.travelers.length} viaggiatori
        </p>
        {clock.diffHours !== 0 && (
          <p class="mt-1 text-sm opacity-80">
            Ora {trip.destination ? `in ${trip.destination}` : 'a destinazione'}: <span class="font-semibold tabular-nums">{clock.time}</span> ({formatDiffHours(clock.diffHours)})
          </p>
        )}
        {/* cerchio decorativo, ispirato al sole del Giappone */}
        <span
          aria-hidden="true"
          class="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15"
        />
      </section>

      {next && (
        <Card class="rise">
          <p class="text-xs font-medium uppercase tracking-wide text-muted">{next.status === 'now' ? 'In corso' : 'Prossima tappa'}</p>
          <p class="font-display mt-1 text-xl font-semibold leading-tight">{next.item.title}</p>
          <p class="text-sm text-muted tabular-nums">
            {next.item.time}
            {next.item.endTime ? `–${next.item.endTime}` : ''}
            {next.item.note ? ` · ${next.item.note}` : ''}
          </p>
        </Card>
      )}

      {events.length > 0 && (
        <Card class="rise">
          <h2 class="font-display mb-1 text-lg font-semibold">Logistica del giorno</h2>
          <ul class="divide-y divide-line">
            {events.map((e) => (
              <li class={`flex min-h-12 items-center gap-3 py-2 ${isToday && e.time && e.at < now.toISOString() ? 'opacity-50' : ''}`}>
                <span class="w-11 shrink-0 text-right text-sm tabular-nums text-muted">{e.time}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium">{e.title}</span>
                  {e.sub && <span class="block truncate text-xs text-muted">{e.sub}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p class="mt-1 text-xs text-muted">Orari nel fuso di ogni luogo.</p>
        </Card>
      )}

      {focus && <WeatherCard forecast={forecast} date={focus.date} today={today} tripDates={trip.days.map((d) => d.date)} />}

      {focus && sun && (
        <Card class="rise">
          <div class="mb-3 flex items-baseline justify-between gap-3">
            <h2 class="font-display text-lg font-semibold first-letter:uppercase">{formatDayLong(focus.date)}</h2>
            <span class="text-xs text-muted">{focus.city}</span>
          </div>
          <LightBar
            sunrise={sun.sunrise}
            sunset={sun.sunset}
            alwaysUp={sun.alwaysUp}
            alwaysDown={sun.alwaysDown}
            nowMin={isToday ? minutesOfDay(now, trip.timezone) : null}
          />
        </Card>
      )}

      {focus && (
        <Card class="rise">
          <h2 class="font-display mb-1 text-lg font-semibold">Programma</h2>
          {focus.items.length > 0 ? (
            <ul class="divide-y divide-line">
              {focus.items.map((item) => (
                <ItemRow item={item} />
              ))}
            </ul>
          ) : (
            <p class="py-3 text-sm text-muted">Giornata ancora libera: aggiungi le tappe dalla scheda Giorni.</p>
          )}
        </Card>
      )}

      {trip.fxRate && trip.localCurrency && trip.localCurrency !== trip.baseCurrency && (
        <Link href="/altro/budget" class="block">
          <Card class="rise flex min-h-14 items-center gap-3">
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-medium uppercase tracking-wide text-muted">Cambio</span>
              <span class="block font-medium">
                1 {trip.baseCurrency} = {formatRateNumber(localPerBase(trip.fxRate))} {trip.localCurrency}
              </span>
            </span>
            <span class="text-sm font-medium text-accent">Calcola</span>
          </Card>
        </Link>
      )}
    </div>
  )
}
