import { useEffect, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { budgetLines, fxOf, logisticsLines, paidFromSections, personBudget, summarizeExpenses, summarizeLines } from '../lib/budget'
import { useAuth } from '../lib/auth'
import { progress } from '../lib/checklist'
import { daysBetween, formatShort } from '../lib/dates'
import { localPerBase, formatRateNumber } from '../lib/fx'
import { currencySymbol, formatMoney, round2 } from '../lib/money'
import { minutesOfDay, sunForDay } from '../lib/sun'
import { destinationClock, eventsForDay, formatDiffHours, homeCountry, homeTime, nextItem, tripToday } from '../lib/today'
import { useForecast } from '../state/forecast'
import { setScrollTarget } from '../state/scrollTarget'
import { useTrip } from '../state/trip'
import { BedIcon, BudgetIcon, ChecklistIcon, ChevronRightIcon, ClockIcon, PlaneIcon, SwapIcon } from '../ui/Icons'
import { ItemRow } from '../ui/ItemRow'
import { LightCard } from '../ui/LightBar'
import { Card } from '../ui/PageHeader'
import { isJapanTrip } from '../lib/tripLocale'
import { BoardingNotches, Disc, Jp, Stripe, Tag, Ticket } from '../ui/Ticket'
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
function Shortcut({ href, icon, color, title, line, lineTone }: { href: string; icon: preact.ComponentChildren; color: string; title: string; line: string; lineTone?: 'warn' }) {
  return (
    <Link href={href} class="block">
      <Ticket stub={<Disc color={color}>{icon}</Disc>} stubWidth={76}>
        <span class="min-w-0 flex-1">
          <span class="block text-[17px] font-extrabold leading-tight">{title}</span>
          <span class={`block text-[13px] ${lineTone === 'warn' ? 'font-extrabold text-warn' : 'text-muted'}`}>{line}</span>
        </span>
        <ChevronRightIcon size={20} class="mr-2 shrink-0 text-muted" />
      </Ticket>
    </Link>
  )
}

/** Pillola con l'ora di un posto: icona, ora grande e, su due righe, il nome del posto e lo scarto orario. */
function ClockPill({ time, place, diff }: { time: string; place: string; diff: string }) {
  return (
    <div class="flex min-h-[52px] min-w-0 items-center gap-2 rounded-full border-2 border-line bg-surface px-3.5">
      <ClockIcon size={16} class="shrink-0 text-pale" />
      <span class="font-display shrink-0 whitespace-nowrap text-xl font-extrabold leading-none tabular-nums text-pale">{time}</span>
      <span class="min-w-0 text-xs leading-tight text-muted">
        <span class="block truncate">{place}</span>
        <span class="block truncate">{diff}</span>
      </span>
    </div>
  )
}

export function Oggi() {
  const trip = useTrip()
  const auth = useAuth()
  const now = useNow()
  const forecast = useForecast(trip)
  const today = tripToday(trip, now) // oggi nel fuso della destinazione
  const toStart = daysBetween(today, trip.startDate)
  const toEnd = daysBetween(today, trip.endDate)
  const total = daysBetween(trip.startDate, trip.endDate) + 1
  const inTrip = toStart <= 0 && toEnd >= 0
  const before = toStart > 0

  const focus = trip.days.find((d) => d.date >= today) ?? trip.days[0]
  const isToday = focus?.date === today
  const nowMin = minutesOfDay(now, trip.timezone)
  const next = focus && isToday ? nextItem(focus, nowMin) : null
  const events = focus ? eventsForDay(trip, focus.date) : []
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const clock = destinationClock(trip.timezone, deviceTz, now)
  const homeClock = homeTime(deviceTz, now)
  const homeName = homeCountry(navigator.language)
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
  const hasFx = !!trip.fxRate && !!trip.localCurrency && trip.localCurrency !== trip.baseCurrency

  return (
    <div class="px-5" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
      <div class="flex items-center justify-between pb-3.5">
        <h1 class="font-display text-base font-extrabold">{trip.title}</h1>
        <span class="text-[13px] text-muted">
          {formatShort(trip.startDate)} – {formatShort(trip.endDate)}
        </span>
      </div>

      {/* l'ora nel paese del viaggio (sinistra) e a casa (destra), una pillola per metà pagina */}
      <div class="mb-3.5 grid grid-cols-2 gap-2.5">
        <ClockPill time={clock.time} place={trip.destination || 'Destinazione'} diff={clock.diffHours === 0 ? 'stesso fuso' : formatDiffHours(clock.diffHours)} />
        <ClockPill time={homeClock} place={homeName} diff={clock.diffHours === 0 ? 'stesso fuso' : formatDiffHours(-clock.diffHours)} />
      </div>

      {/* carta d'imbarco: conto alla rovescia (o giorno del viaggio) e prossimo volo */}
      <section class="rise relative rounded-[20px] border-2 border-line bg-surface">
        <Stripe />
        <div class="px-5 pb-[18px] pt-4">
          <div class="flex items-center justify-between">
            <span class="text-[13px] text-muted">{before ? 'Alla partenza mancano' : inTrip ? 'Sei in viaggio' : 'Viaggio concluso'}</span>
            {isJapanTrip(trip) && <Jp>{before ? '出発まで' : inTrip ? '旅行中' : '旅の思い出'}</Jp>}
          </div>
          {before ? (
            <div class="mt-1.5 flex items-end gap-3.5">
              <span class="font-display text-[132px] font-extrabold leading-[0.8] tracking-[-6px] text-pale tabular-nums">{toStart}</span>
              <div class="pb-1">
                <div class="font-display text-[28px] font-extrabold leading-none">{toStart === 1 ? 'giorno' : 'giorni'}</div>
                <div class="mt-0.5 text-sm text-muted">alla partenza</div>
              </div>
            </div>
          ) : inTrip ? (
            <div class="mt-1.5 flex items-end gap-3.5">
              <span class="font-display text-[96px] font-extrabold leading-[0.85] tracking-[-4px] text-pale tabular-nums">{-toStart + 1}</span>
              <div class="pb-1">
                <div class="font-display text-[28px] font-extrabold leading-none">di {total}</div>
                <div class="mt-0.5 text-sm text-muted">giorni di viaggio</div>
              </div>
            </div>
          ) : (
            <p class="font-display mt-2 text-3xl font-extrabold">Bentornati</p>
          )}
        </div>
        <BoardingNotches />
        <div class="border-t-2 border-dashed border-line" />
        <div class="px-5 pb-[18px] pt-3.5">
          {flight ? (
            <>
              <div class="text-[13px] text-muted">Prossima partenza</div>
              <div class="mt-1.5 flex items-center gap-3">
                <span class="font-display text-4xl font-extrabold tracking-[-1px]">{fromLabel}</span>
                <PlaneIcon size={30} class="text-pale" />
                <span class="font-display text-4xl font-extrabold tracking-[-1px]">{toLabel}</span>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2.5">
                <span class="text-[15px] text-muted">{cap(longDateIn(flight.leg.departAt, flight.leg.fromTz))}</span>
                {!flight.f.paid && <Tag tone="warn">Non acquistato</Tag>}
              </div>
            </>
          ) : (
            <>
              <div class="text-[13px] text-muted">{trip.destination || 'Il viaggio'}</div>
              <p class="mt-1 text-[17px] font-extrabold">{trip.flights.length === 0 ? 'Nessun volo inserito' : 'Nessun volo in programma'}</p>
              <Link href="/altro/trasporti" class="mt-1 inline-flex min-h-11 items-center text-[15px] font-extrabold text-pale">
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
            <p class="font-display mt-0.5 text-xl font-extrabold leading-tight">{next.item.title}</p>
            <p class="text-sm text-muted tabular-nums">
              {next.item.time}
              {next.item.endTime ? `–${next.item.endTime}` : ''}
              {next.item.note ? ` · ${next.item.note}` : ''}
            </p>
          </Card>
        )}

        {events.length > 0 && (
          <Card class="rise">
            <h2 class="font-display mb-1 text-lg font-extrabold">Logistica del giorno</h2>
            <ul class="divide-y-2 divide-dashed divide-line">
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
            <h2 class="font-display mb-2 text-lg font-extrabold">Programma</h2>
            {focus.items.length > 0 ? (
              <ul class="space-y-3">
                {focus.items.map((item) => (
                  <ItemRow item={item} />
                ))}
              </ul>
            ) : (
              <p class="rounded-2xl border-2 border-dashed border-line px-4 py-5 text-center text-sm text-muted">Giornata ancora libera: aggiungi le tappe dalla scheda Giorni.</p>
            )}
          </section>
        )}

        <div class="flex flex-col gap-3.5 pt-0.5">
          <Shortcut href="/altro/checklist" icon={<ChecklistIcon size={22} />} color="var(--accent)" title="Checklist" line={check.total === 0 ? 'Ancora vuota' : `${check.done} di ${check.total} fatte`} />
          <Shortcut
            href="/altro/alloggi"
            icon={<BedIcon size={22} />}
            color="var(--warn)"
            title="Alloggi"
            line={trip.stays.length === 0 ? 'Nessun alloggio' : unbooked > 0 ? `${unbooked} non ${unbooked === 1 ? 'prenotato' : 'prenotati'}` : `${trip.stays.length} prenotati`}
            lineTone={unbooked > 0 ? 'warn' : undefined}
          />
          <Shortcut
            href="/altro/budget"
            icon={<BudgetIcon size={22} />}
            color="var(--ok)"
            title={mine ? 'Il tuo budget' : 'Budget'}
            line={planned > 0 ? `${formatMoney(spent, trip.baseCurrency)} su ${formatMoney(planned, trip.baseCurrency)}` : `${formatMoney(spent, trip.baseCurrency)} spesi`}
          />
          {hasFx && (
            <Link href="/altro/budget" class="block" onClick={() => setScrollTarget('cambio')}>
              <Ticket stub={<Disc color="var(--pale)"><SwapIcon size={22} /></Disc>} stubWidth={76}>
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
