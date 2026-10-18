import { Link } from 'wouter-preact'
import { parseYmd } from '../lib/dates'
import { eventsForDay } from '../lib/today'
import { useTrip } from '../state/trip'
import type { Day, Trip } from '../types'
import { EmptyState, PageHeader } from '../ui/PageHeader'

const wd = new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
const mon = new Intl.DateTimeFormat('it-IT', { month: 'short' })
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace('.', '')

/** Il giorno ha qualcosa da sistemare: un biglietto non acquistato o un alloggio da prenotare. */
function needsAttention(trip: Trip, day: Day): boolean {
  if (eventsForDay(trip, day.date).some((e) => e.flag && !e.flag.ok)) return true
  if (trip.flights.some((f) => !f.paid && f.legs.some((l) => l.departAt.slice(0, 10) === day.date))) return true
  return trip.stays.some((s) => !s.booked && s.checkIn === day.date)
}

/** Foglio di calendario: linguetta colorata con i fori, numero grande, titolo del giorno. */
export function Giorni() {
  const trip = useTrip()

  return (
    <>
      <PageHeader title="Giorni" aside={`${trip.days.length} in tutto`} />
      <div class="px-5">
        {trip.days.length === 0 && (
          <EmptyState title="Nessun giorno" text="Imposta le date del viaggio da Altro → Modifica viaggio: i giorni si creano da soli." />
        )}
        <ul class="grid grid-cols-2 gap-3.5">
          {trip.days.map((day) => {
            const d = parseYmd(day.date)
            const warn = needsAttention(trip, day)
            const label = day.title || day.city
            return (
              <li>
                <Link
                  href={`/giorni/${day.id}`}
                  aria-label={`Apri ${cap(wd.format(d))} ${d.getDate()} ${mon.format(d)}${label ? `, ${label}` : ''}${warn ? ', da sistemare' : ''}`}
                  class="rise block overflow-hidden rounded-2xl border-2 bg-surface text-ink"
                  style={{ borderColor: warn ? 'var(--warn)' : 'var(--line)' }}
                >
                  <div
                    class="relative px-0 pb-1.5 pt-3.5 text-center text-[13px] font-extrabold"
                    style={{ background: warn ? 'var(--warn)' : 'var(--accent)', color: warn ? 'var(--bg)' : '#fff' }}
                  >
                    {cap(wd.format(d))} · {mon.format(d).replace('.', '')}
                    <i class="absolute left-6 top-1 size-2 rounded-full bg-bg" />
                    <i class="absolute right-6 top-1 size-2 rounded-full bg-bg" />
                  </div>
                  <div class="font-display pb-1 pt-2.5 text-center text-[56px] font-extrabold leading-none tracking-[-2px] tabular-nums">{d.getDate()}</div>
                  <div class={`min-h-[42px] px-2 pb-3 text-center text-xs leading-tight ${label ? '' : 'text-muted'}`}>{label || 'Da pianificare'}</div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
