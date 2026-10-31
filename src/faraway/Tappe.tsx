// Lista delle tappe del giorno (componenti Tappa / TappaStati del design system, mock Fa-09…Fa-11):
// binario con i nodi, stato a destra, spostamenti tra una tappa e l'altra, una card aperta in linea
// con orari, apertura, indirizzo, Maps, costo, menu «Stato della tappa» e Modifica · Sposta · Elimina.
// La usa la pagina Giorno e «Il programma di oggi» in Oggi (#29).
import { ora } from '../lib/formati'
import type { ReactNode } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { categoryIcon } from '../lib/categoryIcon'
import { formatMoney, round2 } from '../lib/money'
import { mapsLinkFor } from '../lib/mapsUrl'
import { openingFor } from '../lib/opening'
import { durata, fase, forseInRitardo, riepilogo, rigaOrario, statoOf, statusOf, TAPPA_STATI, toMin, type Fase, type Spostamento } from '../lib/tappa'
import { itemDuration } from '../lib/duration'
import { Sv } from './icons'
import { discOf, initials } from '../state/me'
import type { Day, DayItem, Expense, ItemStatus, Place, Trip } from '../types'
import { cx } from './cx'

/** Glifo dello sprite senza dimensioni (le mette il CSS del componente). */
export const G = ({ name, cls }: { name: string; cls?: string }) => (
  <svg aria-hidden="true" className={cx('ic', cls)} viewBox="0 0 24 24">
    <use href={`#${name}`} />
  </svg>
)

const PARTS = ['', 'da solo', 'in due', 'in tre', 'in quattro', 'in cinque', 'in sei', 'in sette', 'in otto']

export interface TappeCtx {
  isToday: boolean
  isPast: boolean
  nowMin: number
  timeZone: string
}

interface Props {
  trip: Trip
  day: Day
  /** Titolo del gruppo (es. «Giorno 6 · Kyoto») e data. `null` = senza intestazione. */
  header?: { title: string; date: string } | null
  ctx: TappeCtx
  /** Spostamento stimato che porta a ciascuna tappa (per id della tappa). */
  segments: Map<string, Spostamento>
  openId: string | null
  onToggle: (id: string) => void
  onStatus: (item: DayItem, status: ItemStatus) => void
  onEdit: (item: DayItem) => void
  onMove: (item: DayItem) => void
  onDelete: (item: DayItem) => void
  /** Testo della seconda riga dell'indirizzo («8 min a piedi da qui»). */
  fromHere?: (item: DayItem) => string | null
  /** Meteo della tappa, per la sua città e il suo orario («14° · nuvoloso alle 15:30»). */
  meteoDi?: (item: DayItem) => string | null
  /** Id della tappa da evidenziare (tocco su un pin). */
  highlight?: string | null
  readOnly?: boolean
}

export function placeOf(trip: Trip, item: DayItem): Place | undefined {
  return item.placeId ? trip.places.find((p) => p.id === item.placeId) : undefined
}

/** Simbolo del glifo della categoria della tappa (g-cat-temple, g-cat-food…). */
export function glyphOf(trip: Trip, item: DayItem): string {
  const cat = item.categoryId ? trip.categories.find((c) => c.id === item.categoryId)?.label : placeOf(trip, item)?.category
  if (item.kind === 'meal') return 'g-cat-food'
  const icon = categoryIcon(cat)
  return icon === 'pin' ? 'g-visit' : `g-cat-${icon}`
}

export function linkedExpense(trip: Trip, item: DayItem): Expense | undefined {
  return trip.expenses.find((e) => e.source?.kind === 'day_item' && e.source.id === item.id)
}

/** Sottotitolo della tappa: «Nishiki · 45 min», «Kitayama · in quattro». */
function metaOf(trip: Trip, item: DayItem): string {
  const place = placeOf(trip, item)
  const dur = itemDuration(item, place)
  const who = item.participants?.length ?? 0
  const where = place && place.name.trim().toLowerCase() !== item.title.trim().toLowerCase() ? place.name : item.note?.split('\n')[0] || place?.city || ''
  const from = item.postponedFromDayId ? trip.days.findIndex((d) => d.id === item.postponedFromDayId) : -1
  return [from >= 0 ? `Rimandata dal Giorno ${from + 1}` : null, where, who > 1 ? PARTS[who] ?? `in ${who}` : null, dur ? durata(dur) : null].filter(Boolean).join(' · ')
}

function Pill({ item, f, ctx }: { item: DayItem; f: Fase; ctx: TappeCtx }) {
  const st = statusOf(item)
  if (st === 'done')
    return (
      <span className="st">
        <G name="g-check" />
        Fatta
      </span>
    )
  if (st === 'skipped' || st === 'cancelled')
    return (
      <span className="st sk">
        <G name="g-minus" />
        {statoOf(st).label}
      </span>
    )
  if (st === 'late')
    return (
      <span className="st" style={{ color: 'var(--danger)' }}>
        <G name="g-clock" />
        In ritardo
      </span>
    )
  if (f === 'now') return <span className="now">Ora</span>
  if (forseInRitardo(item, ctx)) return <span className="next">In ritardo?</span>
  if (f === 'past') return <span className="next">Da fare</span>
  return <span className="next">Dopo</span>
}

/** Menu «Stato della tappa» (listbox) dentro la card aperta. */
function StatoMenu({ item, onPick, disabled }: { item: DayItem; onPick: (s: ItemStatus) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const cur = statoOf(statusOf(item))
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
  }, [open])
  return (
    <>
      <button type="button" className="stbtn" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(!open)} disabled={disabled}>
        <span className={cx('cn', cur.cls)}>
          <G name={cur.icon} />
        </span>
        <span className="sx">
          <span className="sl">Stato</span>
          <b className="sn">{cur.label}</b>
        </span>
        <span className="sc">
          <G name="g-chev" />
        </span>
      </button>
      {open ? (
        <div className="menu">
          <div className="mh">Stato della tappa</div>
          <ul role="listbox" aria-label="Stato della tappa" ref={listRef}>
            {TAPPA_STATI.map((s) => (
              <li
                key={s.value}
                role="option"
                tabIndex={0}
                aria-selected={s.value === cur.value}
                className={cx('op', s.value === cur.value && 'on')}
                onClick={() => {
                  setOpen(false)
                  if (s.value !== cur.value) onPick(s.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setOpen(false)
                    if (s.value !== cur.value) onPick(s.value)
                  } else if (e.key === 'Escape') setOpen(false)
                  else if (e.key === 'ArrowDown') ((e.currentTarget.nextElementSibling as HTMLElement | null) ?? e.currentTarget).focus()
                  else if (e.key === 'ArrowUp') ((e.currentTarget.previousElementSibling as HTMLElement | null) ?? e.currentTarget).focus()
                }}
              >
                <span className={cx('cn', s.cls)}>
                  <G name={s.icon} />
                </span>
                <span className="ox">
                  <b>{s.label}</b>
                  <span>{s.hint}</span>
                </span>
                {s.value === cur.value ? <G name="g-check" /> : null}
              </li>
            ))}
          </ul>
          <div className="mf">Nuovi stati si aggiungono al registro e compaiono qui; la lista scorre dopo sei voci.</div>
        </div>
      ) : null}
    </>
  )
}

function Riga({ icon, main, sub, action }: { icon: string; main: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rw">
      <span className="ri">
        <G name={icon} />
      </span>
      <div className="rx">
        <div className="rm">{main}</div>
        {sub ? <div className="rs">{sub}</div> : null}
      </div>
      {action}
    </div>
  )
}

export function TappeLista({ trip, day, header, ctx, segments, openId, onToggle, onStatus, onEdit, onMove, onDelete, fromHere, meteoDi, highlight, readOnly }: Props) {
  const items = day.items
  const sum = riepilogo(items, ctx)
  const payer = new Map(trip.travelers.map((p) => [p.id, p.name]))
  const phases = items.map((i) => fase(i, placeOf(trip, i), ctx))

  return (
    <div className="k-Tappa" style={{ display: 'grid', gap: 15 }}>
      {header ? (
        <header>
          <h2>{header.title}</h2>
          <span className="cap">{header.date}</span>
        </header>
      ) : null}
      {items.length > 0 ? (
        <div className="prog">
          <div className="pl">
            <b>{sum.line}</b>
            {sum.next ? <span>Prossima: {sum.next}</span> : null}
          </div>
          <div className="pb" role="progressbar" aria-label="Tappe chiuse" aria-valuemin={0} aria-valuemax={sum.total} aria-valuenow={sum.closed}>
            <i style={{ width: `${sum.total ? (sum.closed / sum.total) * 100 : 0}%` }} />
          </div>
        </div>
      ) : null}
      <ol className="steps">
        {items.map((item, idx) => {
          const f = phases[idx]
          const place = placeOf(trip, item)
          const open = openId === item.id
          const seg = segments.get(item.id)
          const prevF = idx > 0 ? phases[idx - 1] : null
          const exp = linkedExpense(trip, item)
          const ndCls = f === 'done' ? 'done' : f === 'skip' ? 'skip' : f === 'now' ? 'now' : 'next'
          const ndIcon = f === 'done' ? 'g-check' : f === 'skip' ? 'g-minus' : glyphOf(trip, item)
          const orario = rigaOrario(item, place, ctx)
          const startAt = toMin(item.time) ?? ctx.nowMin
          const opening = place?.openingSpec ? openingFor(place.openingSpec, day.date, f === 'now' ? ctx.nowMin : startAt) : null
          const address = place?.address || [place?.name, place?.city].filter(Boolean).join(', ')
          const hereText = fromHere?.(item) ?? null
          const people = exp ? (exp.shares.length > 0 ? exp.shares.map((s) => s.travelerId) : trip.travelers.map((p) => p.id)) : []
          return (
            <Fragment key={item.id}>
              {seg && idx > 0 ? (
                <li className={cx('seg', prevF !== 'done' && prevF !== 'skip' && 'after')}>
                  <span className="rail" />
                  <span className="sg">
                    <G name={seg.icon} />
                    {seg.text}
                  </span>
                </li>
              ) : null}
              <li id={`tappa-${item.id}`} className={cx('stp', ndCls, open && 'sel', highlight === item.id && 'fa-flash')}>
                <span className="rail">
                  <span className={cx('nd', ndCls)}>
                    <G name={ndIcon} />
                  </span>
                </span>
                <div className="body">
                  <div
                    className="top"
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    onClick={() => onToggle(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onToggle(item.id)
                      }
                    }}
                  >
                    <div className="tt">
                      <div className="t">{item.title}</div>
                      <div className="m">{metaOf(trip, item)}</div>
                      {meteoDi?.(item) ? <div className="m">{meteoDi(item)}</div> : null}
                      {item.time && item.timeLock ? (
                        <div className="m" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {item.timeLock === 'locked' ? <Sv name="lock" size={14} /> : null}
                          {item.timeLock === 'locked' ? 'Orario vincolato' : 'Orario flessibile'}
                        </div>
                      ) : null}
                    </div>
                    <div className="r">
                      {item.time ? (
                        <span className="time">
                          {ora(item.time)}
                          <G name="g-chev" cls="chv" />
                        </span>
                      ) : (
                        <span className="time">
                          <G name="g-chev" cls="chv" />
                        </span>
                      )}
                      <Pill item={item} f={f} ctx={ctx} />
                    </div>
                  </div>
                  {open && f === 'now' && exp ? (
                    <div className="foot">
                      <span className="av">
                        {people.slice(0, 4).map((id) => (
                          <span key={id} style={{ background: `var(--disco-${['corallo', 'glicine', 'cielo', 'menta', 'rosa'][discOf(trip, id) - 1]})`, borderColor: 'var(--tinta-azzurro)' }}>
                            {initials(payer.get(id) ?? '?')}
                          </span>
                        ))}
                      </span>
                      <span className="amt">{formatMoney(exp.amount, exp.currency)}</span>
                    </div>
                  ) : null}
                  {open ? (
                    <div className="xb">
                      {orario ? <Riga icon="g-clock" main={orario.main} sub={opening && f !== 'done' && f !== 'skip' ? <span style={opening.closed ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{opening.text}</span> : orario.sub} /> : null}
                      {place || item.note ? (
                        <Riga
                          icon="g-pinout"
                          main={address || item.title}
                          sub={hereText}
                          action={
                            place ? (
                              <a aria-label={`Apri ${place.name} su Maps`} className="btn mp" href={mapsLinkFor(place)} target="_blank" rel="noopener noreferrer">
                                <G name="g-pinout" />
                                Maps
                              </a>
                            ) : null
                          }
                        />
                      ) : null}
                      {exp && !(f === 'now') ? (
                        <Riga
                          icon="g-budget"
                          main={formatMoney(exp.amount, exp.currency)}
                          sub={[exp.paidBy ? `Pagato da ${payer.get(exp.paidBy) ?? '—'}` : null, people.length > 1 ? `${formatMoney(round2(exp.amount / people.length), exp.currency)} a testa` : null, exp.notes].filter(Boolean).join(' · ')}
                        />
                      ) : null}
                      {readOnly ? null : (
                        <>
                          <StatoMenu item={item} onPick={(s) => onStatus(item, s)} />
                          <div style={{ background: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                            <button type="button" className="fa-btn sm out" style={{ padding: '0 8px' }} onClick={() => onEdit(item)}>
                              Modifica
                            </button>
                            <button type="button" className="fa-btn sm out" style={{ padding: '0 8px' }} onClick={() => onMove(item)}>
                              Sposta
                            </button>
                            <button type="button" className="fa-btn sm del" style={{ padding: '0 8px', color: 'var(--danger)' }} onClick={() => onDelete(item)}>
                              Elimina
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}
