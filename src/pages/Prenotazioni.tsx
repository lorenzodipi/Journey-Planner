import { useEffect, useState } from 'preact/hooks'
import { BOOKING_LABEL } from '../lib/bookingMeta'
import { isFileCached, openBookingFile } from '../lib/bookingFiles'
import { dateInZone } from '../lib/flights'
import { formatShort } from '../lib/dates'
import { safeUrl } from '../lib/planningData'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Booking } from '../types'
import { BookingForm } from '../ui/BookingForm'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'

type SheetState = { kind: 'new' } | { kind: 'edit'; booking: Booking } | null

export function Prenotazioni() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [cached, setCached] = useState<Set<string>>(new Set())
  const close = () => setSheet(null)

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

  return (
    <>
      <PageHeader title="Prenotazioni" subtitle="Codici, link e biglietti" back={{ href: '/altro', label: 'Altro' }} />
      <div class="space-y-3 px-4" style={{ paddingBottom: '5rem' }}>
        {trip.bookings.length === 0 ? (
          <EmptyState title="Nessuna prenotazione" text="Aggiungi codici di conferma, link e il PDF dei biglietti: quelli marcati offline si aprono anche senza rete." />
        ) : (
          trip.bookings.map((b) => {
            const link = b.url ? safeUrl(b.url) : null
            const when = range(b)
            return (
              <Card>
                <div class="flex items-start gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium uppercase tracking-wide text-muted">{BOOKING_LABEL[b.type]}{when && ` · ${when}`}</p>
                    <h2 class="font-display text-lg font-semibold leading-tight">{b.title}</h2>
                  </div>
                  <button type="button" onClick={() => setSheet({ kind: 'edit', booking: b })} class="min-h-11 shrink-0 rounded-full px-3 text-sm font-medium text-accent">
                    Modifica
                  </button>
                </div>
                {b.code && (
                  <button
                    type="button"
                    onClick={() => void copy(b.code as string)}
                    aria-label={`Copia il codice ${b.code}`}
                    class="mt-2 flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl bg-bg px-4 text-left"
                  >
                    <span class="font-mono text-lg font-semibold tracking-wider">{b.code}</span>
                    <span class="text-xs font-medium text-accent">Copia</span>
                  </button>
                )}
                {b.notes && <p class="mt-2 whitespace-pre-line text-sm text-muted">{b.notes}</p>}
                {(link || b.filePath) && (
                  <div class="mt-3 flex flex-wrap gap-2">
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium">
                        Apri link
                      </a>
                    )}
                    {b.filePath && (
                      <button type="button" onClick={() => void open(b)} class="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
                        Apri file
                        {cached.has(b.filePath) && <span class="rounded-full bg-accent-ink/20 px-2 py-0.5 text-[11px] font-medium">offline</span>}
                      </button>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => setSheet({ kind: 'new' })}
        aria-label="Aggiungi prenotazione"
        class="fixed right-4 z-20 flex min-h-14 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-ink shadow-card"
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
      >
        <span aria-hidden="true" class="text-2xl leading-none">+</span>
        Prenotazione
      </button>

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
