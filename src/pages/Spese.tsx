import { useMemo, useState } from 'react'
import { Link } from 'wouter'
import { budgetLines, expenseBase, fxOf, involvesTraveler, logisticsLines, summarizeLines, type Line } from '../lib/budget'
import { formatDay } from '../lib/dates'
import { dateInZone } from '../lib/flights'
import { formatMoney, round2 } from '../lib/money'
import { mapsLinkFor } from '../lib/mapsUrl'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Expense, Trip } from '../types'
import { ExpenseForm } from '../ui/ExpenseForm'
import { CheckG, PlusG, SearchG } from '../ui/glyphs'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { MapsPill } from '../ui/MapsPill'
import { Sheet } from '../ui/Sheet'
import { Ic } from '../ui/Sprite'

type SheetState = { kind: 'new' } | { kind: 'edit'; expense: Expense } | null
type Status = 'all' | 'paid' | 'due'
type Order = 'date' | 'amount'

interface Row {
  key: string
  title: string
  date?: string
  sub: string
  icon: string
  amount: string
  paid: boolean
  /** totale nella valuta base (null = manca il cambio) */
  total: number | null
  paidBase: number
  people: string[] // viaggiatori coinvolti (vuoto = tutti)
  payerId?: string
  maps?: string
  expense?: Expense
  href?: string
}

const SOURCE_HREF = { flight: '/altro/trasporti', stay: '/altro/alloggi', transport: '/altro/trasporti', booking: '/altro/prenotazioni', budget: '/altro/budget' } as const
const MODE_ICON: Record<string, string> = { train: 'i-tra-train', metro: 'i-tra-metro', bus: 'i-tra-bus', walk: 'i-tra-walk', plane: 'i-tra-plane' }

function iconOfCategory(cat: string | undefined): string {
  const c = (cat ?? '').trim().toLowerCase()
  if (c === 'voli') return 'i-tra-plane'
  if (c === 'alloggi') return 'i-sez-bed'
  if (c === 'trasporti') return 'i-tra-train'
  if (c === 'cibo' || c === 'ristoranti') return 'i-cat-food'
  return 'i-sez-budget'
}

/** Voci per riga: le spese registrate più i costi di voli, alloggi, trasporti, documenti e le voci di budget. */
function buildRows(trip: Trip): Row[] {
  const fx = fxOf(trip)
  const base = trip.baseCurrency
  const rows: Row[] = []
  for (const e of trip.expenses) {
    const inBase = expenseBase(e, fx)
    const date = dateInZone(e.spentAt, trip.timezone)
    rows.push({
      key: `e:${e.id}`,
      title: e.label,
      date,
      sub: [formatDay(date), e.category, e.currency !== base && inBase !== null ? `≈ ${formatMoney(inBase, base)}` : e.currency !== base ? 'manca il cambio' : ''].filter(Boolean).join(' · '),
      icon: iconOfCategory(e.category),
      amount: formatMoney(e.amount, e.currency),
      paid: true,
      total: inBase,
      paidBase: inBase ?? 0,
      people: e.shares.map((s) => s.travelerId),
      payerId: e.paidBy,
      expense: e,
    })
  }
  const lines: Line[] = [...budgetLines(trip.budget), ...logisticsLines(trip)]
  for (const l of lines) {
    const s = summarizeLines([l], trip.travelers, fx)
    const paid = l.shares.length > 0 && l.shares.every((x) => x.paid)
    let date: string | undefined
    let where = ''
    let maps: string | undefined
    let icon = iconOfCategory(l.category)
    const id = l.key.split(':')[1]
    if (l.source === 'flight') {
      const f = trip.flights.find((x) => x.id === id)
      const leg = f?.legs[0]
      if (leg) {
        date = dateInZone(leg.departAt, leg.fromTz)
        where = `Aeroporto ${leg.from}`
        maps = mapsLinkFor({ lat: null, lng: null, name: `Aeroporto ${leg.from}` })
      }
    } else if (l.source === 'stay') {
      const st = trip.stays.find((x) => x.id === id)
      if (st) {
        date = st.checkIn
        where = [st.city, st.address].filter(Boolean).join(' · ')
        maps = st.address || st.mapsUrl ? mapsLinkFor({ mapsUrl: st.mapsUrl, lat: null, lng: null, name: [st.name, st.address, st.city].filter(Boolean).join(' ') }) : undefined
      }
    } else if (l.source === 'transport') {
      const tr = trip.transports.find((x) => x.id === id)
      if (tr) {
        date = tr.departAt ? dateInZone(tr.departAt, trip.timezone) : tr.departDate
        where = tr.from
        icon = MODE_ICON[tr.mode] ?? icon
        maps = mapsLinkFor({ lat: tr.fromLat ?? null, lng: tr.fromLng ?? null, name: tr.from })
      }
    } else if (l.source === 'booking') {
      const b = trip.bookings.find((x) => x.id === id)
      date = b?.validFrom ? dateInZone(b.validFrom, trip.timezone) : undefined
      icon = 'i-sez-ticket'
    } else {
      date = trip.budget.find((x) => x.id === l.key)?.dueDate
    }
    rows.push({
      key: `l:${l.key}`,
      title: l.label,
      date,
      sub: [date && formatDay(date), where || (l.source === 'budget' ? 'costo previsto' : ''), l.scope === 'per_person' && l.shares.length > 1 ? 'a testa' : ''].filter(Boolean).join(' · '),
      icon,
      amount: formatMoney(l.amount, l.currency),
      paid,
      total: s.planned,
      paidBase: s.paid,
      people: l.shares.map((x) => x.travelerId),
      payerId: l.shares.length === 1 ? l.shares[0].travelerId : undefined,
      maps,
      href: SOURCE_HREF[l.source],
    })
  }
  return rows
}

export function Spese() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)
  const base = trip.baseCurrency
  const person = new Map(trip.travelers.map((p) => [p.id, p]))

  const [status, setStatus] = useState<Status>('all')
  const [who, setWho] = useState<'all' | string>('all')
  const [order, setOrder] = useState<Order>('date')
  const [searching, setSearching] = useState(false)
  const [q, setQ] = useState('')

  const rows = useMemo(() => buildRows(trip), [trip])
  const sum = (list: Row[], f: (r: Row) => number) => round2(list.reduce((n, r) => n + f(r), 0))
  const paidTotal = sum(rows, (r) => r.paidBase)
  const plannedTotal = sum(rows, (r) => r.total ?? 0)
  const dueTotal = round2(Math.max(0, plannedTotal - paidTotal))

  const filterId = who !== 'all' && person.has(who) ? who : 'all'
  const byPerson = rows.filter((r) => filterId === 'all' || r.people.length === 0 || r.people.includes(filterId) || r.payerId === filterId || (r.expense ? involvesTraveler(r.expense, filterId) : false))
  const nPaid = byPerson.filter((r) => r.paid).length
  const nDue = byPerson.length - nPaid
  const needle = q.trim().toLowerCase()
  const shown = byPerson
    .filter((r) => (status === 'all' ? true : status === 'paid' ? r.paid : !r.paid))
    .filter((r) => !needle || `${r.title} ${r.sub}`.toLowerCase().includes(needle))
    .sort((a, b) =>
      order === 'amount' ? (b.total ?? 0) - (a.total ?? 0) : (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.title.localeCompare(b.title, 'it'),
    )

  const chip = (label: string, on: boolean, onClick: () => void, n?: number) => (
    <button type="button" className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>
      {label}
      {n !== undefined && <> <span className="n">{n}</span></>}
    </button>
  )
  const pick = (s: Status) => () => {
    setStatus(s)
    setWho('all')
  }

  return (
    <main className="screen">
      <PageHeader
        title="Dettaglio spese"
        subtitle={`${rows.length} ${rows.length === 1 ? 'spesa' : 'spese'} · ${trip.title}`}
        back={{ href: '/altro/budget', label: 'Spese' }}
        actions={
          <button type="button" className="rbtn" aria-label="Cerca una spesa" aria-pressed={searching} onClick={() => { setSearching((v) => !v); setQ('') }}>
            <SearchG />
          </button>
        }
      />
      {searching && <input className="fs-search" type="search" autoFocus placeholder="Cerca una spesa" aria-label="Cerca una spesa" value={q} onChange={(e) => setQ(e.currentTarget.value)} />}

      {rows.length > 0 && (
        <>
          <div className="st3">
            <div className="stx" style={{ background: 'var(--tinta-menta)' }}>
              <p>Pagato</p>
              <p>{formatMoney(paidTotal, base)}</p>
            </div>
            <div className="stx" style={{ background: 'var(--tinta-limone)' }}>
              <p>Da pagare</p>
              <p>{formatMoney(dueTotal, base)}</p>
            </div>
            <div className="stx" style={{ background: 'var(--tinta-azzurro)' }}>
              <p>Previsto</p>
              <p>{formatMoney(plannedTotal, base)}</p>
            </div>
          </div>

          <div className="chips fs-chips" role="group" aria-label="Filtra le spese">
            {chip('Tutte', status === 'all' && filterId === 'all', pick('all'), byPerson.length)}
            {chip('Pagate', status === 'paid', pick('paid'), nPaid)}
            {chip('Da pagare', status === 'due', pick('due'), nDue)}
            {trip.travelers.length > 1 && trip.travelers.map((p) => chip(p.name, filterId === p.id, () => setWho(filterId === p.id ? 'all' : p.id)))}
          </div>

          <div className="seg" role="tablist" aria-label="Ordina">
            {(['date', 'amount'] as const).map((o) => (
              <span key={o} className={order === o ? 'on' : ''} role="tab" tabIndex={0} aria-selected={order === o} onClick={() => setOrder(o)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOrder(o)}>
                {o === 'date' ? 'Per data' : 'Per importo'}
              </span>
            ))}
          </div>
        </>
      )}

      {rows.length === 0 ? (
        <EmptyState title="Nessuna spesa" text="Tocca Registra spesa e scrivi importo e cosa hai pagato: in yen il cambio si calcola da solo." />
      ) : shown.length === 0 ? (
        <EmptyState title="Niente qui" text="Nessuna spesa corrisponde ai filtri scelti." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {shown.map((r) => {
            const payer = r.payerId ? person.get(r.payerId) : undefined
            const head = (
              <>
                <Ic name={r.icon} size={44} />
                <div className="grow">
                  <p className="ttl">{r.title}</p>
                  <p className="b-sm num">{r.sub}</p>
                </div>
                <span className="amt">{r.amount}</span>
              </>
            )
            return (
              <article className="exp" key={r.key} aria-label={r.title}>
                {r.expense ? (
                  <button type="button" className="top2" aria-label={`Modifica ${r.title}`} onClick={() => setSheet({ kind: 'edit', expense: r.expense as Expense })}>
                    {head}
                  </button>
                ) : (
                  <Link href={r.href ?? '/altro/budget'} className="top2" aria-label={`Apri ${r.title}`}>
                    {head}
                  </Link>
                )}
                <div className="foot">
                  <div className="l">
                    <span className={`sp ${r.paid ? 'ok' : 'warn'}`}>
                      <CheckG size={14} sw={3} />
                      {r.paid ? 'Pagato' : 'Da pagare'}
                    </span>
                    {payer ? (
                      <span className="who">
                        <span className="av" style={{ background: payer.color }} aria-hidden="true">
                          {payer.name.slice(0, 1).toUpperCase()}
                        </span>
                        {payer.name}
                      </span>
                    ) : trip.travelers.length > 1 ? (
                      <span className="who">Tutti</span>
                    ) : null}
                  </div>
                  {r.maps && <MapsPill kind="sm" href={r.maps} label={r.title} text="Maps" />}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="cta">
        <button type="button" className="btn block" onClick={() => setSheet({ kind: 'new' })}>
          <PlusG />
          Registra spesa
        </button>
      </div>

      <Sheet open={sheet !== null} title={sheet?.kind === 'new' ? 'Nuova spesa' : 'Modifica spesa'} onClose={close}>
        {sheet?.kind === 'new' && <ExpenseForm trip={trip} onSubmit={(i) => t.createExpense(trip.id, i)} onDone={close} />}
        {sheet?.kind === 'edit' && (
          <ExpenseForm
            key={sheet.expense.id}
            trip={trip}
            initial={sheet.expense}
            onSubmit={(i) => t.updateExpense(trip.id, sheet.expense, i)}
            onDelete={async () => {
              const id = sheet.expense.id
              const message = await t.setExpenseDeleted(id, true)
              if (!message) showToast('Spesa eliminata', { label: 'Annulla', run: () => void t.setExpenseDeleted(id, false) })
              return message
            }}
            onDone={close}
          />
        )}
      </Sheet>
    </main>
  )
}
