import { useEffect, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { budgetLines, budgetStatus, categoryOverview, expenseBase, expensesByCurrency, fxOf, logisticsLines, paidByTraveler, paidFromSections, personSummary, shareAmounts, summarizeExpenses, summarizeLines, toBase, type CategoryOverview, type Line } from '../lib/budget'
import { useAuth } from '../lib/auth'
import { formatShort } from '../lib/dates'
import { dateInZone } from '../lib/flights'
import { extraCurrencies, formatMoney, round2 } from '../lib/money'
import { takeScrollTarget } from '../state/scrollTarget'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { BudgetItem, Expense } from '../types'
import { BudgetItemForm } from '../ui/BudgetItemForm'
import { CategoryForm } from '../ui/CategoryForm'
import { ExpenseForm } from '../ui/ExpenseForm'
import { TrashButton } from '../ui/ConfirmDialog'
import { FxForm } from '../ui/FxForm'
import { ChevronRightG, PlusG, SwapG, TrashG, LogoSym } from '../ui/glyphs'
import { Card, PageHeader } from '../ui/PageHeader'
import { Ic } from '../ui/Sprite'
import { Sheet } from '../ui/Sheet'
import { useDeleter } from '../ui/useDeleter'

type SheetState =
  | { kind: 'new'; category?: string }
  | { kind: 'edit'; item: BudgetItem }
  | { kind: 'new-expense'; category?: string }
  | { kind: 'edit-expense'; expense: Expense }
  | { kind: 'new-category' }
  | { kind: 'rename-category'; id: string; label: string }
  | { kind: 'fx' }
  | { kind: 'category'; key: string }
  | null

const SOURCE_HREF = { flight: '/altro/trasporti', stay: '/altro/alloggi', transport: '/altro/trasporti', booking: '/altro/prenotazioni' } as const

export function Budget() {
  const trip = useTrip()
  const t = useTrips()
  const auth = useAuth()
  const [del, delDialog] = useDeleter()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)

  // arrivando dalla card del cambio nella Home, la pagina scorre fino al calcolatore
  useEffect(() => {
    const id = takeScrollTarget()
    if (!id) return
    if (id === 'cambio') setSheet({ kind: 'fx' })
    else {
      const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }))
      return () => cancelAnimationFrame(frame)
    }
  }, [])
  const fx = fxOf(trip)
  const base = trip.baseCurrency
  const hasLocal = !!trip.localCurrency && trip.localCurrency !== base

  const lines: Line[] = [...budgetLines(trip.budget), ...logisticsLines(trip)]
  const summary = summarizeLines(lines, trip.travelers, fx)
  const spentAll = summarizeExpenses(trip.expenses, trip.travelers, fx)
  // speso = spese registrate + voli, alloggi e trasporti già pagati (presi dalle loro sezioni, senza ripeterli come spese)
  const sectionsPaid = paidFromSections(trip, fx)
  const spentTotal = round2(spentAll.total + sectionsPaid.paid)
  const categories = categoryOverview(trip, fx)
  const person = new Map(trip.travelers.map((p) => [p.id, p]))
  const itemById = new Map(trip.budget.map((b) => [b.id, b]))
  const traveler = new Map(trip.travelers.map((p) => [p.id, p]))

  async function togglePaid(shareId: string, paid: boolean) {
    const message = await t.setBudgetSharePaid(shareId, !paid)
    if (message) showToast(message)
  }

  const lineRow = (l: Line) => {
                    const item = l.source === 'budget' ? itemById.get(l.key) : undefined
                    const amounts = shareAmounts(l, Math.max(1, l.shares.length))
                    const mine = toBase(amounts[0], l.currency, fx)
                    const body = (
                      <>
                        <span class="min-w-0 flex-1">
                          <span class="block truncate font-extrabold">{l.label}</span>
                          <span class="block text-xs text-muted">
                            {l.scope === 'per_person' ? 'a persona' : 'totale'}
                            {item?.dueDate && ` · entro ${formatShort(item.dueDate)}`}
                            {l.source !== 'budget' && ' · dai dati inseriti'}
                          </span>
                        </span>
                        <span class="shrink-0 text-right">
                          <span class="block font-extrabold">{formatMoney(l.amount, l.currency)}</span>
                          {l.currency !== base && mine !== null && l.scope === 'per_person' && (
                            <span class="block text-xs text-muted">≈ {formatMoney(mine, base)} a testa</span>
                          )}
                        </span>
                      </>
                    )
                    return (
                      <li class="py-2 pl-4 pr-1">
                        {item ? (
                          <div class="flex items-center">
                            <button type="button" onClick={() => setSheet({ kind: 'edit', item })} class="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
                              {body}
                            </button>
                            <TrashButton
                              label={`Elimina ${item.label}`}
                              onClick={() =>
                                void del({
                                  title: `Eliminare «${item.label}»?`,
                                  done: 'Costo eliminato',
                                  run: () => t.setBudgetItemDeleted(item.id, true),
                                  undo: () => t.setBudgetItemDeleted(item.id, false),
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div class="pr-3">
                          <Link href={SOURCE_HREF[l.source as keyof typeof SOURCE_HREF]} class="flex min-h-11 items-center gap-3">
                            {body}
                          </Link>
                          </div>
                        )}
                        {item && item.shares.length > 0 && trip.travelers.length > 0 && (
                          <div class="mb-1 flex pr-3 flex-wrap gap-2">
                            {item.shares.map((s) => {
                              const person = traveler.get(s.travelerId)
                              if (!person) return null
                              return (
                                <button
                                  type="button"
                                  aria-pressed={s.paid}
                                  onClick={() => void togglePaid(s.id, s.paid)}
                                  class={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-extrabold ${
                                    s.paid ? 'border-ok text-ok' : 'border-line text-muted'
                                  }`}
                                >
                                  <span aria-hidden="true">{s.paid ? '✓' : '○'}</span>
                                  {person.name}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {!item && (
                          <p class="mb-1 pr-3 text-xs text-muted">
                            {l.shares.length > 0 && l.shares.every((s) => s.paid) ? '✓ Pagato' : '○ Non pagato'}
                          </p>
                        )}
                      </li>
                    )
  }

  const categoryActions = (c: CategoryOverview) =>
    c.id ? (
      <span class="flex shrink-0">
        <button
          type="button"
          onClick={() => setSheet({ kind: 'rename-category', id: c.id as string, label: c.label })}
          class="min-h-11 px-3 text-sm font-extrabold text-pale"
        >
          Rinomina
        </button>
        <TrashButton
          label={`Elimina la categoria ${c.label}`}
          onClick={() =>
            void del({
              title: `Eliminare la categoria «${c.label}»?`,
              text:
                c.expenses.length + c.lines.filter((l) => l.source === 'budget').length > 0
                  ? 'Le spese e le voci restano, ma finiscono in «Altro». Puoi annullare subito dopo.'
                  : undefined,
              done: 'Categoria eliminata',
              run: () => t.setExpenseCategoryDeleted(c.id as string, true),
              undo: () => t.setExpenseCategoryDeleted(c.id as string, false),
            })
          }
        />
      </span>
    ) : null

  const expenseRow = (e: Expense) => {
    const inBase = expenseBase(e, fx)
    const payer = e.paidBy ? person.get(e.paidBy) : undefined
    return (
      <li class="flex items-center">
        <button type="button" onClick={() => setSheet({ kind: 'edit-expense', expense: e })} class="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 text-left">
          <span class="min-w-0 flex-1">
            <span class="block truncate font-extrabold">{e.label}</span>
            <span class="block truncate text-xs text-muted">
              {[formatShort(dateInZone(e.spentAt, trip.timezone)), payer && `pagato da ${payer.name}`].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span class="shrink-0 text-right">
            <span class="block font-extrabold">{formatMoney(e.amount, e.currency)}</span>
            {e.currency !== base && inBase !== null && <span class="block text-xs text-muted">≈ {formatMoney(inBase, base)}</span>}
          </span>
        </button>
        <TrashButton
          label={`Elimina la spesa ${e.label}`}
          onClick={() =>
            void del({
              title: `Eliminare la spesa «${e.label}»?`,
              done: 'Spesa eliminata',
              run: () => t.setExpenseDeleted(e.id, true),
              undo: () => t.setExpenseDeleted(e.id, false),
            })
          }
        />
      </li>
    )
  }

  const openCategory = sheet?.kind === 'category' ? categories.find((c) => c.key === sheet.key) : undefined

  // dettaglio di una categoria (si apre toccando la riga sullo scontrino)
  const categoryDetail = (c: CategoryOverview) => {
    const over = c.planned > 0 && c.spent > c.planned
    const pct = c.planned > 0 ? Math.min(100, (c.spent / c.planned) * 100) : 0
    return (
      <div class="-mx-1">
        <p class="flex items-baseline justify-between gap-3 px-1">
          <span class="text-sm text-muted">Speso</span>
          <span class="font-display text-2xl font-extrabold">{formatMoney(c.spent, base)}</span>
        </p>
        {c.planned > 0 && (
          <div class="px-1">
            <div role="progressbar" aria-valuemin={0} aria-valuemax={c.planned} aria-valuenow={Math.min(c.spent, c.planned)} class="mt-1 h-2.5 overflow-hidden rounded-[5px] border-2 border-line bg-surface">
              <i class={`block h-full ${over ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
            </div>
            <p class={`mt-1 text-xs ${over ? 'font-extrabold text-danger' : 'text-muted'}`}>
              Previsto {formatMoney(c.planned, base)}
              {over ? ` · oltre di ${formatMoney(c.spent - c.planned, base)}` : ` · restano ${formatMoney(c.planned - c.spent, base)}`}
            </p>
          </div>
        )}
        {c.unconverted.length > 0 && (
          <p role="alert" class="mx-1 mt-2 rounded-xl border-2 border-warn px-3 py-2 text-xs font-extrabold text-warn">
            Manca il cambio per {c.unconverted.join(', ')}: quelle voci non sono nel totale.
          </p>
        )}

        {c.expenses.length > 0 && (
          <div class="mt-3 border-t border-hairline">
            <p class="px-1 pt-2 text-xs font-extrabold text-muted">
              {c.expenses.length} {c.expenses.length === 1 ? 'spesa' : 'spese'}
            </p>
            <ul class="divide-y-2 divide-dashed divide-hairline px-1">{c.expenses.map(expenseRow)}</ul>
          </div>
        )}

        {c.lines.some((l) => l.source !== 'budget') && (
          <div class="mt-2 border-t border-hairline">
            <p class="px-1 pt-2 text-xs font-extrabold text-muted">Già inseriti in {c.label} · il pagato conta come speso</p>
            <ul class="divide-y-2 divide-dashed divide-hairline">{c.lines.filter((l) => l.source !== 'budget').map(lineRow)}</ul>
          </div>
        )}

        {c.lines.some((l) => l.source === 'budget') && (
          <div class="mt-2 border-t border-hairline">
            <p class="px-1 pt-2 text-xs font-extrabold text-muted">Costi previsti</p>
            <ul class="divide-y-2 divide-dashed divide-hairline">{c.lines.filter((l) => l.source === 'budget').map(lineRow)}</ul>
          </div>
        )}

        <div class="mt-2 flex flex-wrap items-center border-t border-hairline">
          <button type="button" onClick={() => setSheet({ kind: 'new-expense', category: c.label })} class="min-h-11 px-2 text-sm font-extrabold text-pale">
            + Spesa
          </button>
          <button type="button" onClick={() => setSheet({ kind: 'new', category: c.label })} class="min-h-11 px-2 text-sm font-extrabold text-muted">
            + Costo previsto
          </button>
          <span class="ml-auto">{categoryActions(c)}</span>
        </div>
      </div>
    )
  }

  // chi ha pagato cosa: le spese anticipate più la quota già pagata di voli, alloggi, trasporti e documenti
  const paidBy = paidByTraveler(trip, fx)
  const anyPaid = Array.from(paidBy.values()).some((v) => v > 0)
  const planned = summary.planned
  const left = round2(planned - spentTotal)
  const limitStatus = budgetStatus(trip.budgetLimit, spentTotal, planned)

  // il saldo di chi usa l'app (se il suo account è collegato a un viaggiatore); altrimenti il conto principale tra voi
  const meTraveler = trip.travelers.find((p) => p.userId && p.userId === auth.session?.user.id)
  const me = meTraveler ? personSummary(spentAll, meTraveler.id) : undefined
  const nameOf = (id: string) => person.get(id)?.name ?? 'Qualcuno'
  const first = spentAll.transfers[0]
  const saldo = (() => {
    if (trip.travelers.length < 2 || trip.expenses.length === 0) return null
    if (me) {
      if (me.net > 0.004) {
        const who = me.receives.map((x) => nameOf(x.from))
        return { badge: 'Da incassare', title: 'Il tuo saldo', value: `+${formatMoney(me.net, base)}`, note: who.length === 1 ? `Te li deve ${who[0]}` : `Te li devono ${who.join(' e ')}`, now: true }
      }
      if (me.net < -0.004) {
        const who = me.gives.map((x) => nameOf(x.to))
        return { badge: 'Da dare', title: 'Il tuo saldo', value: `−${formatMoney(-me.net, base)}`, note: `Li devi a ${who.join(' e ')}`, now: false }
      }
      return { badge: 'In pari', title: 'Il tuo saldo', value: formatMoney(0, base), note: 'Non devi né dare né ricevere', now: false }
    }
    if (!first) return { badge: 'In pari', title: 'Il saldo', value: formatMoney(0, base), note: 'Nessuno deve niente', now: false }
    return {
      badge: 'Da regolare',
      title: 'Il saldo',
      value: formatMoney(first.amount, base),
      note: `${nameOf(first.from)} deve a ${nameOf(first.to)}${spentAll.transfers.length > 1 ? ` · +${spentAll.transfers.length - 1}` : ''}`,
      now: true,
    }
  })()

  const sym = (c: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((x) => x.type === 'currency')?.value ?? c
  const fxNote = hasLocal && trip.fxRate ? ` · 1 ${sym(base)} = ${Math.round(1 / trip.fxRate)} ${sym(trip.localCurrency as string)}` : ''
  const unconverted = Array.from(new Set([...summary.unconverted, ...spentAll.unconverted, ...sectionsPaid.unconverted]))
  const expenseCount = trip.expenses.length + lines.filter((l) => l.source !== 'budget').length

  const askDeleteCategory = (c: CategoryOverview) =>
    void del({
      title: `Eliminare la categoria «${c.label}»?`,
      text: c.expenses.length + c.lines.filter((l) => l.source === 'budget').length > 0 ? 'Le spese e le voci restano, ma finiscono in «Altro». Puoi annullare subito dopo.' : undefined,
      done: 'Categoria eliminata',
      run: () => t.setExpenseCategoryDeleted(c.id as string, true),
      undo: () => t.setExpenseCategoryDeleted(c.id as string, false),
    })

  const budgetNote = (() => {
    if (!limitStatus || !trip.budgetLimit) return null
    const rest = round2(trip.budgetLimit - Math.max(planned, spentTotal))
    return rest >= 0 ? `Entro il budget: restano ${formatMoney(rest, base)} sul previsto` : `Oltre il budget di ${formatMoney(-rest, base)}`
  })()

  return (
    <main class="screen">
      <PageHeader
        title="Spese"
        subtitle={`${trip.title}${fxNote}`}
        back={{ href: '/altro', label: 'Altro' }}
        actions={
          <>
            <button type="button" class="rbtn" aria-label="Nuova categoria" onClick={() => setSheet({ kind: 'new-category' })}>
              <PlusG />
            </button>
            {hasLocal && (
              <button type="button" class="rbtn" aria-label="Cambia valuta" onClick={() => setSheet({ kind: 'fx' })}>
                <SwapG />
              </button>
            )}
          </>
        }
      />

      <section class="riep" aria-label="Speso finora">
        <LogoSym class="logo-sym" width={62} height={73} style={{ position: 'absolute', right: '24px', top: '18px' }} />
        <span class="l">Speso finora</span>
        <span class="big num">{formatMoney(spentTotal, base)}</span>
        <span class="c">
          {planned > 0 ? `previsti ${formatMoney(planned, base)}` : `${trip.expenses.length} ${trip.expenses.length === 1 ? 'spesa' : 'spese'}`}
          {trip.budgetLimit ? ` · budget ${formatMoney(trip.budgetLimit, base)}` : planned > 0 ? ` · ${left >= 0 ? `restano ${formatMoney(left, base)}` : `oltre di ${formatMoney(-left, base)}`}` : ''}
        </span>
        {limitStatus && trip.budgetLimit && (
          <>
            <div class="rbar" role="progressbar" aria-valuemin={0} aria-valuemax={trip.budgetLimit} aria-valuenow={Math.min(spentTotal, trip.budgetLimit)} aria-label="Speso sul budget massimo">
              <i style={{ width: `${limitStatus.spentPct}%` }} />
            </div>
            <span class="c">{budgetNote}</span>
          </>
        )}
      </section>

      <div class="riep2">
        {saldo && (
          <div class="rc a">
            <span class={`badge ${saldo.now ? 'now' : 'soft'}`}>{saldo.badge}</span>
            <span class="l" style={{ marginTop: '8px' }}>{saldo.title}</span>
            <span class="v num">{saldo.value}</span>
            <span class="c">{saldo.note}</span>
          </div>
        )}
        <div class="rc b" style={saldo ? undefined : { gridColumn: '1 / -1' }}>
          <span class="l">Persone</span>
          <span class="v num">{trip.travelers.length}</span>
          <div class="avr">
            {trip.travelers.map((p) => (
              <span key={p.id} style={{ background: p.color }} title={p.name}>
                {p.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      <section class="rcp" aria-label="Resoconto delle spese">
        <div class="rc-body">
          <p class="b-bold" style={{ marginBottom: '6px' }}>Per categoria</p>
          {categories.length === 0 ? (
            <p class="sm" style={{ padding: '8px 0 12px' }}>Nessuna categoria: creane una (Cibo, Souvenir…) e il totale si aggiorna da solo.</p>
          ) : (
            categories.map((c) => (
              <div class="rc-cat" key={c.key}>
                <button type="button" class="grow" style={{ border: 0, background: 'none', textAlign: 'left', color: 'inherit' }} aria-label={`Apri ${c.label}`} onClick={() => setSheet({ kind: 'category', key: c.key })}>
                  <div class="lead">
                    <span class="lb">{c.label}</span>
                    <i />
                    <span class="vl">{formatMoney(c.spent, base)}</span>
                  </div>
                  <span class="sm">
                    {[
                      c.expenses.length > 0 ? `${c.expenses.length} ${c.expenses.length === 1 ? 'spesa' : 'spese'}` : null,
                      c.sections.count > 0 ? `${c.sections.paid} di ${c.sections.count} pagati` : null,
                      c.planned > 0 ? `previsto ${formatMoney(c.planned, base)}` : c.expenses.length > 0 ? 'nessun costo previsto' : 'Ancora vuota · registra una spesa',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    {c.unconverted.length > 0 && ` · manca il cambio per ${c.unconverted.join(', ')}`}
                  </span>
                </button>
                {c.id ? (
                  <button type="button" class="rc-trash" aria-label={`Elimina la categoria ${c.label}`} style={{ color: 'var(--ink)' }} onClick={() => askDeleteCategory(c)}>
                    <TrashG />
                  </button>
                ) : (
                  <span class="rc-trash" aria-hidden="true" />
                )}
              </div>
            ))
          )}

          {planned > 0 && (
            <>
              <div class="dash" style={{ marginTop: '6px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                <div class="lead">
                  <span class="lb reg">Previsto</span>
                  <i />
                  <span class="vl reg">{formatMoney(summary.planned, base)}</span>
                </div>
                <div class="lead">
                  <span class="lb reg">Già pagato</span>
                  <i />
                  <span class="vl reg">{formatMoney(summary.paid, base)}</span>
                </div>
                <div class="lead">
                  <span class="lb">Da pagare</span>
                  <i />
                  <span class="vl">{formatMoney(summary.outstanding, base)}</span>
                </div>
              </div>
            </>
          )}

          {trip.travelers.length > 1 && anyPaid && (
            <>
              <div class="dash" style={{ marginTop: '14px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {trip.travelers.map((p) => (
                  <div class="lead" key={p.id}>
                    <span class="lb">{p.name} ha pagato</span>
                    <i />
                    <span class="vl">{formatMoney(paidBy.get(p.id) ?? 0, base)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {unconverted.length > 0 && (
            <p role="alert" class="b-sm" style={{ marginTop: '14px', fontWeight: 600 }}>
              Mancano i tassi per {unconverted.join(', ')}: queste voci non sono nei totali.
            </p>
          )}
        </div>
        <svg class="rc-zig" width="100%" height="10" aria-hidden="true">
          <defs>
            <pattern id="zz" width="20" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 0H20L10 10z" style={{ fill: 'var(--surface-card)' }} />
            </pattern>
          </defs>
          <rect width="100%" height="10" fill="url(#zz)" />
        </svg>
      </section>

      {/* solo nei viaggi con valute extra: quanto si è speso in ciascuna valuta e a quanto corrisponde */}
      {extraCurrencies(trip).length > 0 && trip.expenses.length > 0 && (
        <Card>
          <h2 class="h-sm">Spese per valuta</h2>
          <ul style={{ marginTop: '4px' }}>
            {expensesByCurrency(trip.expenses, fx).map((r, i) => (
              <li key={r.currency} style={{ display: 'flex', minHeight: '48px', alignItems: 'center', borderTop: i > 0 ? '1px solid var(--hairline)' : undefined }}>
                <span>
                  <span class="b-bold num" style={{ display: 'block' }}>{formatMoney(r.amount, r.currency)}</span>
                  {r.currency !== base && <span class="b-sm muted" style={{ display: 'block' }}>{r.base === null ? `manca il cambio per ${r.currency}` : `≈ ${formatMoney(r.base, base)}`}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Link href="/altro/spese" class="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 16px 16px 18px', borderRadius: '20px' }} aria-label="Apri il dettaglio delle spese">
        <Ic name="i-con-spese" size={48} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span class="h-sm" style={{ display: 'block' }}>Dettaglio spese</span>
          <span class="b-sm" style={{ display: 'block' }}>{expenseCount > 0 ? `Tutte le ${expenseCount} spese, una per una` : 'Registra cosa spendi, anche in yen'}</span>
        </span>
        <ChevronRightG size={24} sw={2.8} />
      </Link>

      <div class="cta" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button type="button" class="btn block" onClick={() => setSheet({ kind: 'new-expense' })}>
          <PlusG />
          Registra spesa
        </button>
        <button type="button" class="btn soft block" onClick={() => setSheet({ kind: 'new' })}>
          Aggiungi costo previsto
        </button>
      </div>

      {delDialog}
      <Sheet open={sheet !== null} title={sheetTitle(sheet, openCategory?.label)} onClose={close}>
        {sheet?.kind === 'category' && (openCategory ? categoryDetail(openCategory) : <p class="text-sm text-muted">Questa categoria non esiste più.</p>)}
        {sheet?.kind === 'new' && (
          <BudgetItemForm trip={trip} defaultCategory={sheet.category} onSubmit={(i) => t.createBudgetItem(trip.id, i)} onDone={close} />
        )}
        {sheet?.kind === 'edit' && (
          <BudgetItemForm
            key={sheet.item.id}
            trip={trip}
            initial={sheet.item}
            onSubmit={(i) => t.updateBudgetItem(trip.id, sheet.item, i)}
            onDelete={async () => {
              const id = sheet.item.id
              const message = await t.setBudgetItemDeleted(id, true)
              if (!message) showToast('Costo eliminato', { label: 'Annulla', run: () => void t.setBudgetItemDeleted(id, false) })
              return message
            }}
            onDone={close}
          />
        )}
        {sheet?.kind === 'new-expense' && (
          <ExpenseForm trip={trip} defaults={{ category: sheet.category }} onSubmit={(i) => t.createExpense(trip.id, i)} onDone={close} />
        )}
        {sheet?.kind === 'edit-expense' && (
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
        {sheet?.kind === 'new-category' && (
          <CategoryForm submitLabel="Crea categoria" onSubmit={(label) => t.createExpenseCategory(trip.id, label)} onDone={close} />
        )}
        {sheet?.kind === 'rename-category' && (
          <CategoryForm
            key={sheet.id}
            initial={sheet.label}
            submitLabel="Salva nome"
            onSubmit={(label) => t.renameExpenseCategory(trip.id, sheet.id, label)}
            onDone={close}
          />
        )}
        {sheet?.kind === 'fx' && <FxForm
            trip={trip}
            // senza valute extra (ora e prima) si salva come sempre: la colonna delle extra serve solo a chi le usa
            onSubmit={(r, extra) => (Object.keys(extra).length === 0 && !trip.fxRates ? t.setFxRate(trip.id, r) : t.setFxRates(trip.id, r, extra))}
            onDone={close}
          />}
      </Sheet>
    </main>
  )
}

function sheetTitle(sheet: SheetState, categoryLabel?: string): string {
  switch (sheet?.kind) {
    case 'category':
      return categoryLabel ?? 'Categoria'
    case 'new':
      return 'Nuovo costo previsto'
    case 'edit':
      return 'Modifica costo previsto'
    case 'new-expense':
      return 'Nuova spesa'
    case 'edit-expense':
      return 'Modifica spesa'
    case 'new-category':
      return 'Nuova categoria'
    case 'rename-category':
      return 'Rinomina categoria'
    case 'fx':
      return 'Cambio'
    default:
      return ''
  }
}
