import { useEffect, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { budgetLine, budgetLines, budgetStatus, fxOf, logisticsLines, paidFromSections, personBudget, summarizeExpenses, summarizeLines } from '../lib/budget'
import { useAuth } from '../lib/auth'
import { progress } from '../lib/checklist'
import { daysBetween, formatShort } from '../lib/dates'
import { localPerBase, formatRateNumber } from '../lib/fx'
import { currencySymbol, formatMoney, round2 } from '../lib/money'
import { minutesOfDay, sunForDay } from '../lib/sun'
import { destinationClock, eventsForDay, formatDiffHours, homeCountry, homeTime, nextItem, tripToday } from '../lib/today'
import { originOf } from '../lib/origin'
import { useForecast } from '../state/forecast'
import { setScrollTarget } from '../state/scrollTarget'
import { useTrip } from '../state/trip'
import { BedIcon, BudgetIcon, ChecklistIcon, ChevronRightIcon, PlaneIcon, SwapIcon } from '../ui/Icons'
import { ItemRow } from '../ui/ItemRow'
import { LightCard } from '../ui/LightBar'
import { Card } from '../ui/PageHeader'
import { isJapanTrip } from '../lib/tripLocale'
import { Disc, Jp, Tag, Ticket, type Tint } from '../ui/Ticket'
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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const longDateIn = (iso: string, timeZone: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(new Date(iso))

/** Scorciatoia a forma di biglietto: cerchio con icona a sinistra, titolo e riga di stato, freccia. */
function Shortcut({ href, icon, color, title, line, lineTone }: { href: string; icon: preact.ComponentChildren; color: string; title: string; line: string; lineTone?: 'warn' | 'danger' }) {
  return (
    <Link href={href} class="block">
      <Ticket stub={<Disc color={color}>{icon}</Disc>} stubWidth={76}>
        <span class="min-w-0 flex-1">
          <span class="block text-[17px] font-extrabold leading-tight">{title}</span>
          <span class={`block text-[13px] ${lineTone === 'warn' ? 'font-extrabold text-warn' : lineTone === 'danger' ? 'font-extrabold text-danger' : 'text-muted'}`}>{line}</span>
        </span>
        <ChevronRightIcon size={20} class="mr-2 shrink-0 text-muted" />
      </Ticket>
    </Link>
  )
}

/** Card colorata con l'ora di un posto: nome del posto, ora grande e scarto orario. */
function ClockCard({ tint, time, place, diff }: { tint: Tint; time: string; place: string; diff: string }) {
  return (
    <div class="flex min-w-0 flex-col gap-0.5 rounded-[20px] px-4 pb-4 pt-3.5 text-on-tinta" style={{ background: `var(--tinta-${tint})` }}>
      <span class="truncate text-[13px] font-semibold text-on-tinta-muted">{place}</span>
      <span class="font-display text-[42px] font-semibold leading-[46px] tracking-[-0.02em] tabular-nums">{time}</span>
      <span class="text-[13px] text-on-tinta-muted">{diff}</span>
    </div>
  )
}

const flightTime = (iso: string, timeZone: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso))

export function Oggi() {
  const trip = useTrip()
  const auth = useAuth()
  const now = useNow()
  const forecast = useForecast(trip)
  const today = tripToday(trip, now) // oggi nel fuso della destinazione
  const toStart = daysBetween(today, trip.startDate)
  const toEnd = daysBetween(today, trip.endDate)
  const inTrip = toStart <= 0 && toEnd >= 0
  const before = toStart > 0

  const focus = trip.days.find((d) => d.date >= today) ?? trip.days[0]
  const isToday = focus?.date === today
  const nowMin = minutesOfDay(now, trip.timezone)
  const next = focus && isToday ? nextItem(focus, nowMin) : null
  const events = focus ? eventsForDay(trip, focus.date) : []
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  // casa: il paese di origine del viaggio se c'è, altrimenti il fuso e la lingua del telefono
  const origin = originOf(trip)
  const homeTz = origin?.timezone ?? deviceTz
  const clock = destinationClock(trip.timezone, homeTz, now)
  const homeClock = homeTime(homeTz, now)
  const homeName = origin?.name ?? homeCountry(navigator.language)
  const sun = focus ? sunForDay(focus.date, trip.center.lat, trip.center.lng, trip.timezone) : null

  // prossimo volo: la prima tratta che parte da adesso in poi (altrimenti la prima del viaggio)
  const legs = trip.flights.flatMap((f) => f.legs.map((leg) => ({ f, leg }))).sort((a, b) => a.leg.departAt.localeCompare(b.leg.departAt))
  const flight = legs.find((x) => x.leg.departAt >= now.toISOString()) ?? null

  // città dal titolo del volo ("Roma → Tokyo"); se non c'è, i codici degli aeroporti
  const route = flight ? /^\s*(.+?)\s*(?:→|->|–|—)\s*(.+?)\s*$/.exec(flight.f.title) : null
  const fromLabel = route && flight!.f.legs.length === 1 ? route[1] : flight?.leg.from
  const toLabel = route && flight!.f.legs.length === 1 ? route[2] : flight?.leg.to

  const check = progress(trip.checklist)
  const unbooked = trip.stays.filter((s) => !s.booked).length
  const fx = fxOf(trip)
  // il budget della Home è quello di chi ha fatto l'accesso (la sua parte); senza un viaggiatore collegato, quello di tutti
  const me = trip.travelers.find((p) => p.userId && p.userId === auth.session?.user.id)
  const mine = me ? personBudget(trip, me.id, fx) : null
  const spent = mine ? mine.spent : round2(summarizeExpenses(trip.expenses, trip.travelers, fx).total + paidFromSections(trip, fx).paid)
  const planned = mine ? mine.planned : summarizeLines([...budgetLines(trip.budget), ...logisticsLines(trip)], trip.travelers, fx).planned
  // con un budget massimo la card mostra lo speso di tutti rispetto al tetto; senza, resta com'è
  const tripSpent = round2(summarizeExpenses(trip.expenses, trip.travelers, fx).total + paidFromSections(trip, fx).paid)
  const limitStatus = budgetStatus(trip.budgetLimit, tripSpent, 0)
  const hasFx = !!trip.fxRate && !!trip.localCurrency && trip.localCurrency !== trip.baseCurrency

  return (
    <div class="px-5" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
      <header class="pb-4 pt-2">
        <h1 class="font-display text-[32px] leading-[38px]">{trip.title}</h1>
        <p class="mt-0.5 text-sm text-muted">
          {formatShort(trip.startDate)} – {formatShort(trip.endDate)}
          {isJapanTrip(trip) && <Jp class="ml-2">{before ? '出発まで' : inTrip ? '旅行中' : '旅の思い出'}</Jp>}
        </p>
      </header>

      {/* l'ora nel paese del viaggio (sinistra) e a casa (destra) */}
      <div class="mb-4 grid grid-cols-2 gap-3">
        <ClockCard tint="azzurro" time={clock.time} place={trip.destination || 'Destinazione'} diff={clock.diffHours === 0 ? 'stesso fuso' : formatDiffHours(clock.diffHours)} />
        <ClockCard tint="lavanda" time={homeClock} place={homeName} diff={clock.diffHours === 0 ? 'stesso fuso' : formatDiffHours(-clock.diffHours)} />
      </div>

      {/* carta d'imbarco: conto alla rovescia (o stato del viaggio) e prossimo volo */}
      <section class="rise jp-tk" aria-label="Carta d'imbarco">
        <div class="jp-tk-top">
          <p class="text-sm font-semibold text-on-tinta-muted">{before ? 'Alla partenza mancano' : inTrip ? 'Sei in viaggio' : 'Viaggio concluso'}</p>
          {before ? (
            <div class="mt-1 flex items-end gap-3.5" role="timer" aria-label={`${toStart} giorni alla partenza`}>
              <span class="font-display text-[124px] font-semibold leading-[100px] tracking-[-0.04em] tabular-nums">{toStart}</span>
              <div class="pb-1">
                <div class="font-display text-[32px] leading-9">{toStart === 1 ? 'giorno' : 'giorni'}</div>
              </div>
            </div>
          ) : inTrip ? (
            <p class="font-display mt-1 text-4xl leading-10">{formatShort(focus?.date ?? today)}</p>
          ) : (
            <p class="font-display mt-1 text-4xl leading-10">Bentornati</p>
          )}
        </div>
        <div class="jp-tk-bot">
          {flight ? (
            <>
              <p class="text-sm font-semibold text-on-tinta-muted">Prossima partenza</p>
              <div class="mt-1.5 flex items-center gap-3">
                <span class="font-display text-[38px] leading-[44px]">{fromLabel}</span>
                <PlaneIcon size={28} />
                <span class="font-display text-[38px] leading-[44px]">{toLabel}</span>
              </div>
              <p class="mt-1.5 text-base font-semibold">{cap(longDateIn(flight.leg.departAt, flight.leg.fromTz))} · {flightTime(flight.leg.departAt, flight.leg.fromTz)}</p>
              {!flight.f.paid && (
                <div class="mt-2">
                  <Tag tone="warn">Non acquistato</Tag>
                </div>
              )}
            </>
          ) : (
            <>
              <p class="text-sm font-semibold text-on-tinta-muted">{trip.destination || 'Il viaggio'}</p>
              <p class="mt-1 text-[17px] font-bold">{trip.flights.length === 0 ? 'Nessun volo inserito' : 'Nessun volo in programma'}</p>
              <Link href="/altro/trasporti" class="mt-1 inline-flex min-h-11 items-center text-[15px] font-bold text-[#075a99]">
                Vai ai trasporti
              </Link>
            </>
          )}
        </div>
      </section>

      <div class="mt-[18px] space-y-3.5">
        {focus && sun && <LightCard date={focus.date} city={focus.city} sun={sun} nowMin={isToday ? nowMin : null} />}

        {next && (
          <Card class="rise">
            <p class="text-[13px] text-muted">{next.status === 'now' ? 'In corso' : 'Prossima tappa'}</p>
            <p class="font-display mt-0.5 text-xl leading-tight">{next.item.title}</p>
            <p class="text-sm text-muted tabular-nums">
              {next.item.time}
              {next.item.endTime ? `–${next.item.endTime}` : ''}
              {next.item.note ? ` · ${next.item.note}` : ''}
            </p>
          </Card>
        )}

        {events.length > 0 && (
          <Card class="rise">
            <h2 class="font-display mb-1 text-xl">Logistica del giorno</h2>
            <ul class="divide-y-2 divide-dashed divide-hairline">
              {events.map((e) => (
                <li class={`flex min-h-12 items-center gap-3 py-2 ${isToday && e.time && e.at < now.toISOString() ? 'opacity-50' : ''}`}>
                  <span class="w-11 shrink-0 text-right text-sm font-extrabold tabular-nums text-pale">{e.time}</span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-extrabold">{e.title}</span>
                    {e.sub && <span class="block truncate text-xs text-muted">{e.sub}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p class="mt-1 text-xs text-muted">Orari nel fuso di ogni luogo.</p>
          </Card>
        )}

        {inTrip && focus && <WeatherCard forecast={forecast} date={focus.date} today={today} tripDates={trip.days.map((d) => d.date)} />}

        {inTrip && focus && (
          <section class="rise">
            <h2 class="font-display mb-2 text-2xl">Programma di oggi</h2>
            {focus.items.length > 0 ? (
              <ul class="space-y-3">
                {focus.items.map((item) => (
                  <ItemRow item={item} />
                ))}
              </ul>
            ) : (
              <p class="rounded-[20px] border-2 border-dashed border-line px-4 py-5 text-center text-sm text-muted">Giornata ancora libera: aggiungi le tappe dalla scheda Giorni.</p>
            )}
          </section>
        )}

        <div class="flex flex-col gap-3.5 pt-0.5">
          <Shortcut href="/altro/checklist" icon={<ChecklistIcon size={22} />} color="var(--arancia)" title="Checklist" line={check.total === 0 ? 'Ancora vuota' : `${check.done} di ${check.total} fatte`} />
          <Shortcut
            href="/altro/alloggi"
            icon={<BedIcon size={22} />}
            color="var(--glicine)"
            title="Alloggi"
            line={trip.stays.length === 0 ? 'Nessun alloggio' : unbooked > 0 ? `${unbooked} non ${unbooked === 1 ? 'prenotato' : 'prenotati'}` : `${trip.stays.length} prenotati`}
            lineTone={unbooked > 0 ? 'warn' : undefined}
          />
          <Shortcut
            href="/altro/budget"
            icon={<BudgetIcon size={22} />}
            color="var(--menta)"
            title={limitStatus ? 'Spese' : mine ? 'Le tue spese' : 'Spese'}
            lineTone={limitStatus?.state === 'over' ? 'danger' : limitStatus?.state === 'warn' ? 'warn' : undefined}
            line={limitStatus && trip.budgetLimit ? budgetLine(limitStatus, tripSpent, trip.budgetLimit, trip.baseCurrency) : planned > 0 ? `${formatMoney(spent, trip.baseCurrency)} su ${formatMoney(planned, trip.baseCurrency)}` : `${formatMoney(spent, trip.baseCurrency)} spesi`}
          />
          {hasFx && (
            <Link href="/altro/budget" class="block" onClick={() => setScrollTarget('cambio')}>
              <Ticket stub={<Disc color="var(--cielo)"><SwapIcon size={22} /></Disc>} stubWidth={76}>
                <span class="min-w-0 flex-1">
                  <span class="block text-[13px] text-muted">Cambio</span>
                  <span class="block text-[17px] font-extrabold leading-tight">
                    1 {currencySymbol(trip.baseCurrency)} = {formatRateNumber(localPerBase(trip.fxRate as number))} {currencySymbol(trip.localCurrency as string)}
                  </span>
                </span>
                <span class="mr-3 shrink-0 text-sm font-extrabold text-pale">Calcola</span>
              </Ticket>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
