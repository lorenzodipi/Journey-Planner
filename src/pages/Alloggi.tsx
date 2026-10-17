import { useState } from 'preact/hooks'
import { formatDay, formatShort } from '../lib/dates'
import { formatMoney, perPerson, sumByCurrency } from '../lib/money'
import { nightsOf, overlappingStays, uncoveredNights } from '../lib/stays'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Stay } from '../types'
import { FlagPill } from '../ui/FlagPill'
import { Sheet } from '../ui/Sheet'
import { StayForm } from '../ui/StayForm'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'

type SheetState = { kind: 'new' } | { kind: 'edit'; stay: Stay } | null

function mapsHref(s: Stay): string | null {
  if (s.mapsUrl) return s.mapsUrl
  const q = [s.name, s.address, s.city].filter(Boolean).join(' ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}

export function Alloggi() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)
  const persons = Math.max(1, trip.travelers.length)

  const nights = trip.stays.reduce((n, s) => n + nightsOf(s), 0)
  const costed = trip.stays.filter((s) => s.totalCost != null)
  const total = sumByCurrency(costed.map((s) => ({ amount: s.totalCost as number, currency: s.currency })))
  const toPay = sumByCurrency(costed.filter((s) => !s.paid).map((s) => ({ amount: s.totalCost as number, currency: s.currency })))
  const gaps = uncoveredNights(trip.startDate, trip.endDate, trip.stays)
  const overlaps = overlappingStays(trip.stays)

  async function flag(s: Stay, which: 'booked' | 'paid') {
    const message = await t.setStayFlag(s.id, which, !s[which])
    if (message) showToast(message)
  }

  return (
    <>
      <PageHeader
        title="Alloggi"
        subtitle={trip.stays.length ? `${trip.stays.length} ${trip.stays.length === 1 ? 'alloggio' : 'alloggi'} · ${nights} ${nights === 1 ? 'notte' : 'notti'}` : 'Hotel e case prenotate'}
        back={{ href: '/altro', label: 'Altro' }}
      />
      <div class="space-y-3 px-4">
        {trip.stays.length > 0 && (
          <Card>
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt class="text-muted">Costo totale</dt>
                <dd class="font-semibold">{total.length ? total.map((x) => formatMoney(x.amount, x.currency)).join(' + ') : '—'}</dd>
              </div>
              <div>
                <dt class="text-muted">Da pagare</dt>
                <dd class="font-semibold">{toPay.length ? toPay.map((x) => formatMoney(x.amount, x.currency)).join(' + ') : 'Tutto pagato'}</dd>
              </div>
            </dl>
            {gaps.length > 0 && (
              <p class="mt-3 text-xs text-muted">
                Notti senza alloggio: {gaps.map(formatShort).join(', ')} (ok se sei in volo o in treno di notte).
              </p>
            )}
            {overlaps.length > 0 && (
              <p role="alert" class="mt-2 text-xs text-warn">
                Attenzione: {overlaps.map(([a, b]) => `${trip.stays[a].name} e ${trip.stays[b].name}`).join('; ')} si sovrappongono.
              </p>
            )}
          </Card>
        )}

        {trip.stays.length === 0 ? (
          <EmptyState title="Nessun alloggio" text="Aggiungi hotel e case con date, costo e stato di prenotazione." />
        ) : (
          <ul class="space-y-3">
            {trip.stays.map((s) => {
              const n = nightsOf(s)
              const href = mapsHref(s)
              const per = s.totalCost != null ? perPerson(s.totalCost, 'total', persons) : null
              return (
                <li>
                  <Card>
                    <button type="button" onClick={() => setSheet({ kind: 'edit', stay: s })} class="block w-full text-left">
                      <span class="flex items-start justify-between gap-3">
                        <span class="min-w-0">
                          <span class="block truncate font-semibold">{s.name}</span>
                          <span class="block text-sm text-muted">
                            {s.city && `${s.city} · `}
                            {formatDay(s.checkIn)} → {formatDay(s.checkOut)} · {n} {n === 1 ? 'notte' : 'notti'}
                          </span>
                        </span>
                        <span class="shrink-0 text-xs font-medium text-accent">Modifica</span>
                      </span>
                      {(s.checkInInfo || s.checkOutInfo) && (
                        <span class="mt-1 block text-xs text-muted">
                          {s.checkInInfo && `Check-in ${s.checkInInfo}`}
                          {s.checkInInfo && s.checkOutInfo && ' · '}
                          {s.checkOutInfo && `Check-out ${s.checkOutInfo}`}
                        </span>
                      )}
                      {(s.breakfast || s.kitchen) && (
                        <span class="mt-1 block text-xs text-muted">
                          {[s.breakfast && 'Colazione', s.kitchen && 'Cucina'].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {s.totalCost != null && (
                        <span class="mt-2 block text-sm">
                          <span class="font-semibold">{formatMoney(s.totalCost, s.currency)}</span>
                          <span class="text-muted">
                            {' '}
                            · {formatMoney(per as number, s.currency)} a persona
                            {n > 0 && ` · ${formatMoney(Math.round(((per as number) / n) * 100) / 100, s.currency)} a notte`}
                          </span>
                        </span>
                      )}
                    </button>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                      <FlagPill on={s.booked} label="Prenotato" onClick={() => void flag(s, 'booked')} />
                      <FlagPill on={s.paid} label="Pagato" onClick={() => void flag(s, 'paid')} />
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          class="ml-auto inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-accent"
                        >
                          Apri in Maps
                        </a>
                      )}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setSheet({ kind: 'new' })}
          class="min-h-12 w-full rounded-full bg-accent px-6 font-semibold text-accent-ink"
        >
          + Aggiungi alloggio
        </button>
      </div>

      <Sheet open={sheet !== null} title={sheet?.kind === 'new' ? 'Nuovo alloggio' : 'Modifica alloggio'} onClose={close}>
        {sheet?.kind === 'new' && <StayForm trip={trip} onSubmit={(i) => t.createStay(trip.id, i)} onDone={close} />}
        {sheet?.kind === 'edit' && (
          <StayForm
            key={sheet.stay.id}
            trip={trip}
            initial={sheet.stay}
            onSubmit={(i) => t.updateStay(sheet.stay.id, i)}
            onDelete={async () => {
              const id = sheet.stay.id
              const message = await t.setStayDeleted(id, true)
              if (!message) showToast('Alloggio eliminato', { label: 'Annulla', run: () => void t.setStayDeleted(id, false) })
              return message
            }}
            onDone={close}
          />
        )}
      </Sheet>
    </>
  )
}
