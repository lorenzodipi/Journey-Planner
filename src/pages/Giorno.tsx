import { useMemo, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { expenseBase, fxOf } from '../lib/budget'
import { canSwap } from '../lib/itemOrder'
import { daysBetween, formatDayLong, formatShort } from '../lib/dates'
import { describeLeg } from '../lib/dayRoute'
import { dayBookings, dayChecklist, dayExpenses, dayMovements, dayStays } from '../lib/dayView'
import { formatMoney, round2 } from '../lib/money'
import { mapsLinkFor } from '../lib/mapsUrl'
import { minutesOfDay, sunForDay } from '../lib/sun'
import { tripToday } from '../lib/today'
import { useDayRoute } from '../state/dayRoute'
import { showToast } from '../state/toast'
import { useForecast } from '../state/forecast'
import { useTrip, useTrips } from '../state/trip'
import type { DayItem, Stay } from '../types'
import { DayMapPanel } from '../ui/DayMapPanel'
import { DaySheet, type DaySheetState } from '../ui/DaySheet'
import { TrashButton } from '../ui/ConfirmDialog'
import { ItemRow } from '../ui/ItemRow'
import { LightCard } from '../ui/LightBar'
import { MovementIcon } from '../ui/MovementIcon'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { useDeleter } from '../ui/useDeleter'
import { useItemActions } from '../ui/useItemActions'
import { MODE_LABEL } from '../ui/TransportForm'
import { TickIcon } from '../ui/Icons'
import { Tag } from '../ui/Ticket'
import { WeatherCard } from '../ui/WeatherCard'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Section({ title, aside, children }: { title: string; aside?: string; children: preact.ComponentChildren }) {
  return (
    <Card class="rise">
      <div class="mb-2 flex items-baseline justify-between gap-3">
        <h2 class="font-display text-lg font-extrabold">{title}</h2>
        {aside && <span class="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </Card>
  )
}

function StayCard({ stay, label, onEdit }: { stay: Stay; label: string; onEdit: () => void }) {
  const meals = [stay.breakfast && 'Colazione', stay.dinner && 'Cena', stay.kitchen && 'Cucina'].filter(Boolean).join(' · ')
  return (
    <div class="py-2">
      <div class="flex items-center justify-between gap-2">
        <p class="text-[13px] text-muted">{label}</p>
        <button type="button" onClick={onEdit} aria-label={`Modifica ${stay.name}`} class="min-h-11 px-3 text-sm font-extrabold text-pale">
          Modifica
        </button>
      </div>
      <p class="text-[17px] font-extrabold">{stay.name}</p>
      <p class="text-sm text-muted">
        {[stay.city, stay.checkInInfo && `check-in ${stay.checkInInfo}`, stay.checkOutInfo && `check-out ${stay.checkOutInfo}`].filter(Boolean).join(' · ')}
      </p>
      {meals && <p class="text-sm text-muted">{meals}</p>}
      <p class="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <Tag tone={stay.booked ? 'ok' : 'warn'}>{stay.booked ? 'Prenotato' : 'Non prenotato'}</Tag>
        <Tag tone={stay.paid ? 'ok' : 'warn'}>{stay.paid ? 'Pagato' : 'Non pagato'}</Tag>
        {(stay.address || stay.mapsUrl) && (
          <a
            href={mapsLinkFor({ mapsUrl: stay.mapsUrl, lat: null, lng: null, name: [stay.name, stay.address, stay.city].filter(Boolean).join(' ') })}
            target="_blank"
            rel="noopener noreferrer"
            class="font-extrabold text-pale"
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
  const actions = useItemActions()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
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
        <Link href="/giorni" class="mt-4 grid min-h-12 place-items-center rounded-full bg-accent font-extrabold text-accent-ink">
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


  // "arrivo da…" per le tappe con posizione: il tempo dalla tappa numerata precedente
  const hintFor = (item: DayItem): string | undefined => {
    const stop = stopByItem.get(item.id)
    if (!stop) return undefined
    const at = route.stops.findIndex((s) => s.id === stop.id)
    if (at < 1) return undefined
    const leg = route.legs[at - 1]
    return leg ? `Dalla tappa ${route.stops[at - 1].n}: ${describeLeg(leg, route.routes[leg.key])}` : undefined
  }

  // il luogo collegato alla tappa, se il nome è diverso dal titolo
  const placeLine = (item: DayItem): string | undefined => {
    const place = item.placeId ? trip.places.find((p) => p.id === item.placeId) : undefined
    if (!place) return undefined
    const same = place.name.trim().toLowerCase() === item.title.trim().toLowerCase()
    return [same ? '' : place.name, place.city].filter(Boolean).join(' · ') || undefined
  }

  const openMovement = (ref: NonNullable<(typeof movements)[number]['ref']>) => {
    if (ref.type === 'flight') {
      const flight = trip.flights.find((f) => f.id === ref.id)
      if (flight) setSheet({ kind: 'edit-flight', flight })
    } else if (ref.type === 'stay') {
      const stay = trip.stays.find((s) => s.id === ref.id)
      if (stay) setSheet({ kind: 'edit-stay', stay })
    } else {
      const transport = trip.transports.find((x) => x.id === ref.id)
      if (transport) setSheet({ kind: 'edit-transport', transport })
    }
  }

  return (
    <div class="space-y-3.5 pb-4">
      <PageHeader title={cap(formatDayLong(day.date))} subtitle={subtitle} back={{ href: '/giorni', label: 'Giorni' }}>
        <div class="mt-2 flex items-center gap-2">
          {prev ? (
            <Link href={`/giorni/${prev.id}`} aria-label={`Giorno precedente, ${formatShort(prev.date)}`} class="grid min-h-11 min-w-11 place-items-center rounded-full border-2 border-line px-3.5 text-sm font-extrabold">
              ‹ {formatShort(prev.date)}
            </Link>
          ) : (
            <span class="min-h-11 min-w-11" />
          )}
          {next ? (
            <Link href={`/giorni/${next.id}`} aria-label={`Giorno successivo, ${formatShort(next.date)}`} class="grid min-h-11 min-w-11 place-items-center rounded-full border-2 border-line px-3.5 text-sm font-extrabold">
              {formatShort(next.date)} ›
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setSheet({ kind: 'day', day })}
            class="ml-auto min-h-11 px-3 text-sm font-extrabold text-pale"
          >
            Modifica giorno
          </button>
        </div>
      </PageHeader>

      <div class="space-y-3.5 px-5">
        {day.notes && (
          <Card class="rise">
            <p class="whitespace-pre-line text-sm">{day.notes}</p>
          </Card>
        )}

        <section class="rise overflow-hidden rounded-2xl border-2 border-line bg-surface">
          <DayMapPanel route={route} center={trip.center} />
          {route.stops.length > 0 && (
            <div class="flex justify-between border-t-2 border-dashed border-line px-4 py-2.5 text-sm">
              <span class="font-extrabold">{route.legs.length > 0 && route.legs.every((l) => l.kind === 'walk') ? 'Percorso a piedi' : 'Percorso del giorno'}</span>
              <span class="text-muted">
                {route.stops.length} {route.stops.length === 1 ? 'tappa' : 'tappe'}
              </span>
            </div>
          )}
        </section>

        {sun && <LightCard date={day.date} city={day.city} sun={sun} nowMin={day.date === today ? minutesOfDay(new Date(), trip.timezone) : null} />}

        <section aria-label="Tappe" class="pt-1.5">
          {reordering && (
            <p class="mb-2 rounded-xl bg-accent-soft px-3 py-2 text-xs text-pale">
              Le tappe con un orario seguono l'orario: per spostarne una, cambia il suo orario. Le altre si spostano con le frecce.
            </p>
          )}
          {day.items.length > 0 ? (
            <ul class="space-y-3">
              {day.items.map((item, i) => (
                <ItemRow
                  item={item}
                  n={i + 1}
                  onMap={stopByItem.has(item.id)}
                  hint={hintFor(item)}
                  place={placeLine(item)}
                  onOpen={reordering ? undefined : () => setSheet({ kind: 'edit-item', day, item })}
                  onToggleDone={reordering ? undefined : () => void actions.toggleDone(item)}
                  onDelete={() => actions.remove(item)}
                  reorder={
                    reordering
                      ? {
                          onUp: i > 0 && canSwap(day.items[i - 1], item) ? () => void actions.move(day.id, item, -1) : undefined,
                          onDown: i < day.items.length - 1 && canSwap(item, day.items[i + 1]) ? () => void actions.move(day.id, item, 1) : undefined,
                        }
                      : undefined
                  }
                />
              ))}
            </ul>
          ) : (
            <p class="rounded-2xl border-2 border-dashed border-line px-4 py-5 text-center text-sm text-muted">Giornata ancora libera: aggiungi le tappe da qui sotto.</p>
          )}
          <button
            type="button"
            onClick={() => setSheet({ kind: 'new-item', day })}
            class="mt-4 grid min-h-[52px] w-full place-items-center rounded-[14px] border-2 border-dashed border-accent text-base font-extrabold text-pale"
          >
            + Aggiungi tappa
          </button>
          {day.items.length > 1 && (
            <button type="button" aria-pressed={reordering} onClick={() => setReordering(!reordering)} class="mx-auto mt-1 block min-h-11 px-3 text-sm font-extrabold text-muted">
              {reordering ? 'Fine' : 'Riordina le tappe'}
            </button>
          )}
        </section>

        <Section title="Spostamenti">
          {movements.length > 0 ? (
            <ul class="divide-y-2 divide-dashed divide-line">
              {movements.map((e) => (
                <li class="flex min-h-14 items-center">
                  <button
                    type="button"
                    disabled={!e.ref}
                    onClick={() => e.ref && openMovement(e.ref)}
                    aria-label={`Modifica: ${e.title}`}
                    class="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left"
                  >
                  <span class="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white">
                    <MovementIcon event={e} />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-extrabold">{e.title}</span>
                    {e.time && (
                      <span class="block text-sm tabular-nums">
                        {e.time}
                        {e.endTime && ` → ${e.endTime}`}
                      </span>
                    )}
                    <span class="block truncate text-xs text-muted">
                      {[e.mode && MODE_LABEL[e.mode], e.sub].filter(Boolean).join(' · ')}
                    </span>
                    {e.flag && <span class="mt-0.5 block"><Tag tone={e.flag.ok ? 'ok' : 'warn'}>{e.flag.text}</Tag></span>}
                  </span>
                  </button>
                  {e.ref?.type === 'transport' && (
                    <TrashButton
                      label={`Elimina il trasporto ${e.title}`}
                      onClick={() => {
                        const id = (e.ref as { id: string }).id
                        void del({
                          title: `Eliminare «${e.title}»?`,
                          done: 'Trasporto eliminato',
                          run: () => t.setTransportDeleted(id, true),
                          undo: () => t.setTransportDeleted(id, false),
                        })
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p class="py-2 text-sm text-muted">Nessun volo, treno o spostamento in programma per questo giorno.</p>
          )}
          {movements.length > 0 && <p class="mt-1 text-xs text-muted">Voli, treni e check-in/out: tocca per modificare. Orari nel fuso di ogni luogo.</p>}
          <div class="mt-1 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-line pt-1">
            <button type="button" onClick={() => setSheet({ kind: 'new-transport', day })} class="min-h-11 px-3 text-sm font-extrabold text-pale">
              + Trasporto
            </button>
            <Link href="/altro/trasporti" class="inline-flex min-h-11 items-center px-3 text-sm font-extrabold text-muted">
              Tutti i trasporti
            </Link>
          </div>
        </Section>

        <Section title="Alloggio">
          {stays.night || stays.checkIn.length > 0 || stays.checkOut.length > 0 ? (
            <div class="divide-y-2 divide-dashed divide-line">
              {stays.checkOut.map((s) => <StayCard stay={s} label="Check-out oggi" onEdit={() => setSheet({ kind: 'edit-stay', stay: s })} />)}
              {stays.checkIn.filter((s) => s.id !== stays.night?.id).map((s) => <StayCard stay={s} label="Check-in oggi" onEdit={() => setSheet({ kind: 'edit-stay', stay: s })} />)}
              {stays.night && (
                <StayCard
                  stay={stays.night}
                  label={stays.night.checkIn === day.date ? 'Check-in oggi · dormi qui' : 'Dormi qui'}
                  onEdit={() => setSheet({ kind: 'edit-stay', stay: stays.night as Stay })}
                />
              )}
            </div>
          ) : (
            <p class="py-2 text-sm text-muted">Nessun alloggio per questa notte.</p>
          )}
          <div class="mt-1 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-line pt-1">
            <button type="button" onClick={() => setSheet({ kind: 'new-stay', day })} class="min-h-11 px-3 text-sm font-extrabold text-pale">
              + Alloggio
            </button>
            <Link href="/altro/alloggi" class="inline-flex min-h-11 items-center px-3 text-sm font-extrabold text-muted">
              Tutti gli alloggi
            </Link>
          </div>
        </Section>

        <WeatherCard forecast={forecast} date={day.date} today={today} tripDates={trip.days.map((d) => d.date)} />

        <Section title="Spese del giorno" aside={expenses.length > 0 ? formatMoney(total, trip.baseCurrency) : undefined}>
          {expenses.length > 0 ? (
            <ul class="divide-y-2 divide-dashed divide-line">
              {expenses.map((e) => {
                const inBase = expenseBase(e, fx)
                return (
                  <li class="flex items-center">
                    <button type="button" onClick={() => setSheet({ kind: 'edit-expense', expense: e })} class="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 text-left">
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-extrabold">{e.label}</span>
                        <span class="block truncate text-xs text-muted">
                          {[e.category, e.paidBy && payer.get(e.paidBy) && `pagato da ${payer.get(e.paidBy)}`].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span class="shrink-0 text-right">
                        <span class="block font-extrabold">{formatMoney(e.amount, e.currency)}</span>
                        {e.currency !== trip.baseCurrency && inBase !== null && (
                          <span class="block text-xs text-muted">≈ {formatMoney(inBase, trip.baseCurrency)}</span>
                        )}
                      </span>
                    </button>
                    <TrashButton
                      label={`Elimina la spesa ${e.label}`}
                      onClick={() =>
                        void del({
                          title: `Eliminare la spesa «${e.label}»?`,
                          text: 'Sparisce dai totali della categoria e dai conti tra voi. Puoi annullare subito dopo.',
                          done: 'Spesa eliminata',
                          run: () => t.setExpenseDeleted(e.id, true),
                          undo: () => t.setExpenseDeleted(e.id, false),
                        })
                      }
                    />
                  </li>
                )
              })}
            </ul>
          ) : (
            <p class="py-2 text-sm text-muted">Nessuna spesa registrata per questo giorno.</p>
          )}
          <div class="mt-1 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-line pt-1">
            <button type="button" onClick={() => setSheet({ kind: 'new-expense', day })} class="min-h-11 px-3 text-sm font-extrabold text-pale">
              + Spesa
            </button>
            <Link href="/altro/spese" class="inline-flex min-h-11 items-center px-3 text-sm font-extrabold text-muted">
              Tutte le spese
            </Link>
          </div>
        </Section>

        {(bookings.length > 0 || todos.length > 0) && (
          <Section title="Prenotazioni e da fare">
            {bookings.length > 0 && (
              <ul class="divide-y-2 divide-dashed divide-line" aria-label="Prenotazioni valide oggi">
                {bookings.map((b) => (
                  <li class="flex items-center">
                    <button type="button" onClick={() => setSheet({ kind: 'edit-booking', booking: b })} aria-label={`Modifica ${b.title}`} class="block min-h-12 min-w-0 flex-1 py-2 text-left">
                      <span class="block truncate font-extrabold">{b.title}</span>
                      <span class="block truncate text-xs text-muted">{b.code ? `Codice ${b.code}` : 'Prenotazione'}</span>
                    </button>
                    <TrashButton
                      label={`Elimina ${b.title}`}
                      onClick={() =>
                        void del({
                          title: `Eliminare «${b.title}»?`,
                          done: 'Prenotazione eliminata',
                          run: () => t.setBookingDeleted(b.id, true),
                          undo: () => t.setBookingDeleted(b.id, false),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
            {todos.length > 0 && (
              <ul class={`divide-y-2 divide-dashed divide-line ${bookings.length > 0 ? 'mt-2 border-t-2 border-dashed border-line' : ''}`} aria-label="Da fare oggi">
                {todos.map((c) => (
                  <li class="flex items-center">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={c.done}
                      aria-label={`${c.done ? 'Da rifare' : 'Fatto'}: ${c.text}`}
                      onClick={async () => {
                        const message = await t.setChecklistDone(c.id, !c.done)
                        if (message) showToast(message)
                      }}
                      class="grid h-11 w-11 shrink-0 place-items-center"
                    >
                      <span class={`grid h-6 w-6 place-items-center rounded-md border-2 ${c.done ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}>
                        {c.done && <TickIcon size={14} />}
                      </span>
                    </button>
                    <button type="button" onClick={() => setSheet({ kind: 'edit-checklist', item: c })} class={`min-h-12 min-w-0 flex-1 py-2 text-left text-sm ${c.done ? 'text-muted line-through' : ''}`}>
                      {c.text}
                    </button>
                    <TrashButton
                      label={`Elimina ${c.text}`}
                      onClick={() =>
                        void del({
                          title: `Eliminare «${c.text}»?`,
                          done: 'Voce eliminata',
                          run: () => t.setChecklistDeleted(c.id, true),
                          undo: () => t.setChecklistDeleted(c.id, false),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}
      </div>

      {actions.dialog}
      {delDialog}
      <DaySheet trip={trip} state={sheet} onChange={setSheet} />
    </div>
  )
}
