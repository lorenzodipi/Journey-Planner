import { useState } from 'react'
import { parseYmd } from '../lib/dates'
import { earliestFirst, formatWhen, transportWhen, whenKey } from '../lib/logistics'
import { formatMoney } from '../lib/money'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Transport, TransportMode } from '../types'
import { ART } from '../ui/art'
import { CheckG, ChevronRightG, ClockG, PlusG } from '../ui/glyphs'
import { MapsPill } from '../ui/MapsPill'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'
import { Ic } from '../ui/Sprite'
import { MODE_LABEL, TransportForm } from '../ui/TransportForm'

type SheetState =
  | { kind: 'choose' }
  | { kind: 'new-flight' }
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
    sheet?.kind === 'choose' ? 'Nuovo trasporto' : sheet?.kind === 'new-transport' ? 'Nuovo trasporto' : 'Modifica trasporto'

  // voli in alto e gli altri trasporti sotto; in ogni gruppo in ordine di data e ora, il primo in alto
  const transports = earliestFirst(trip.transports, (x) => whenKey(transportWhen(x, trip.timezone, trip.days).depart))
  const count = trip.transports.length
  const subtitle =
    count === 0
      ? 'Treni, pass e spostamenti'
      : `${transports.length} ${transports.length === 1 ? 'trasporto' : 'trasporti'}`

  return (
    <main className="screen">
      <PageHeader
        title="Trasporti"
        subtitle={subtitle}
        back={{ href: '/altro', label: 'Altro' }}
        actions={
          <button type="button" className="rbtn" aria-label="Aggiungi trasporto" onClick={() => setSheet({ kind: 'new-transport' })}>
            <PlusG />
          </button>
        }
      />

      {count === 0 && <EmptyState title="Nessun trasporto" text="Treni, pass metro, bus e taxi: orari, costo e se il biglietto è già comprato." art={ART.partenza} />}

      {transports.length > 0 && (
        <section aria-label="Treni e pass">
          <h2 className="h-md" style={{ marginBottom: '10px' }}>
            Trasporti
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
                <div className="tkwrap" key={x.id}>
                  <article className={`ct ${MODE_TINT[x.mode]}`} aria-label={`Modifica ${label}`} {...activate(() => setSheet({ kind: 'edit-transport', transport: x }))}>
                    <div className="cl">
                      <Ic name={MODE_ICON[x.mode]} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <p className="rt">
                          {MODE_LABEL[x.mode]} {label}
                        </p>
                        <p className="m">{sub}</p>
                        {x.bought ? (
                          <span className="sp ok">
                            <CheckG size={14} sw={3} />
                            Acquistato
                          </span>
                        ) : (
                          <span className="sp warn">
                            <ClockG size={14} sw={2.4} />
                            Da acquistare
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="cr2">
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
                  <div className="below">
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
            <p className="b-sm muted">Che cosa aggiungi?</p>
            {(
              [
                { kind: 'new-flight', label: 'Volo', hint: 'Con scali, orari e fusi orari', icon: 'i-tra-plane' },
                { kind: 'new-transport', label: 'Altro trasporto', hint: 'Treno, bus, metro, taxi, traghetto…', icon: 'i-tra-train' },
              ] as const
            ).map((o) => (
              <button type="button" key={o.kind} onClick={() => setSheet({ kind: o.kind })} className="card row" style={{ minHeight: '72px', textAlign: 'left', width: '100%' }}>
                <Ic name={o.icon} size={44} />
                <span className="grow">
                  <span className="tt" style={{ display: 'block', fontWeight: 700 }}>
                    {o.label}
                  </span>
                  <span className="mm" style={{ display: 'block' }}>
                    {o.hint}
                  </span>
                </span>
                <ChevronRightG />
              </button>
            ))}
          </div>
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
