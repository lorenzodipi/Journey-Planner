import { useState } from 'preact/hooks'
import { dayOffset, formatDateInZone, formatDuration, formatInZone, layover, legDuration, totalTravelTime } from '../lib/flights'
import { formatWhen, earliestFirst, transportWhen, whenKey } from '../lib/logistics'
import { convert, formatMoney, rateFor } from '../lib/money'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { ComponentChildren } from 'preact'
import type { Flight, Transport } from '../types'
import { TrashButton } from '../ui/ConfirmDialog'
import { FlightForm } from '../ui/FlightForm'
import { CardDetail, useOpenCard } from '../ui/CardDetail'
import { ChevronDownIcon, ChevronRightIcon, PlaneIcon } from '../ui/Icons'
import { MovementIcon } from '../ui/MovementIcon'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { Disc, Fab, Tag, Ticket } from '../ui/Ticket'
import { Sheet } from '../ui/Sheet'
import { MODE_LABEL, TransportForm } from '../ui/TransportForm'
import { useDeleter } from '../ui/useDeleter'

function transportRows(x: Transport, tz: string, days: { id: string; date: string }[], trip: { baseCurrency: string; localCurrency?: string; fxRate?: number; fxRates?: Record<string, number> }) {
  const rows: { label: string; value: ComponentChildren }[] = [{ label: 'Mezzo', value: MODE_LABEL[x.mode] }]
  const { depart, arrive } = transportWhen(x, tz, days)
  if (depart) rows.push({ label: 'Partenza', value: formatWhen(depart, tz) })
  if (arrive) rows.push({ label: 'Arrivo', value: formatWhen(arrive, tz) })
  if (x.refCode) rows.push({ label: 'Codice', value: <span class="tracking-[1.5px]">{x.refCode}</span> })
  if (x.cost != null) {
    const rate = trip.baseCurrency !== x.currency ? rateFor(trip, x.currency) : undefined
    const approx = rate ? convert(x.cost, rate) : null
    rows.push({
      label: x.scope === 'per_person' ? 'Costo a persona' : 'Costo totale',
      value: (
        <>
          {formatMoney(x.cost, x.currency)}
          {approx != null && <span class="block text-xs font-normal text-muted">≈ {formatMoney(approx, trip.baseCurrency)}</span>}
        </>
      ),
    })
  }
  return rows
}

type SheetState =
  | { kind: 'choose' }
  | { kind: 'new-flight' }
  | { kind: 'edit-flight'; flight: Flight }
  | { kind: 'new-transport' }
  | { kind: 'edit-transport'; transport: Transport }
  | null

export function Trasporti() {
  const trip = useTrip()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)
  const [openId, toggle] = useOpenCard()

  const title =
    sheet?.kind === 'choose'
      ? 'Nuovo trasporto'
      : sheet?.kind === 'new-flight'
      ? 'Nuovo volo'
      : sheet?.kind === 'edit-flight'
        ? 'Modifica volo'
        : sheet?.kind === 'new-transport'
          ? 'Nuovo trasporto'
          : 'Modifica trasporto'

  // voli in alto e gli altri trasporti sotto; in ogni gruppo in ordine di data e ora, il primo in alto
  const flights = earliestFirst(trip.flights, (f) => f.legs[0]?.departAt ?? '')
  const transports = earliestFirst(trip.transports, (x) => whenKey(transportWhen(x, trip.timezone, trip.days).depart))

  const notBought = trip.transports.filter((x) => !x.bought).length + trip.flights.filter((f) => !f.paid).length
  const count = trip.transports.length + trip.flights.length
  const subtitle = count === 0 ? 'Voli, treni e spostamenti' : `${count} ${count === 1 ? 'voce' : 'voci'}${notBought > 0 ? ` · ${notBought} non ${notBought === 1 ? 'acquistato' : 'acquistati'}` : ''}`

  return (
    <>
      <PageHeader title="Trasporti" subtitle={subtitle} back={{ href: '/altro', label: 'Altro' }} />
      <div class="px-5 pb-28">
        {count === 0 && <EmptyState title="Nessun trasporto" text="Voli con scali, treni, pass metro, bus e taxi: orari, costo e se il biglietto è già comprato." />}
        <ul class="mt-1 space-y-3.5">
          {flights.map((f) => (
            <li key={f.id}>
              <FlightCard
                flight={f}
                onEdit={() => setSheet({ kind: 'edit-flight', flight: f })}
                onDelete={() =>
                  void del({
                    title: `Eliminare «${f.title}»?`,
                    text: 'Saranno tolte anche le tratte. Puoi annullare subito dopo.',
                    done: 'Volo eliminato',
                    run: () => t.setFlightDeleted(f.id, true),
                    undo: () => t.setFlightDeleted(f.id, false),
                  })
                }
              />
            </li>
          ))}
          {transports.map((x) => (
            <li key={x.id}>
              <Ticket
                tone={x.bought ? 'line' : 'warn'}
                stubWidth={76}
                stub={
                  <Disc color={x.bought ? 'var(--ok)' : 'var(--warn)'}>
                    <MovementIcon event={{ kind: 'transport', mode: x.mode, title: '' }} size={22} />
                  </Disc>
                }
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-start gap-1">
                    <button type="button" onClick={() => toggle(x.id)} aria-expanded={openId === x.id} aria-label={`${openId === x.id ? 'Chiudi' : 'Apri'} ${x.from} → ${x.to}`} class="flex min-w-0 flex-1 items-center gap-1 text-left">
                      <span class="min-w-0 flex-1">
                        <span class="flex flex-wrap items-center gap-x-2 text-lg font-extrabold leading-tight">
                          {x.from}
                          <ChevronRightIcon size={16} class="shrink-0 text-pale" />
                          {x.to}
                        </span>
                        <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span class="text-[13px] text-muted">
                            {[MODE_LABEL[x.mode], (() => {
                              const { depart } = transportWhen(x, trip.timezone, trip.days)
                              return depart ? formatWhen(depart, trip.timezone, ' ') : ''
                            })()].filter(Boolean).join(' · ')}
                          </span>
                          <Tag tone={x.bought ? 'ok' : 'warn'}>{x.bought ? 'Acquistato' : 'Non acquistato'}</Tag>
                        </span>
                      </span>
                      <ChevronDownIcon size={20} class={`shrink-0 text-muted transition-transform ${openId === x.id ? 'rotate-180' : ''}`} />
                    </button>
                  <TrashButton
                    label={`Elimina ${x.from} → ${x.to}`}
                    onClick={() =>
                      void del({
                        title: `Eliminare «${x.from} → ${x.to}»?`,
                        done: 'Trasporto eliminato',
                        run: () => t.setTransportDeleted(x.id, true),
                        undo: () => t.setTransportDeleted(x.id, false),
                      })
                    }
                  />
                  </div>
                  {openId === x.id && (
                    <CardDetail rows={transportRows(x, trip.timezone, trip.days, trip)} note={x.notes} editLabel={`Modifica ${x.from} → ${x.to}`} onEdit={() => setSheet({ kind: 'edit-transport', transport: x })} />
                  )}
                </div>
              </Ticket>
            </li>
          ))}
        </ul>
      </div>

      <Fab label="Trasporto" wide onClick={() => setSheet({ kind: 'choose' })} />

      {delDialog}
      <Sheet open={sheet !== null} title={title} onClose={close}>
        {sheet?.kind === 'choose' && (
          <div class="space-y-3" role="group" aria-label="Che tipo di trasporto">
            <p class="-mt-2 text-sm text-muted">Che cosa aggiungi?</p>
            {(
              [
                { kind: 'new-flight', label: 'Volo', hint: 'Con scali, orari e fusi orari', icon: <PlaneIcon size={26} /> },
                { kind: 'new-transport', label: 'Altro trasporto', hint: 'Treno, bus, metro, taxi, traghetto…', icon: <MovementIcon event={{ kind: 'transport', mode: 'train', title: '' }} size={26} /> },
              ] as const
            ).map((o) => (
              <button
                type="button"
                key={o.kind}
                onClick={() => setSheet({ kind: o.kind })}
                class="flex min-h-[72px] w-full items-center gap-4 rounded-[14px] border-2 border-line bg-surface-2 px-4 text-left"
              >
                <span class="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-pale">{o.icon}</span>
                <span class="min-w-0 flex-1">
                  <span class="block text-lg font-extrabold leading-tight">{o.label}</span>
                  <span class="block text-sm text-muted">{o.hint}</span>
                </span>
                <ChevronRightIcon size={18} class="shrink-0 text-muted" />
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

function FlightCard({ flight, onEdit, onDelete }: { flight: Flight; onEdit: () => void; onDelete: () => void }) {
  const times = flight.legs.map((l) => ({ depart: l.departAt, arrive: l.arriveAt }))
  return (
    <Ticket
      tone={flight.paid ? 'line' : 'warn'}
      stubWidth={76}
      stub={
        <Disc color={flight.paid ? 'var(--ok)' : 'var(--warn)'}>
          <PlaneIcon size={22} />
        </Disc>
      }
    >
      <div class="min-w-0 flex-1">
        <div class="flex items-start gap-1">
          <button type="button" onClick={onEdit} aria-label={`Modifica ${flight.title}`} class="min-w-0 flex-1 text-left">
            <span class="block text-lg font-extrabold leading-tight">{flight.title}</span>
            <span class="block text-[13px] text-muted">{[flight.airline, flight.bookingRef && `Cod. ${flight.bookingRef}`].filter(Boolean).join(' · ') || 'Volo'}</span>
          </button>
          <TrashButton label={`Elimina ${flight.title}`} onClick={onDelete} />
        </div>
        <ol class="mt-1 space-y-1.5">
          {flight.legs.map((l, i) => {
            const off = dayOffset(times[i], l.fromTz, l.toTz)
            return (
              <li>
                {i > 0 && (
                  <p class="mb-1.5 inline-block rounded-md border-2 border-dashed border-line px-1.5 text-xs font-extrabold text-pale">
                    Scalo a {l.from}: {formatDuration(layover(times[i - 1], times[i]))}
                  </p>
                )}
                <p class="text-sm font-extrabold">
                  {l.from} → {l.to}
                  {l.flightNumber && <span class="font-normal text-muted"> · {l.flightNumber}</span>}
                </p>
                <p class="text-xs tabular-nums text-muted">
                  {formatDateInZone(l.departAt, l.fromTz)} {formatInZone(l.departAt, l.fromTz)} → {formatInZone(l.arriveAt, l.toTz)}
                  {off !== 0 && <sup class="ml-0.5 font-extrabold text-warn">{off > 0 ? `+${off}` : off}</sup>}
                  {' · '}
                  {formatDuration(legDuration(times[i]))}
                  {(l.seats || l.cabin) && ` · ${[l.cabin, l.seats && `posti ${l.seats}`].filter(Boolean).join(' · ')}`}
                </p>
              </li>
            )
          })}
        </ol>
        {flight.notes && <p class="mt-2 whitespace-pre-line pr-2 text-xs text-muted">{flight.notes}</p>}
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <Tag tone={flight.paid ? 'ok' : 'warn'}>{flight.paid ? 'Acquistato' : 'Non acquistato'}</Tag>
          {flight.legs.length > 1 && <span class="text-xs text-muted">In viaggio {formatDuration(totalTravelTime(times))}</span>}
          {flight.cost != null && (
            <span class="ml-auto pr-2 text-sm">
              <span class="font-extrabold">{formatMoney(flight.cost, flight.currency)}</span>
              <span class="text-muted"> {flight.scope === 'per_person' ? 'a persona' : 'totale'}</span>
            </span>
          )}
        </div>
      </div>
    </Ticket>
  )
}
