import { useState } from 'react'
import { formatShort, parseYmd } from '../lib/dates'
import { convert, formatMoney, rateFor } from '../lib/money'
import { nightsOf, overlappingStays, uncoveredNights } from '../lib/stays'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Stay, Trip } from '../types'
import { ART } from '../ui/art'
import { ClockG, PlusG } from '../ui/glyphs'
import { MapsPill } from '../ui/MapsPill'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'
import { Ic } from '../ui/Sprite'
import { StayForm } from '../ui/StayForm'

type SheetState = { kind: 'new' } | { kind: 'edit'; stay: Stay } | null

const monthOf = (ymd: string) => formatShort(ymd).split(' ').slice(1).join(' ')
/** «22–26 nov» se stesso mese, altrimenti «29 nov – 3 dic». */
function rangeLabel(from: string, to: string): string {
  if (monthOf(from) === monthOf(to)) return `${parseYmd(from).getDate()}–${formatShort(to)}`
  return `${formatShort(from)} – ${formatShort(to)}`
}

function mapsHref(s: Stay): string | null {
  if (s.mapsUrl) return s.mapsUrl
  const q = [s.name, s.address, s.city].filter(Boolean).join(' ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}

function cost(s: Stay, trip: Trip): string | null {
  if (s.totalCost == null) return null
  const rate = trip.baseCurrency !== s.currency ? rateFor(trip, s.currency) : undefined
  const approx = rate ? convert(s.totalCost, rate) : null
  return approx != null ? `${formatMoney(s.totalCost, s.currency)} ≈ ${formatMoney(approx, trip.baseCurrency)}` : formatMoney(s.totalCost, s.currency)
}

const okMark = { color: '#141930', stroke: '#141930', opacity: 1, display: 'inline-block', flexShrink: 0 } as const

export function Alloggi() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)

  const nights = trip.stays.reduce((n, s) => n + nightsOf(s), 0)
  const gaps = uncoveredNights(trip.startDate, trip.endDate, trip.stays)
  const overlaps = overlappingStays(trip.stays)
  const count = trip.stays.length

  return (
    <main className="screen">
      <PageHeader
        title="Alloggi"
        subtitle={count ? `${count} ${count === 1 ? 'soggiorno' : 'soggiorni'} · ${nights} ${nights === 1 ? 'notte' : 'notti'}` : 'Hotel e case prenotate'}
        back={{ href: '/altro', label: 'Altro' }}
        actions={
          <button type="button" className="rbtn" aria-label="Aggiungi alloggio" onClick={() => setSheet({ kind: 'new' })}>
            <PlusG />
          </button>
        }
      />

      {gaps.length > 0 && (
        <p className="card b-sm" style={{ borderStyle: 'dashed' }}>
          Notti senza alloggio: {gaps.map(formatShort).join(', ')} (ok se sei in volo o in treno di notte).
        </p>
      )}
      {overlaps.length > 0 && (
        <p role="alert" className="card b-sm" style={{ color: 'var(--warning)', fontWeight: 700 }}>
          Attenzione: {overlaps.map(([a, b]) => `${trip.stays[a].name} e ${trip.stays[b].name}`).join('; ')} si sovrappongono.
        </p>
      )}

      {count === 0 ? (
        <EmptyState title="Nessun alloggio" text="Aggiungi hotel e case con date, costo e stato di prenotazione." art={ART.vuotoViaggi} />
      ) : (
        <ul className="stays" aria-label="Soggiorni">
          {trip.stays.map((s, idx) => {
            const n = nightsOf(s)
            const href = mapsHref(s)
            const included = [s.breakfast && 'colazione inclusa', s.dinner && 'cena inclusa', s.kitchen && 'cucina'].filter(Boolean) as string[]
            const sub = [s.city && s.city !== s.name ? s.city : '', ...included].filter(Boolean).join(', ')
            const total = cost(s, trip)
            const status = s.paid ? 'Pagato' : s.booked ? 'Prenotato · da pagare' : 'Non prenotato'
            return (
              <li key={s.id}>
                <article className={`tk ${s.booked ? 't-azzurro' : 't-limone'} stay`} aria-label={s.name}>
                  <div className="top">
                    <details open={idx === 0}>
                      <summary>
                        <Ic name="i-sez-bed-gl" size={36} />
                        <span className="st-t">
                          <b>{s.name}</b>
                          <span>{rangeLabel(s.checkIn, s.checkOut)}</span>
                        </span>
                        <span className="st-n">
                          <b>{n}</b> {n === 1 ? 'notte' : 'notti'}
                        </span>
                        <svg className="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </summary>
                      <div className="st-b">
                        {sub && <p className="st-s">{sub}</p>}
                        <div className="st-g">
                          <div>
                            <span className="k">Check-in</span>
                            <b>{s.checkInInfo || formatShort(s.checkIn)}</b>
                          </div>
                          <div>
                            <span className="k">Check-out</span>
                            <b>{s.checkOutInfo || formatShort(s.checkOut)}</b>
                          </div>
                          <div>
                            <span className="k">{total ? 'Costo' : 'Notti'}</span>
                            <b>{total ?? n}</b>
                          </div>
                        </div>
                        {s.address && <p className="st-s">{s.address}</p>}
                        {s.notes && <p className="st-s" style={{ whiteSpace: 'pre-line' }}>{s.notes}</p>}
                        <div>
                          <button type="button" className="btn soft sm" aria-label={`Modifica ${s.name}`} onClick={() => setSheet({ kind: 'edit', stay: s })}>
                            Modifica
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>
                  <div className="bot">
                    <div className="st-f">
                      <span className="st-ok">
                        {s.paid ? (
                          <svg className="ck" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#141930" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={okMark}>
                            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#141930" />
                          </svg>
                        ) : (
                          <ClockG size={14} />
                        )}
                        {status}
                      </span>
                      {href && <MapsPill href={href} label={s.name} text="Apri su maps" kind="sm" />}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}

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
    </main>
  )
}
