import { useEffect, useState } from 'preact/hooks'
import { BOOKING_BUDGET_CATEGORY, BOOKING_LABEL } from '../lib/bookingMeta'
import { formatMoney } from '../lib/money'
import { isFileCached, openBookingFile } from '../lib/bookingFiles'
import { dateInZone } from '../lib/flights'
import { formatShort } from '../lib/dates'
import { formatDateInZone, formatInZone } from '../lib/flights'
import { safeUrl } from '../lib/planningData'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { ComponentChildren } from 'preact'
import type { Booking, Traveler } from '../types'
import { BookingForm } from '../ui/BookingForm'
import { CardDetail, useOpenCard } from '../ui/CardDetail'
import { BedIcon, ChevronDownIcon, CloudIcon, CopyIcon, FileIcon, PlaneIcon, ShieldIcon, SimIcon, TicketIcon, TrainCarIcon } from '../ui/Icons'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { Disc, Fab, Tag, Ticket } from '../ui/Ticket'
import { Sheet } from '../ui/Sheet'

function bookingRows(b: Booking, tz: string, link: string | null, offline: boolean, travelers: readonly Traveler[]) {
  const rows: { label: string; value: ComponentChildren }[] = [{ label: 'Tipo', value: BOOKING_LABEL[b.type] }]
  const when = (iso: string) => {
    const time = formatInZone(iso, tz)
    return time === '00:00' ? formatDateInZone(iso, tz) : `${formatDateInZone(iso, tz)} · ${time}`
  }
  if (b.validFrom) rows.push({ label: 'Valido dal', value: when(b.validFrom) })
  if (b.validTo) rows.push({ label: 'Valido fino al', value: when(b.validTo) })
  if (b.cost != null) {
    const amount = formatMoney(b.cost, b.currency ?? 'EUR')
    rows.push({ label: 'Costo', value: b.scope === 'total' ? `${amount} in totale` : `${amount} a persona` })
    const payers = travelers.filter((t) => b.payerIds?.includes(t.id))
    if (payers.length > 0 && payers.length < travelers.length) rows.push({ label: 'Pagato da', value: payers.map((t) => t.name).join(', ') })
    rows.push({ label: 'Nel Budget', value: BOOKING_BUDGET_CATEGORY[b.type] })
  }
  if (link) rows.push({ label: 'Link', value: <span class="break-all">{new URL(link).host}</span> })
  if (b.filePath) rows.push({ label: 'File', value: offline ? 'Salvato sul telefono' : 'Si scarica quando lo apri' })
  return rows
}

type SheetState = { kind: 'new' } | { kind: 'edit'; booking: Booking } | null

export function Prenotazioni() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [cached, setCached] = useState<Set<string>>(new Set())
  const close = () => setSheet(null)
  const [openId, toggle] = useOpenCard()

  // quali file sono già salvati sul telefono (si aggiorna quando cambiano le prenotazioni)
  const fileKey = trip.bookings.map((b) => b.filePath ?? '').join('|')
  useEffect(() => {
    let active = true
    void Promise.all(trip.bookings.filter((b) => b.filePath).map(async (b) => ((await isFileCached(b.filePath as string)) ? (b.filePath as string) : null))).then(
      (list) => active && setCached(new Set(list.filter((x): x is string => !!x))),
    )
    return () => {
      active = false
    }
  }, [fileKey, t.stale])

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      showToast('Codice copiato')
    } catch {
      showToast('Non riesco a copiare: tieni premuto sul codice per selezionarlo.')
    }
  }

  async function open(b: Booking) {
    try {
      await openBookingFile(b.filePath as string)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Non riesco ad aprire il file.')
    }
  }

  const range = (b: Booking) => {
    const from = b.validFrom ? dateInZone(b.validFrom, trip.timezone) : null
    const to = b.validTo ? dateInZone(b.validTo, trip.timezone) : null
    if (from && to) return from === to ? formatShort(from) : `${formatShort(from)} – ${formatShort(to)}`
    if (from) return `dal ${formatShort(from)}`
    if (to) return `fino al ${formatShort(to)}`
    return null
  }

  const ICON: Record<Booking['type'], typeof PlaneIcon> = {
    flight: PlaneIcon,
    hotel: BedIcon,
    train: TrainCarIcon,
    ticket: TicketIcon,
    insurance: ShieldIcon,
    esim: SimIcon,
    other: FileIcon,
  }

  return (
    <>
      <PageHeader title="Prenotazioni" subtitle="Codici, link e biglietti" back={{ href: '/altro', label: 'Altro' }} />
      <div class="px-5 pb-28">
        {trip.bookings.length === 0 ? (
          <EmptyState title="Nessuna prenotazione" text="Aggiungi codici di conferma, link e il PDF dei biglietti: quelli marcati offline si aprono anche senza rete." />
        ) : (
          <ul class="mt-1 space-y-3.5">
            {trip.bookings.map((b) => {
              const link = b.url ? safeUrl(b.url) : null
              const when = range(b)
              const ok = Boolean(b.code || b.filePath || link)
              const Icon = ICON[b.type]
              const isOpen = openId === b.id
              const offline = b.filePath ? cached.has(b.filePath) : false
              return (
                <li>
                  <Ticket
                    tone={ok ? 'line' : 'warn'}
                    stub={
                      <div class="flex flex-col items-center gap-1">
                        <Disc color={ok ? 'var(--ok)' : 'var(--warn)'}>
                          <Icon size={22} />
                        </Disc>
                        <span class="text-[10px] font-extrabold text-muted">{BOOKING_LABEL[b.type]}</span>
                      </div>
                    }
                  >
                    <div class="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggle(b.id)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? 'Chiudi' : 'Apri'} ${b.title}`}
                        class="flex w-full min-w-0 items-center gap-1 text-left"
                      >
                        <span class="min-w-0 flex-1">
                          <span class="block text-[17px] font-extrabold leading-tight">{b.title}</span>
                          {when && <span class="mt-0.5 block text-[13px] text-muted">{when}</span>}
                        </span>
                        <ChevronDownIcon size={20} class={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <div class="mt-1.5 flex flex-wrap items-center gap-2">
                        {b.code ? (
                          <span class="rounded-md border-2 border-dashed border-line px-1.5 text-sm font-extrabold tracking-[1.5px] text-pale">{b.code}</span>
                        ) : (
                          !link && !b.filePath && <Tag tone="warn">Da prenotare</Tag>
                        )}
                        {offline && (
                          <span class="inline-flex items-center gap-1 text-xs font-extrabold text-ok">
                            <CloudIcon size={14} />
                            Offline
                          </span>
                        )}
                        {link && (
                          <a href={link} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center text-sm font-extrabold text-pale">
                            Apri link
                          </a>
                        )}
                        {b.filePath && (
                          <button type="button" onClick={() => void open(b)} class="inline-flex min-h-11 items-center text-sm font-extrabold text-pale">
                            Apri file
                          </button>
                        )}
                      </div>
                      {isOpen && (
                        <CardDetail rows={bookingRows(b, trip.timezone, link, offline, trip.travelers)} note={b.notes} editLabel={`Modifica ${b.title}`} onEdit={() => setSheet({ kind: 'edit', booking: b })} />
                      )}
                    </div>
                    {b.code ? (
                      <button type="button" onClick={() => void copy(b.code as string)} aria-label={`Copia il codice ${b.code}`} class="grid size-11 shrink-0 self-start place-items-center text-muted">
                        <CopyIcon size={20} />
                      </button>
                    ) : null}
                  </Ticket>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Fab label="Prenotazione" wide onClick={() => setSheet({ kind: 'new' })} />

      <Sheet open={sheet !== null} title={sheet?.kind === 'new' ? 'Nuova prenotazione' : 'Modifica prenotazione'} onClose={close}>
        {sheet?.kind === 'new' && <BookingForm trip={trip} onSubmit={(i) => t.createBooking(trip.id, i)} onDone={close} />}
        {sheet?.kind === 'edit' && (
          <BookingForm
            key={sheet.booking.id}
            trip={trip}
            initial={sheet.booking}
            onSubmit={(i) => t.updateBooking(trip.id, sheet.booking, i)}
            onDelete={async () => {
              const id = sheet.booking.id
              const message = await t.setBookingDeleted(id, true)
              if (!message) showToast('Prenotazione eliminata', { label: 'Annulla', run: () => void t.setBookingDeleted(id, false) })
              return message
            }}
            onDone={close}
          />
        )}
      </Sheet>
    </>
  )
}
