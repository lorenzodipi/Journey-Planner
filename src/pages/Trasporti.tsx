import { useState } from 'preact/hooks'
import { formatDay, parseYmd } from '../lib/dates'
import { dateInZone, dayOffset, formatInZone, layover, totalTravelTime } from '../lib/flights'
import { formatDuration } from '../lib/duration'
import { earliestFirst, formatWhen, transportWhen, whenKey } from '../lib/logistics'
import { formatMoney } from '../lib/money'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Flight, Transport, TransportMode } from '../types'
import { ART } from '../ui/art'
import { CheckG, ChevronRightG, ClockG, PlusG } from '../ui/glyphs'
import { FlightForm } from '../ui/FlightForm'
import { MapsPill } from '../ui/MapsPill'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'
import { Ic } from '../ui/Sprite'
import { MODE_LABEL, TransportForm } from '../ui/TransportForm'

type SheetState =
  | { kind: 'choose' }
  | { kind: 'new-flight' }
  | { kind: 'edit-flight'; flight: Flight }
  | { kind: 'new-transport' }
  | { kind: 'edit-transport'; transport: Transport }
  | null

const MODE_ICON: Record<TransportMode, string> = {
  train: 'i-tra-train',
  metro: 'i-tra-metro',
  bus: 'i-tra-bus',
  taxi: 'i-tra-bus',
  walk: 'i-tra-walk',
  car: 'i-tra-bus',
  plane: 'i-tra-plane',
  ferry: 'i-tra-bus',
  other: 'i-nav-route',
}
const MODE_TINT: Record<TransportMode, string> = {
  train: 't-menta',
  metro: 't-limone',
  bus: 't-limone',
  taxi: 't-lavanda',
  walk: 't-confetto',
  car: 't-lavanda',
  plane: 't-azzurro',
  ferry: 't-azzurro',
  other: 't-confetto',
}

const mapsFor = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
const activate = (fn: () => void) => ({
  role: 'button' as never,
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e: { key: string; preventDefault(): void }) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  },
})

export function Trasporti() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)

  const title =
    sheet?.kind === 'choose' ? 'Nuovo trasporto' : sheet?.kind === 'new-flight' ? 'Nuovo volo' : sheet?.kind === 'edit-flight' ? 'Modifica volo' : sheet?.kind === 'new-transport' ? 'Nuovo trasporto' : 'Modifica trasporto'

  // voli in alto e gli altri trasporti sotto; in ogni gruppo in ordine di data e ora, il primo in alto
  const flights = earliestFirst(trip.flights, (f) => f.legs[0]?.departAt ?? '')
  const transports = earliestFirst(trip.transports, (x) => whenKey(transportWhen(x, trip.timezone, trip.days).depart))
  const count = trip.transports.length + trip.flights.length
  const subtitle =
    count === 0
      ? 'Voli, treni e spostamenti'
      : [flights.length ? `${flights.length} ${flights.length === 1 ? 'volo' : 'voli'}` : '', transports.length ? `${transports.length} ${transports.length === 1 ? 'trasporto' : 'trasporti'}` : ''].filter(Boolean).join(' · ')

  return (
    <main class="screen">
      <PageHeader
        title="Trasporti e voli"
        subtitle={subtitle}
        back={{ href: '/altro', label: 'Altro' }}
        actions={
          <button type="button" class="rbtn" aria-label="Aggiungi trasporto" onClick={() => setSheet({ kind: 'choose' })}>
            <PlusG />
          </button>
        }
      />

      {count === 0 && <EmptyState title="Nessun trasporto" text="Voli con scali, treni, pass metro, bus e taxi: orari, costo e se il biglietto è già comprato." art={ART.partenza} />}

      {flights.length > 0 && (
        <section aria-label="Voli">
          <h2 class="h-md" style={{ marginBottom: '10px' }}>
            Voli
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {flights.map((f) => (
              <FlightTicket key={f.id} flight={f} onEdit={() => setSheet({ kind: 'edit-flight', flight: f })} />
            ))}
          </div>
        </section>
      )}

      {transports.length > 0 && (
        <section aria-label="Treni e pass">
          <h2 class="h-md" style={{ marginBottom: '10px' }}>
            {flights.length > 0 ? 'Treni e pass' : 'Trasporti'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transports.map((x) => {
              const { depart } = transportWhen(x, trip.timezone, trip.days)
              const d = depart ? parseYmd(depart.date) : null
              const day = d ? { n: String(d.getDate()), m: new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(d).replace('.', '') } : null
              const costText = x.cost != null ? formatMoney(x.cost, x.currency) : ''
              const costParts = x.cost != null ? costText.replace(/\s?[^\d.,\s-]+$/u, '').trim() : ''
              const sub = [depart ? formatWhen(depart, trip.timezone) : MODE_LABEL[x.mode], x.cost != null ? `${costText}${x.scope === 'per_person' ? ' a persona' : ''}` : '', x.refCode && `Cod. ${x.refCode}`].filter(Boolean).join(' · ')
              const label = `${x.from} → ${x.to}`
              return (
                <div class="tkwrap" key={x.id}>
                  <article class={`ct ${MODE_TINT[x.mode]}`} aria-label={`Modifica ${label}`} {...activate(() => setSheet({ kind: 'edit-transport', transport: x }))}>
                    <div class="cl">
                      <Ic name={MODE_ICON[x.mode]} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <p class="rt">
                          {MODE_LABEL[x.mode]} {label}
                        </p>
                        <p class="m">{sub}</p>
                        {x.bought ? (
                          <span class="sp ok">
                            <CheckG size={14} sw={3} />
                            Acquistato
                          </span>
                        ) : (
                          <span class="sp warn">
                            <ClockG size={14} sw={2.4} />
                            Da acquistare
                          </span>
                        )}
                      </div>
                    </div>
                    <div class="cr2">
                      {day ? (
                        <>
                          <b>{day.n}</b>
                          <span>{day.m}</span>
                        </>
                      ) : x.cost != null ? (
                        <>
                          <b>{costParts}</b>
                          <span>{x.currency === 'EUR' ? '€' : x.currency}</span>
                        </>
                      ) : (
                        <ChevronRightG />
                      )}
                    </div>
                  </article>
                  <div class="below">
                    <MapsPill href={mapsFor(x.from)} label={x.from} text="Punto di partenza" kind="sm" />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <Sheet open={sheet !== null} title={title} onClose={close}>
        {sheet?.kind === 'choose' && (
          <div style={{ display: 'grid', gap: '12px' }} role="group" aria-label="Che tipo di trasporto">
            <p class="b-sm muted">Che cosa aggiungi?</p>
            {(
              [
                { kind: 'new-flight', label: 'Volo', hint: 'Con scali, orari e fusi orari', icon: 'i-tra-plane' },
                { kind: 'new-transport', label: 'Altro trasporto', hint: 'Treno, bus, metro, taxi, traghetto…', icon: 'i-tra-train' },
              ] as const
            ).map((o) => (
              <button type="button" key={o.kind} onClick={() => setSheet({ kind: o.kind })} class="card row" style={{ minHeight: '72px', textAlign: 'left', width: '100%' }}>
                <Ic name={o.icon} size={44} />
                <span class="grow">
                  <span class="tt" style={{ display: 'block', fontWeight: 700 }}>
                    {o.label}
                  </span>
                  <span class="mm" style={{ display: 'block' }}>
                    {o.hint}
                  </span>
                </span>
                <ChevronRightG />
              </button>
            ))}
          </div>
        )}
        {sheet?.kind === 'new-flight' && <FlightForm trip={trip} onSubmit={(i) => t.createFlight(trip.id, i)} onDone={close} />}
        {sheet?.kind === 'edit-flight' && (
          <FlightForm
            key={sheet.flight.id}
            trip={trip}
            initial={sheet.flight}
            onSubmit={(i) => t.updateFlight(trip.id, sheet.flight, i)}
            onDelete={async () => {
              const id = sheet.flight.id
              const message = await t.setFlightDeleted(id, true)
              if (!message) showToast('Volo eliminato', { label: 'Annulla', run: () => void t.setFlightDeleted(id, false) })
              return message
            }}
            onDone={close}
          />
        )}
        {sheet?.kind === 'new-transport' && <TransportForm trip={trip} onSubmit={(i) => t.createTransport(trip.id, i)} onDone={close} />}
        {sheet?.kind === 'edit-transport' && (
          <TransportForm
            key={sheet.transport.id}
            trip={trip}
            initial={sheet.transport}
            onSubmit={(i) => t.updateTransport(trip.id, sheet.transport.id, i)}
            onDelete={async () => {
              const id = sheet.transport.id
              const message = await t.setTransportDeleted(id, true)
              if (!message) showToast('Trasporto eliminato', { label: 'Annulla', run: () => void t.setTransportDeleted(id, false) })
              return message
            }}
            onDone={close}
          />
        )}
      </Sheet>
    </main>
  )
}

/** Biglietto aereo: rotta da prima a ultima tratta, durata complessiva e scali. */
function FlightTicket({ flight, onEdit }: { flight: Flight; onEdit: () => void }) {
  const legs = flight.legs
  const first = legs[0]
  const last = legs[legs.length - 1]
  const times = legs.map((l) => ({ depart: l.departAt, arrive: l.arriveAt }))
  const stops = legs.slice(1).map((l, i) => ({ at: l.from, min: layover(times[i], times[i + 1]) }))
  const off = first && last ? dayOffset({ depart: first.departAt, arrive: last.arriveAt }, first.fromTz, last.toTz) : 0
  const total = legs.length ? totalTravelTime(times) : 0
  const mins = (m: number) => formatDuration(Math.max(0, m))
  const third = stops.length === 1 ? { k: `Scalo · ${stops[0].at}`, v: mins(stops[0].min) } : stops.length > 1 ? { k: `${stops.length} scali`, v: mins(stops.reduce((a, s) => a + s.min, 0)) } : flight.cost != null ? { k: flight.scope === 'per_person' ? 'A persona' : 'Totale', v: formatMoney(flight.cost, flight.currency) } : { k: 'Compagnia', v: flight.airline || '—' }
  const numbers = legs.map((l) => l.flightNumber).filter(Boolean) as string[]
  return (
    <article class="tk t-azzurro" aria-label={`Modifica ${flight.title}`} {...activate(onEdit)}>
      <div class="top">
        <div class="hd">
          <span class="kind">
            <Ic name="i-tra-plane" size={32} />
            {flight.title}
          </span>
          <span class="okp">
            {flight.paid ? <CheckG size={14} sw={3} /> : <ClockG size={14} sw={2.4} />}
            {flight.paid ? 'Acquistato' : 'Non acquistato'}
          </span>
        </div>
        {first && last && (
          <div class="route">
            <div class="pt">
              <b>{first.from}</b>
              <span>{numbers[0] ?? ' '}</span>
              <span class="tm">{formatInZone(first.departAt, first.fromTz)}</span>
            </div>
            <div class="mid">
              <Ic name="i-tra-plane" size={28} />
              <span class="dur">{legs.length} {legs.length === 1 ? 'volo' : 'voli'}</span>
            </div>
            <div class="pt r">
              <b>{last.to}</b>
              <span>{numbers.length > 1 ? numbers[numbers.length - 1] : ' '}</span>
              <span class="tm">
                {formatInZone(last.arriveAt, last.toTz)}
                {off !== 0 && ` ${off > 0 ? `+${off}` : off}`}
              </span>
            </div>
          </div>
        )}
      </div>
      <div class="bot">
        {first && (
          <div class="f3">
            <div>
              <span class="k">Data</span>
              <b>{formatDay(dateInZone(first.departAt, first.fromTz))}</b>
            </div>
            <div>
              <span class="k">Durata</span>
              <b>{mins(total)}</b>
            </div>
            <div>
              <span class="k">{third.k}</span>
              <b>{third.v}</b>
            </div>
          </div>
        )}
        <div class="bars" aria-hidden="true" />
        {flight.notes && <p class="ad" style={{ whiteSpace: 'pre-line' }}>{flight.notes}</p>}
        <div class="row2">
          <span class="code">{flight.bookingRef ? `PNR · ${flight.bookingRef}` : flight.airline || 'Volo'}</span>
          {first && <MapsPill href={mapsFor(`Aeroporto ${first.from}`)} label={`Aeroporto ${first.from}`} text={`Apri ${first.from}`} kind="sm" />}
        </div>
      </div>
    </article>
  )
}
