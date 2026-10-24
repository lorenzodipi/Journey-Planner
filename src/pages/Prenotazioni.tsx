import { useEffect, useMemo, useState } from 'preact/hooks'
import { BOOKING_LABEL } from '../lib/bookingMeta'
import { isFileCached, openBookingFile } from '../lib/bookingFiles'
import { formatDay, formatShort, parseYmd } from '../lib/dates'
import { dateInZone, formatInZone } from '../lib/flights'
import { formatMoney } from '../lib/money'
import { safeUrl } from '../lib/planningData'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Booking } from '../types'
import { ART } from '../ui/art'
import { BookingForm } from '../ui/BookingForm'
import { CheckG, ChevronRightG, ClockG, PlusG } from '../ui/glyphs'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'
import { Ic } from '../ui/Sprite'

type SheetState = { kind: 'new' } | { kind: 'edit'; booking: Booking } | null
type Filter = 'all' | 'ok' | 'wait'

const ICON: Record<Booking['type'], string> = {
  flight: 'i-tra-plane',
  hotel: 'i-sez-bed',
  train: 'i-tra-train',
  ticket: 'i-sez-ticket',
  insurance: 'i-sez-file',
  esim: 'i-sez-file',
  other: 'i-sez-file',
}
const TINT: Record<Booking['type'], string> = {
  flight: 't-azzurro',
  hotel: 't-menta',
  train: 't-menta',
  ticket: 't-limone',
  insurance: 't-lavanda',
  esim: 't-lavanda',
  other: 't-azzurro',
}
const KIND: Record<Booking['type'], string> = {
  flight: 'Volo',
  hotel: 'Alloggio',
  train: 'Treno',
  ticket: 'Ingresso',
  insurance: 'Assicurazione',
  esim: 'eSIM / SIM',
  other: 'Documento',
}

/** Una prenotazione è «confermata» quando ha un codice, un link o un file; altrimenti è ancora in attesa. */
const confirmed = (b: Booking) => !!(b.code || b.url || b.filePath)

const activate = (fn: () => void) => ({
  role: 'button' as never,
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e: { key: string; preventDefault(): void; target: EventTarget | null; currentTarget: EventTarget | null }) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  },
})
const stop = (e: Event) => e.stopPropagation()

export function Prenotazioni() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [cached, setCached] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')
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

  const dateOf = (iso?: string) => (iso ? dateInZone(iso, trip.timezone) : null)
  const timeOf = (iso?: string) => {
    if (!iso) return null
    const x = formatInZone(iso, trip.timezone)
    return x === '00:00' ? null : x
  }

  // in ordine di data (chi non ne ha in fondo); la prima, se ha una data, è quella grande
  const sorted = useMemo(
    () =>
      trip.bookings
        .map((b, i) => ({ b, i, k: b.validFrom ?? '' }))
        .sort((a, c) => (a.k && c.k ? a.k.localeCompare(c.k) : a.k ? -1 : c.k ? 1 : a.i - c.i))
        .map((x) => x.b),
    [trip.bookings],
  )
  const list = sorted.filter((b) => (filter === 'all' ? true : filter === 'ok' ? confirmed(b) : !confirmed(b)))
  const [head, ...rest] = list

  const range = (b: Booking) => {
    const from = dateOf(b.validFrom)
    const to = dateOf(b.validTo)
    if (from && to) return from === to ? formatShort(from) : `${formatShort(from)} – ${formatShort(to)}`
    if (from) return `dal ${formatShort(from)}`
    if (to) return `fino al ${formatShort(to)}`
    return null
  }
  const status = (b: Booking) => {
    const ok = confirmed(b)
    const time = timeOf(b.validFrom)
    return { ok, text: ok ? `Confermata${time ? ` · ${time}` : ''}` : 'In attesa' }
  }
  const costText = (b: Booking) => (b.cost != null ? `${formatMoney(b.cost, b.currency ?? 'EUR')}${b.scope === 'total' ? '' : ' a persona'}` : null)
  const firstLine = (b: Booking) => (b.notes ?? '').split('\n')[0] || null

  const extras = (b: Booking) => {
    const link = b.url ? safeUrl(b.url) : null
    const offline = b.filePath ? cached.has(b.filePath) : false
    if (!link && !b.filePath && !b.code) return null
    return (
      <div class="below" onClick={stop} onKeyDown={stop} style={{ gap: '8px', flexWrap: 'wrap' }}>
        {b.code && (
          <button type="button" class="btn soft sm" onClick={() => void copy(b.code as string)} aria-label={`Copia il codice ${b.code}`}>
            Copia codice
          </button>
        )}
        {link && (
          <a class="btn soft sm" href={link} target="_blank" rel="noopener noreferrer">
            Apri link
          </a>
        )}
        {b.filePath && (
          <button type="button" class="btn soft sm" onClick={() => void open(b)}>
            {offline ? 'Apri file · offline' : 'Apri file'}
          </button>
        )}
      </div>
    )
  }

  const headDate = head ? dateOf(head.validFrom) : null

  return (
    <main class="screen">
      <PageHeader
        title="Prenotazioni"
        subtitle="Biglietti, tavoli e documenti"
        back={{ href: '/altro', label: 'Altro' }}
        actions={
          <button type="button" class="rbtn" aria-label="Aggiungi prenotazione" onClick={() => setSheet({ kind: 'new' })}>
            <PlusG />
          </button>
        }
      />

      {trip.bookings.length === 0 ? (
        <EmptyState title="Nessuna prenotazione" text="Aggiungi codici di conferma, link e il PDF dei biglietti: quelli marcati offline si aprono anche senza rete." art={ART.vuotoViaggi} />
      ) : (
        <>
          <div class="chips" role="group" aria-label="Filtra le prenotazioni">
            {(
              [
                ['all', 'Tutte'],
                ['ok', 'Confermate'],
                ['wait', 'In attesa'],
              ] as const
            ).map(([k, label]) => (
              <button type="button" key={k} class={`chip${filter === k ? ' on' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {label}
                {k === 'all' && (
                  <>
                    {' '}
                    <span class="n">{trip.bookings.length}</span>
                  </>
                )}
              </button>
            ))}
          </div>

          {list.length === 0 && <EmptyState title="Nessuna prenotazione qui" text="Cambia filtro per vederle tutte." />}

          {head && (
            <article class={`tk ${TINT[head.type]}`} aria-label={`Modifica ${head.title}`} {...activate(() => setSheet({ kind: 'edit', booking: head }))}>
              <div class="top">
                <div class="hd">
                  <span class="kind">
                    <Ic name={ICON[head.type]} size={32} />
                    {KIND[head.type]}
                  </span>
                  <span class="okp">
                    {status(head).ok ? <CheckG size={14} sw={3} /> : <ClockG size={14} sw={2.4} />}
                    {status(head).ok ? 'Confermata' : 'In attesa'}
                  </span>
                </div>
                <div>
                  <p class="nm">{head.title}</p>
                  <p class="ad">{[BOOKING_LABEL[head.type], firstLine(head)].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <div class="bot">
                <div class="f3">
                  <div>
                    <span class="k">Data</span>
                    <b style={{ whiteSpace: 'nowrap' }}>{headDate ? formatDay(headDate) : '—'}</b>
                  </div>
                  <div>
                    <span class="k">Ora</span>
                    <b>{timeOf(head.validFrom) ?? '—'}</b>
                  </div>
                  <div>
                    <span class="k">{costText(head) ? 'Costo' : 'Allegati'}</span>
                    <b>{costText(head) ?? (head.filePath ? 'File' : head.url ? 'Link' : '—')}</b>
                  </div>
                </div>
                <div class="bars" aria-hidden="true" />
                <div class="row2">
                  <span class="code">{head.code ? `N. ${head.code}` : 'Senza codice'}</span>
                  {extrasInline(head, cached, copy, open)}
                </div>
              </div>
            </article>
          )}

          {rest.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rest.map((b) => {
                const from = dateOf(b.validFrom)
                const d = from ? parseYmd(from) : null
                const day = d ? { n: String(d.getDate()), m: new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(d).replace('.', '') } : null
                const st = status(b)
                const r = range(b)
                const sub = [firstLine(b) ?? BOOKING_LABEL[b.type], !day && r, costText(b)].filter(Boolean).join(' · ')
                return (
                  <div class="tkwrap" key={b.id}>
                    <article class={`ct ${TINT[b.type]}`} aria-label={`Modifica ${b.title}`} {...activate(() => setSheet({ kind: 'edit', booking: b }))}>
                      <div class="cl">
                        <Ic name={ICON[b.type]} size={40} />
                        <div style={{ minWidth: 0 }}>
                          <p class="rt">{b.title}</p>
                          <p class="m">{sub}</p>
                          <span class={`sp ${st.ok ? 'ok' : 'warn'}`}>
                            {st.ok ? <CheckG size={14} sw={3} /> : <ClockG size={14} sw={2.4} />}
                            {st.text}
                          </span>
                        </div>
                      </div>
                      <div class="cr2">
                        {day ? (
                          <>
                            <b>{day.n}</b>
                            <span>{day.m}</span>
                          </>
                        ) : (
                          <ChevronRightG />
                        )}
                      </div>
                    </article>
                    {extras(b)}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

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
    </main>
  )
}

/** Azioni del biglietto grande: link, file e copia del codice (senza aprire la modifica). */
function extrasInline(b: Booking, cached: Set<string>, copy: (c: string) => Promise<void>, open: (b: Booking) => Promise<void>) {
  const link = b.url ? safeUrl(b.url) : null
  const offline = b.filePath ? cached.has(b.filePath) : false
  if (!link && !b.filePath && !b.code) return null
  return (
    <span style={{ display: 'inline-flex', gap: '8px' }} onClick={stop} onKeyDown={stop}>
      {b.code && (
        <button type="button" class="btn soft sm" onClick={() => void copy(b.code as string)} aria-label={`Copia il codice ${b.code}`}>
          Copia
        </button>
      )}
      {link && (
        <a class="btn soft sm" href={link} target="_blank" rel="noopener noreferrer">
          Link
        </a>
      )}
      {b.filePath && (
        <button type="button" class="btn soft sm" onClick={() => void open(b)}>
          {offline ? 'File · offline' : 'File'}
        </button>
      )}
    </span>
  )
}
