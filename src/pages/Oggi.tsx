import { daysBetween, formatDayLong, formatShort, todayYmd } from '../lib/dates'
import { formatMinutes, sunForDay } from '../lib/sun'
import { useTrip } from '../state/trip'
import { ItemRow } from '../ui/ItemRow'
import { LightBar } from '../ui/LightBar'
import { Card } from '../ui/PageHeader'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function Oggi() {
  const trip = useTrip()
  const today = todayYmd()
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
  const sun = focus ? sunForDay(focus.date, trip.center.lat, trip.center.lng, trip.timezone) : null
  const segments = (focus?.items ?? [])
    .filter((i) => i.time)
    .map((i) => ({ from: toMinutes(i.time as string), to: toMinutes(i.time as string) + 45 }))

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
        {/* cerchio decorativo, ispirato al sole del Giappone */}
        <span
          aria-hidden="true"
          class="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15"
        />
      </section>

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
            segments={segments}
          />
          <p class="mt-2 text-xs text-muted">
            {sun.sunrise != null && sun.sunset != null
              ? `Alba ${formatMinutes(sun.sunrise)} · Tramonto ${formatMinutes(sun.sunset)} (ora locale)`
              : 'Alba e tramonto non disponibili per questo giorno'}
          </p>
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
    </div>
  )
}
