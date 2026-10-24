import { useEffect, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { budgetLines, budgetStatus, categoryOverview, expenseBase, expensesByCurrency, fxOf, logisticsLines, paidByTraveler, paidFromSections, shareAmounts, summarizeExpenses, summarizeLines, toBase, type CategoryOverview, type Line } from '../lib/budget'
import { formatShort } from '../lib/dates'
import { dateInZone } from '../lib/flights'
import { extraCurrencies, formatMoney, round2 } from '../lib/money'
import { takeScrollTarget } from '../state/scrollTarget'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { BudgetItem, Expense } from '../types'
import { BudgetItemForm } from '../ui/BudgetItemForm'
import { BudgetLimitBar } from '../ui/BudgetLimitBar'
import { CategoryForm } from '../ui/CategoryForm'
import { ExpenseForm } from '../ui/ExpenseForm'
import { TrashButton } from '../ui/ConfirmDialog'
import { FxCard } from '../ui/FxCard'
import { FxForm } from '../ui/FxForm'
import { BudgetIcon, ChevronRightIcon, TrashIcon } from '../ui/Icons'
import { Card, PageHeader } from '../ui/PageHeader'
import { DASH, Leader, Receipt } from '../ui/Receipt'
import { Disc, Ticket } from '../ui/Ticket'
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
  const [del, delDialog] = useDeleter()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)

  // arrivando dalla card del cambio nella Home, la pagina scorre fino al calcolatore
  useEffect(() => {
    const id = takeScrollTarget()
    if (!id) return
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
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

  return (
    <>
      <PageHeader title="Spese" back={{ href: '/altro', label: 'Altro' }} />
      <div class="px-5 pb-28">
        <Receipt>
          <p class="text-[13px] text-paper-muted">Speso finora</p>
          <p class="font-display text-[50px] font-extrabold leading-[1.05] tracking-[-2px] tabular-nums">{formatMoney(spentTotal, base)}</p>
          <p class="text-[13px] text-paper-muted">
            {planned > 0
              ? `su ${formatMoney(planned, base)} previsti · ${left >= 0 ? `restano ${formatMoney(left, base)}` : `oltre di ${formatMoney(-left, base)}`}`
              : `${trip.expenses.length} ${trip.expenses.length === 1 ? 'spesa' : 'spese'}`}
          </p>
          {limitStatus && trip.budgetLimit && <BudgetLimitBar status={limitStatus} spent={spentTotal} limit={trip.budgetLimit} currency={base} />}

          <div class={`${DASH} mb-1.5 mt-3.5`} />
          {categories.length === 0 ? (
            <p class="py-3 text-sm text-paper-muted">Nessuna categoria: creane una (Cibo, Souvenir…) e il totale si aggiorna da solo.</p>
          ) : (
            categories.map((c) => (
              <div key={c.key} class="flex min-h-[58px] items-center gap-1">
                <button type="button" onClick={() => setSheet({ kind: 'category', key: c.key })} aria-label={`Apri ${c.label}`} class="min-w-0 flex-1 py-1.5 text-left">
                  <Leader label={c.label} value={formatMoney(c.spent, base)} />
                  <span class="block text-xs text-paper-muted">
                    {[
                      c.expenses.length > 0 ? `${c.expenses.length} ${c.expenses.length === 1 ? 'spesa' : 'spese'}` : null,
                      c.sections.count > 0 ? `${c.sections.paid} di ${c.sections.count} pagati` : null,
                      c.planned > 0 ? `costo previsto ${formatMoney(c.planned, base)}` : c.expenses.length > 0 ? 'nessun costo previsto' : 'Ancora vuota · registra una spesa',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    {c.unconverted.length > 0 && ` · manca il cambio per ${c.unconverted.join(', ')}`}
                  </span>
                </button>
                {c.id ? (
                  <button
                    type="button"
                    aria-label={`Elimina la categoria ${c.label}`}
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
                    class="grid size-11 shrink-0 place-items-center text-paper-muted"
                  >
                    <TrashIcon size={20} />
                  </button>
                ) : (
                  <span class="size-11 shrink-0" />
                )}
              </div>
            ))
          )}

          {planned > 0 && (
            <>
              <div class={`${DASH} mb-2.5 mt-2`} />
              <div class="space-y-1.5">
                <Leader label="Previsto" value={formatMoney(summary.planned, base)} bold={false} />
                <Leader label="Già pagato" value={formatMoney(summary.paid, base)} bold={false} />
                <Leader label="Da pagare" value={formatMoney(summary.outstanding, base)} />
              </div>
            </>
          )}

          {trip.travelers.length > 1 && anyPaid && (
            <>
              <div class={`${DASH} mb-2.5 mt-2`} />
              <div class="space-y-1.5">
                {trip.travelers.map((p) => (
                  <Leader key={p.id} label={`${p.name} ha pagato`} value={formatMoney(paidBy.get(p.id) ?? 0, base)} />
                ))}
              </div>
            </>
          )}

          {(summary.unconverted.length > 0 || spentAll.unconverted.length > 0 || sectionsPaid.unconverted.length > 0) && (
            <p role="alert" class="mt-3 rounded-lg border-2 border-ink px-3 py-2 text-xs font-extrabold">
              Mancano i tassi per {Array.from(new Set([...summary.unconverted, ...spentAll.unconverted, ...sectionsPaid.unconverted])).join(', ')}: queste voci non sono nei totali.
            </p>
          )}
        </Receipt>

        {hasLocal && (
          <div id="cambio" class="mt-[18px] scroll-mt-24">
            <FxCard trip={trip} onEdit={() => setSheet({ kind: 'fx' })} />
          </div>
        )}

        {/* solo nei viaggi con valute extra: quanto si è speso in ciascuna valuta e a quanto corrisponde */}
        {extraCurrencies(trip).length > 0 && trip.expenses.length > 0 && (
          <Card class="mt-3.5">
            <h2 class="font-display text-lg font-extrabold">Spese per valuta</h2>
            <ul class="mt-1">
              {expensesByCurrency(trip.expenses, fx).map((r, i) => (
                <li key={r.currency} class={`flex min-h-12 items-center justify-between gap-3 ${i > 0 ? 'border-t border-hairline' : ''}`}>
                  <span class="min-w-0">
                    <span class="block font-extrabold tabular-nums">{formatMoney(r.amount, r.currency)}</span>
                    {r.currency !== base && (
                      <span class={`block text-xs ${r.base === null ? 'font-extrabold text-warn' : 'text-muted'}`}>
                        {r.base === null ? `manca il cambio per ${r.currency}` : `≈ ${formatMoney(r.base, base)}`}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Link href="/altro/spese" class="mt-3.5 block">
          <Ticket stub={<Disc color="var(--accent)"><BudgetIcon size={22} /></Disc>} stubWidth={76}>
            <span class="min-w-0 flex-1">
              <span class="block text-[17px] font-extrabold leading-tight">Dettaglio spese</span>
              <span class="block text-[13px] text-muted">
                {trip.expenses.length ? `${trip.expenses.length} ${trip.expenses.length === 1 ? 'spesa registrata' : 'spese registrate'} · chi deve a chi` : 'Registra cosa spendi, anche in yen'}
              </span>
            </span>
            <ChevronRightIcon size={20} class="mr-2 shrink-0 text-muted" />
          </Ticket>
        </Link>

        <div class="mt-5 flex gap-2.5">
          <button type="button" onClick={() => setSheet({ kind: 'new-category' })} class="grid min-h-[52px] flex-1 place-items-center rounded-[14px] border-2 border-line text-[15px] font-extrabold">
            + Categoria
          </button>
          <button type="button" onClick={() => setSheet({ kind: 'new-expense' })} class="grid min-h-[52px] flex-1 place-items-center rounded-[14px] bg-accent text-[15px] font-extrabold text-white">
            + Spesa
          </button>
        </div>
        <button type="button" onClick={() => setSheet({ kind: 'new' })} class="mx-auto mt-1 block min-h-11 px-3 text-sm font-extrabold text-muted">
          + Costo previsto
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
    </>
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
