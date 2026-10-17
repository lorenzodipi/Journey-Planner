import { useMemo, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { expenseBase, fxOf } from '../lib/budget'
import { daysBetween, formatDayLong, formatShort } from '../lib/dates'
import { describeLeg } from '../lib/dayRoute'
import { dayBookings, dayChecklist, dayExpenses, dayMovements, dayStays } from '../lib/dayView'
import { formatMoney, round2 } from '../lib/money'
import { mapsLinkFor } from '../lib/mapsUrl'
import { minutesOfDay, sunForDay } from '../lib/sun'
import { tripToday } from '../lib/today'
import { useDayRoute } from '../state/dayRoute'
import { useForecast } from '../state/forecast'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { DayItem, Stay } from '../types'
import { DayMapPanel } from '../ui/DayMapPanel'
import { DaySheet, type DaySheetState } from '../ui/DaySheet'
import { ItemRow } from '../ui/ItemRow'
import { LightBar } from '../ui/LightBar'
import { MovementIcon } from '../ui/MovementIcon'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { MODE_LABEL } from '../ui/TransportForm'
import { WeatherCard } from '../ui/WeatherCard'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Section({ title, aside, children }: { title: string; aside?: string; children: preact.ComponentChildren }) {
  return (
    <Card class="rise">
      <div class="mb-2 flex items-baseline justify-between gap-3">
        <h2 class="font-display text-lg font-semibold">{title}</h2>
        {aside && <span class="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </Card>
  )
}

function StayCard({ stay, label }: { stay: Stay; label: string }) {
  const meals = [stay.breakfast && 'Colazione', stay.dinner && 'Cena', stay.kitchen && 'Cucina'].filter(Boolean).join(' · ')
  return (
    <div class="py-2">
      <p class="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p class="font-medium">{stay.name}</p>
      <p class="text-sm text-muted">
        {[stay.city, stay.checkInInfo && `check-in ${stay.checkInInfo}`, stay.checkOutInfo && `check-out ${stay.checkOutInfo}`].filter(Boolean).join(' · ')}
      </p>
      {meals && <p class="text-sm text-muted">{meals}</p>}
      <p class="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <span class={stay.booked ? 'text-ok' : 'text-warn'}>{stay.booked ? 'Prenotato' : 'Da prenotare'}</span>
        <span class={stay.paid ? 'text-ok' : 'text-warn'}>{stay.paid ? 'Pagato' : 'Da pagare'}</span>
        {(stay.address || stay.mapsUrl) && (
          <a
            href={mapsLinkFor({ mapsUrl: stay.mapsUrl, lat: null, lng: null, name: [stay.name, stay.address, stay.city].filter(Boolean).join(' ') })}
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-accent"
          >
            Apri in Maps
          </a>
        )}
      </p>
    </div>
  )
}

export function Giorno({ params }: { params: { id: string } }) {
  const trip = useTrip()
  const t = useTrips()
  const forecast = useForecast(trip)
  const [sheet, setSheet] = useState<DaySheetState>(null)
  const [reordering, setReordering] = useState(false)

  const index = trip.days.findIndex((d) => d.id === params.id)
  const day = trip.days[index]
  const route = useDayRoute(trip, day ?? { id: '', date: '', city: '', items: [] })

  if (!day) {
    return (
      <div class="px-4 pt-10">
        <EmptyState title="Giorno non trovato" text="Questo giorno non esiste più: torna all'elenco e scegline un altro." />
        <Link href="/giorni" class="mt-4 grid min-h-12 place-items-center rounded-full bg-accent font-semibold text-accent-ink">
          Vai ai giorni
        </Link>
      </div>
    )
  }

  const prev = trip.days[index - 1]
  const next = trip.days[index + 1]
  const today = tripToday(trip)
  const fx = fxOf(trip)
  const movements = dayMovements(trip, day)
  const stays = dayStays(trip.stays, day.date)
  const expenses = dayExpenses(trip, day)
  const bookings = dayBookings(trip, day)
  const todos = dayChecklist(trip.checklist, day)
  const sun = sunForDay(day.date, trip.center.lat, trip.center.lng, trip.timezone)
  const payer = new Map(trip.travelers.map((p) => [p.id, p.name]))
  const total = round2(expenses.reduce((n, e) => n + (expenseBase(e, fx) ?? 0), 0))
  const stopByItem = useMemo(() => new Map(route.stops.map((s) => [s.id, s])), [route.stops])

  const rel = daysBetween(today, day.date)
  const relative = rel === 0 ? 'Oggi' : rel === 1 ? 'Domani' : rel === -1 ? 'Ieri' : null
  const subtitle = [`Giorno ${index + 1} di ${trip.days.length}`, day.city, day.title, relative].filter(Boolean).join(' · ')

  async function move(item: DayItem, step: -1 | 1) {
    const message = await t.moveItem(day.id, item.id, step)
    if (message) showToast(message)
  }
  async function toggleDone(item: DayItem) {
    const message = await t.setItemDone(item.id, !item.done)
    if (message) showToast(message)
  }

  // "arrivo da…" per le tappe con posizione: il tempo dalla tappa numerata precedente
  const hintFor = (item: DayItem): string | undefined => {
    const stop = stopByItem.get(item.id)
    if (!stop || stop.n < 2) return undefined
    const leg = route.legs[stop.n - 2]
    return leg ? `Dalla tappa ${stop.n - 1}: ${describeLeg(leg, route.routes[leg.key])}` : undefined
  }

  return (
    <div class="space-y-4 pb-4">
      <PageHeader title={cap(formatDayLong(day.date))} subtitle={subtitle} back={{ href: '/giorni', label: 'Giorni' }}>
        <div class="mt-2 flex items-center gap-2">
          {prev ? (
            <Link href={`/giorni/${prev.id}`} aria-label={`Giorno precedente, ${formatShort(prev.date)}`} class="grid min-h-11 min-w-11 place-items-center rounded-full border border-line px-3 text-sm font-medium">
              ‹ {formatShort(prev.date)}
            </Link>
          ) : (
            <span class="min-h-11 min-w-11" />
          )}
          {next ? (
            <Link href={`/giorni/${next.id}`} aria-label={`Giorno successivo, ${formatShort(next.date)}`} class="grid min-h-11 min-w-11 place-items-center rounded-full border border-line px-3 text-sm font-medium">
              {formatShort(next.date)} ›
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setSheet({ kind: 'day', day })}
            class="ml-auto min-h-11 rounded-full px-4 text-sm font-medium text-accent"
          >
            Modifica giorno
          </button>
        </div>
      </PageHeader>

      <div class="space-y-4 px-4">
        {day.notes && (
          <Card class="rise">
            <p class="whitespace-pre-line text-sm">{day.notes}</p>
          </Card>
        )}

        <Section title="Mappa">
          <DayMapPanel route={route} center={trip.center} />
        </Section>

        <Section title="Tappe" aside={day.items.length > 0 ? `${day.items.length}` : undefined}>
          {day.items.length > 0 ? (
            <ul class="divide-y divide-line">
              {day.items.map((item, i) => (
                <ItemRow
                  item={item}
                  n={stopByItem.get(item.id)?.n}
                  hint={hintFor(item)}
                  onOpen={reordering ? undefined : () => setSheet({ kind: 'edit-item', day, item })}
                  onToggleDone={reordering ? undefined : () => void toggleDone(item)}
                  reorder={
                    reordering
                      ? {
                          onUp: i > 0 ? () => void move(item, -1) : undefined,
                          onDown: i < day.items.length - 1 ? () => void move(item, 1) : undefined,
                        }
                      : undefined
                  }
                />
              ))}
            </ul>
          ) : (
            <p class="py-2 text-sm text-muted">Giornata ancora libera: aggiungi le tappe da qui sotto.</p>
          )}
          <div class="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
            <button type="button" onClick={() => setSheet({ kind: 'new-item', day })} class="min-h-11 rounded-full px-3 text-sm font-medium text-accent">
              + Tappa
            </button>
            {day.items.length > 1 && (
              <button
                type="button"
                aria-pressed={reordering}
                onClick={() => setReordering(!reordering)}
                class="min-h-11 rounded-full px-3 text-sm font-medium text-muted"
              >
                {reordering ? 'Fine' : 'Riordina'}
              </button>
            )}
          </div>
        </Section>

        <Section title="Spostamenti">
          {movements.length > 0 ? (
            <ul class="divide-y divide-line">
              {movements.map((e) => (
                <li class="flex min-h-14 items-center gap-3 py-2">
                  <span class="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <MovementIcon event={e} />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-medium">{e.title}</span>
                    {e.time && (
                      <span class="block text-sm tabular-nums">
                        {e.time}
                        {e.endTime && ` → ${e.endTime}`}
                      </span>
                    )}
                    <span class="block truncate text-xs text-muted">
                      {[e.mode && MODE_LABEL[e.mode], e.sub].filter(Boolean).join(' · ')}
                    </span>
                    {e.flag && <span class={`block text-xs ${e.flag.ok ? 'text-ok' : 'text-warn'}`}>{e.flag.text}</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p class="py-2 text-sm text-muted">Nessun volo, treno o spostamento in programma per questo giorno.</p>
          )}
          {movements.length > 0 && <p class="mt-1 text-xs text-muted">Voli, treni e check-in/out. Orari nel fuso di ogni luogo.</p>}
          <Link href="/altro/trasporti" class="mt-1 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-accent">
            Gestisci i trasporti
          </Link>
        </Section>

        <Section title="Alloggio">
          {stays.night || stays.checkIn.length > 0 || stays.checkOut.length > 0 ? (
            <div class="divide-y divide-line">
              {stays.checkOut.map((s) => <StayCard stay={s} label="Check-out oggi" />)}
              {stays.checkIn.filter((s) => s.id !== stays.night?.id).map((s) => <StayCard stay={s} label="Check-in oggi" />)}
              {stays.night && (
                <StayCard stay={stays.night} label={stays.night.checkIn === day.date ? 'Check-in oggi · dormi qui' : 'Dormi qui'} />
              )}
            </div>
          ) : (
            <p class="py-2 text-sm text-muted">Nessun alloggio per questa notte.</p>
          )}
          <Link href="/altro/alloggi" class="mt-1 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-accent">
            Gestisci gli alloggi
          </Link>
        </Section>

        <WeatherCard forecast={forecast} date={day.date} today={today} tripDates={trip.days.map((d) => d.date)} />

        {sun && (
          <Section title="Luce" aside={day.city}>
            <LightBar
              sunrise={sun.sunrise}
              sunset={sun.sunset}
              alwaysUp={sun.alwaysUp}
              alwaysDown={sun.alwaysDown}
                nowMin={day.date === today ? minutesOfDay(new Date(), trip.timezone) : null}
            />
          </Section>
        )}

        <Section title="Spese del giorno" aside={expenses.length > 0 ? formatMoney(total, trip.baseCurrency) : undefined}>
          {expenses.length > 0 ? (
            <ul class="divide-y divide-line">
              {expenses.map((e) => {
                const inBase = expenseBase(e, fx)
                return (
                  <li class="flex min-h-12 items-center gap-3 py-2">
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-medium">{e.label}</span>
                      <span class="block truncate text-xs text-muted">
                        {[e.category, e.paidBy && payer.get(e.paidBy) && `pagato da ${payer.get(e.paidBy)}`].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span class="shrink-0 text-right">
                      <span class="block font-semibold">{formatMoney(e.amount, e.currency)}</span>
                      {e.currency !== trip.baseCurrency && inBase !== null && (
                        <span class="block text-xs text-muted">≈ {formatMoney(inBase, trip.baseCurrency)}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p class="py-2 text-sm text-muted">Nessuna spesa registrata per questo giorno.</p>
          )}
          <Link href="/altro/spese" class="mt-1 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-accent">
            Vai alle spese
          </Link>
        </Section>

        {(bookings.length > 0 || todos.length > 0) && (
          <Section title="Prenotazioni e da fare">
            {bookings.length > 0 && (
              <ul class="divide-y divide-line" aria-label="Prenotazioni valide oggi">
                {bookings.map((b) => (
                  <li class="py-2">
                    <Link href="/altro/prenotazioni" class="block">
                      <span class="block truncate font-medium">{b.title}</span>
                      <span class="block truncate text-xs text-muted">{b.code ? `Codice ${b.code}` : 'Prenotazione'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {todos.length > 0 && (
              <ul class={`divide-y divide-line ${bookings.length > 0 ? 'mt-2 border-t border-line' : ''}`} aria-label="Da fare oggi">
                {todos.map((c) => (
                  <li class={`py-2 text-sm ${c.done ? 'text-muted line-through' : ''}`}>{c.text}</li>
                ))}
              </ul>
            )}
          </Section>
        )}
      </div>

      <DaySheet trip={trip} state={sheet} onClose={() => setSheet(null)} />
    </div>
  )
}
