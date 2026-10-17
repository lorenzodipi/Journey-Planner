import { useState } from 'preact/hooks'
import { dayOffset, formatDateInZone, formatDuration, formatInZone, layover, legDuration, totalTravelTime } from '../lib/flights'
import { formatMoney } from '../lib/money'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Flight, Transport } from '../types'
import { FlagPill } from '../ui/FlagPill'
import { FlightForm } from '../ui/FlightForm'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'
import { MODE_LABEL, TransportForm } from '../ui/TransportForm'

type SheetState =
  | { kind: 'new-flight' }
  | { kind: 'edit-flight'; flight: Flight }
  | { kind: 'new-transport' }
  | { kind: 'edit-transport'; transport: Transport }
  | null

const scopeText = (scope: 'per_person' | 'total') => (scope === 'per_person' ? 'a persona' : 'totale')

export function Trasporti() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)

  async function toggleBought(x: Transport) {
    const message = await t.setTransportBought(x.id, !x.bought)
    if (message) showToast(message)
  }
  async function toggleFlightPaid(f: Flight) {
    const message = await t.setFlightPaid(f.id, !f.paid)
    if (message) showToast(message)
  }

  const title =
    sheet?.kind === 'new-flight'
      ? 'Nuovo volo'
      : sheet?.kind === 'edit-flight'
        ? 'Modifica volo'
        : sheet?.kind === 'new-transport'
          ? 'Nuovo trasporto'
          : 'Modifica trasporto'

  return (
    <>
      <PageHeader title="Trasporti e voli" subtitle="Voli con scali, treni e spostamenti" back={{ href: '/altro', label: 'Altro' }} />
      <div class="space-y-6 px-4">
        <section aria-label="Voli" class="space-y-3">
          <h2 class="font-display text-lg font-semibold">Voli</h2>
          {trip.flights.length === 0 && (
            <EmptyState title="Nessun volo" text="Aggiungi andata e ritorno con tutte le tratte: durate e scali si calcolano da soli." />
          )}
          {trip.flights.map((f) => (
            <FlightCard key={f.id} flight={f} onEdit={() => setSheet({ kind: 'edit-flight', flight: f })} onTogglePaid={() => void toggleFlightPaid(f)} />
          ))}
          <button
            type="button"
            onClick={() => setSheet({ kind: 'new-flight' })}
            class="min-h-12 w-full rounded-full border border-line px-6 font-medium"
          >
            + Aggiungi volo
          </button>
        </section>

        <section aria-label="Treni e spostamenti" class="space-y-3">
          <h2 class="font-display text-lg font-semibold">Treni e spostamenti</h2>
          {trip.transports.length === 0 && (
            <EmptyState title="Nessun trasporto" text="Treni, pass metro, bus e taxi: orari, costo e se il biglietto è già comprato." />
          )}
          <ul class="space-y-3">
            {trip.transports.map((x) => (
              <li>
                <Card>
                  <button type="button" onClick={() => setSheet({ kind: 'edit-transport', transport: x })} class="block w-full text-left">
                    <span class="flex items-start justify-between gap-3">
                      <span class="min-w-0">
                        <span class="block truncate font-semibold">
                          {x.from} → {x.to}
                        </span>
                        <span class="block text-sm text-muted">
                          {MODE_LABEL[x.mode]}
                          {x.departAt && ` · ${formatDateInZone(x.departAt, trip.timezone)} ${formatInZone(x.departAt, trip.timezone)}`}
                          {x.arriveAt && `–${formatInZone(x.arriveAt, trip.timezone)}`}
                        </span>
                      </span>
                      <span class="shrink-0 text-xs font-medium text-accent">Modifica</span>
                    </span>
                    {(x.cost != null || x.refCode) && (
                      <span class="mt-1 block text-sm">
                        {x.cost != null && (
                          <>
                            <span class="font-semibold">{formatMoney(x.cost, x.currency)}</span>
                            <span class="text-muted"> {scopeText(x.scope)}</span>
                          </>
                        )}
                        {x.refCode && <span class="text-muted">{x.cost != null ? ' · ' : ''}Cod. {x.refCode}</span>}
                      </span>
                    )}
                  </button>
                  <div class="mt-3">
                    <FlagPill on={x.bought} label="Acquistato" onClick={() => void toggleBought(x)} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setSheet({ kind: 'new-transport' })}
            class="min-h-12 w-full rounded-full bg-accent px-6 font-semibold text-accent-ink"
          >
            + Aggiungi trasporto
          </button>
        </section>
      </div>

      <Sheet open={sheet !== null} title={title} onClose={close}>
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
        {sheet?.kind === 'new-transport' && (
          <TransportForm trip={trip} onSubmit={(i) => t.createTransport(trip.id, i)} onDone={close} />
        )}
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
    </>
  )
}

function FlightCard({ flight, onEdit, onTogglePaid }: { flight: Flight; onEdit: () => void; onTogglePaid: () => void }) {
  const times = flight.legs.map((l) => ({ depart: l.departAt, arrive: l.arriveAt }))
  return (
    <Card>
      <button type="button" onClick={onEdit} class="block w-full text-left">
        <span class="flex items-start justify-between gap-3">
          <span class="min-w-0">
            <span class="block truncate font-semibold">{flight.title}</span>
            <span class="block text-sm text-muted">
              {[flight.airline, flight.bookingRef && `Cod. ${flight.bookingRef}`].filter(Boolean).join(' · ') || 'Volo'}
            </span>
          </span>
          <span class="shrink-0 text-xs font-medium text-accent">Modifica</span>
        </span>
      </button>

      <ol class="mt-3 space-y-0">
        {flight.legs.map((l, i) => {
          const off = dayOffset(times[i], l.fromTz, l.toTz)
          return (
            <li>
              {i > 0 && (
                <p class="my-2 rounded-xl bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent">
                  Scalo a {l.from}: {formatDuration(layover(times[i - 1], times[i]))}
                </p>
              )}
              <div class="flex items-start gap-3">
                <span aria-hidden="true" class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />
                <div class="min-w-0 flex-1">
                  <p class="font-medium">
                    {l.from} → {l.to}
                    {l.flightNumber && <span class="text-sm font-normal text-muted"> · {l.flightNumber}</span>}
                  </p>
                  <p class="text-sm text-muted tabular-nums">
                    {formatDateInZone(l.departAt, l.fromTz)} {formatInZone(l.departAt, l.fromTz)} → {formatInZone(l.arriveAt, l.toTz)}
                    {off !== 0 && <sup class="ml-0.5 font-medium text-warn">{off > 0 ? `+${off}` : off}</sup>}
                    {' · '}
                    {formatDuration(legDuration(times[i]))}
                  </p>
                  {(l.seats || l.cabin) && <p class="text-xs text-muted">{[l.cabin, l.seats && `posti ${l.seats}`].filter(Boolean).join(' · ')}</p>}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        {flight.legs.length > 1 && (
          <span class="text-xs text-muted">Totale in viaggio {formatDuration(totalTravelTime(times))}</span>
        )}
        {flight.cost != null && (
          <span class="ml-auto text-sm">
            <span class="font-semibold">{formatMoney(flight.cost, flight.currency)}</span>
            <span class="text-muted"> {scopeText(flight.scope)}</span>
          </span>
        )}
      </div>
      <div class="mt-2">
        <FlagPill on={flight.paid} label="Pagato" onClick={onTogglePaid} />
      </div>
    </Card>
  )
}
