import { useState } from 'preact/hooks'
import { formatDay, formatShort } from '../lib/dates'
import { convert, formatMoney } from '../lib/money'
import { nightsOf, overlappingStays, uncoveredNights } from '../lib/stays'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { ComponentChildren } from 'preact'
import type { Stay, Trip } from '../types'
import { TrashButton } from '../ui/ConfirmDialog'
import { Sheet } from '../ui/Sheet'
import { StayForm } from '../ui/StayForm'
import { CardDetail, useOpenCard } from '../ui/CardDetail'
import { ChevronDownIcon, PinOutIcon } from '../ui/Icons'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { Fab, Tag, Ticket } from '../ui/Ticket'
import { useDeleter } from '../ui/useDeleter'

type SheetState = { kind: 'new' } | { kind: 'edit'; stay: Stay } | null

function stayRows(s: Stay, trip: Trip) {
  const rows: { label: string; value: ComponentChildren }[] = [
    { label: 'Check-in', value: [formatDay(s.checkIn), s.checkInInfo].filter(Boolean).join(' · ') },
    { label: 'Check-out', value: [formatDay(s.checkOut), s.checkOutInfo].filter(Boolean).join(' · ') },
  ]
  if (s.address) rows.push({ label: 'Indirizzo', value: s.address })
  if (s.totalCost != null) {
    const approx = s.currency === trip.localCurrency && trip.fxRate && trip.baseCurrency !== s.currency ? convert(s.totalCost, trip.fxRate) : null
    rows.push({
      label: 'Costo totale',
      value: (
        <>
          {formatMoney(s.totalCost, s.currency)}
          {approx != null && <span class="block text-xs font-normal text-muted">≈ {formatMoney(approx, trip.baseCurrency)}</span>}
        </>
      ),
    })
    if (trip.travelers.length > 1) rows.push({ label: 'A persona', value: formatMoney(s.totalCost / trip.travelers.length, s.currency) })
  }
  const included = [s.breakfast && 'Colazione', s.dinner && 'Cena', s.kitchen && 'Cucina'].filter(Boolean)
  rows.push({ label: 'Include', value: included.length ? included.join(', ') : 'Solo pernottamento' })
  rows.push({ label: 'Pagamento', value: <Tag tone={s.paid ? 'ok' : 'warn'}>{s.paid ? 'Pagato' : 'Da pagare'}</Tag> })
  return rows
}

function mapsHref(s: Stay): string | null {
  if (s.mapsUrl) return s.mapsUrl
  const q = [s.name, s.address, s.city].filter(Boolean).join(' ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}

export function Alloggi() {
  const trip = useTrip()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)
  const [openId, toggle] = useOpenCard()

  const nights = trip.stays.reduce((n, s) => n + nightsOf(s), 0)
  const gaps = uncoveredNights(trip.startDate, trip.endDate, trip.stays)
  const overlaps = overlappingStays(trip.stays)

  const cities = new Set(trip.stays.map((s) => s.city).filter(Boolean)).size

  return (
    <>
      <PageHeader
        title="Alloggi"
        subtitle={trip.stays.length ? `${nights} ${nights === 1 ? 'notte' : 'notti'} in ${cities || trip.stays.length} ${(cities || trip.stays.length) === 1 ? 'città' : 'città'}` : 'Hotel e case prenotate'}
        back={{ href: '/altro', label: 'Altro' }}
      />
      <div class="space-y-3.5 px-5 pb-24">
        {gaps.length > 0 && (
          <p class="rounded-2xl border-2 border-dashed border-line px-4 py-3 text-xs text-muted">
            Notti senza alloggio: {gaps.map(formatShort).join(', ')} (ok se sei in volo o in treno di notte).
          </p>
        )}
        {overlaps.length > 0 && (
          <p role="alert" class="rounded-2xl border-2 border-warn px-4 py-3 text-xs font-extrabold text-warn">
            Attenzione: {overlaps.map(([a, b]) => `${trip.stays[a].name} e ${trip.stays[b].name}`).join('; ')} si sovrappongono.
          </p>
        )}

        {trip.stays.length === 0 ? (
          <EmptyState title="Nessun alloggio" text="Aggiungi hotel e case con date, costo e stato di prenotazione." />
        ) : (
          <ul class="space-y-3.5">
            {trip.stays.map((s) => {
              const n = nightsOf(s)
              const href = mapsHref(s)
              const open = openId === s.id
              return (
                <li>
                  <Ticket
                    tone={s.booked ? 'line' : 'warn'}
                    stub={
                      <div>
                        <div class={`text-[34px] font-extrabold leading-[0.9] tabular-nums ${s.booked ? 'text-ok' : 'text-warn'}`}>{n}</div>
                        <div class="mt-0.5 text-xs text-muted">{n === 1 ? 'notte' : 'notti'}</div>
                      </div>
                    }
                  >
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggle(s.id)}
                          aria-expanded={open}
                          aria-label={`${open ? 'Chiudi' : 'Apri'} ${s.name}`}
                          class="flex min-w-0 flex-1 items-center gap-1 text-left"
                        >
                          <span class="min-w-0 flex-1">
                            <span class={`block text-[19px] font-extrabold leading-tight ${open ? '' : 'truncate'}`}>{s.name}</span>
                            <span class="mt-0.5 block text-[13px] text-muted">
                              {s.city && s.city !== s.name && `${s.city} · `}
                              {formatDay(s.checkIn)} → {formatDay(s.checkOut)}
                            </span>
                          </span>
                          <ChevronDownIcon size={20} class={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                        <TrashButton
                          label={`Elimina ${s.name}`}
                          onClick={() =>
                            void del({
                              title: `Eliminare «${s.name}»?`,
                              done: 'Alloggio eliminato',
                              run: () => t.setStayDeleted(s.id, true),
                              undo: () => t.setStayDeleted(s.id, false),
                            })
                          }
                        />
                      </div>
                      <div class="mt-0.5 flex items-center gap-2">
                        <Tag tone={s.booked ? 'ok' : 'warn'}>{s.booked ? 'Prenotato' : 'Non prenotato'}</Tag>
                        {href && (
                          <a href={href} target="_blank" rel="noreferrer" class="ml-auto inline-flex min-h-11 items-center gap-1 pr-3 text-sm font-extrabold text-pale">
                            <PinOutIcon size={18} />
                            Apri in Maps
                          </a>
                        )}
                      </div>
                      {open && (
                        <CardDetail rows={stayRows(s, trip)} note={s.notes} editLabel={`Modifica ${s.name}`} onEdit={() => setSheet({ kind: 'edit', stay: s })} />
                      )}
                    </div>
                  </Ticket>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Fab label="Alloggio" wide onClick={() => setSheet({ kind: 'new' })} />

      {delDialog}
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
