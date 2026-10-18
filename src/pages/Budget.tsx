import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { budgetLines, categoryOverview, expenseBase, fxOf, logisticsLines, shareAmounts, summarizeExpenses, summarizeLines, toBase, type CategoryOverview, type Line } from '../lib/budget'
import { formatShort } from '../lib/dates'
import { dateInZone } from '../lib/flights'
import { formatMoney } from '../lib/money'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { BudgetItem, Expense } from '../types'
import { BudgetItemForm } from '../ui/BudgetItemForm'
import { CategoryForm } from '../ui/CategoryForm'
import { ExpenseForm } from '../ui/ExpenseForm'
import { TrashButton } from '../ui/ConfirmDialog'
import { FxCard } from '../ui/FxCard'
import { FxForm } from '../ui/FxForm'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
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
  | null

const SOURCE_HREF = { flight: '/altro/trasporti', stay: '/altro/alloggi', transport: '/altro/trasporti' } as const

export function Budget() {
  const trip = useTrip()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)
  const fx = fxOf(trip)
  const base = trip.baseCurrency
  const hasLocal = !!trip.localCurrency && trip.localCurrency !== base

  const lines: Line[] = [...budgetLines(trip.budget), ...logisticsLines(trip)]
  const summary = summarizeLines(lines, trip.travelers, fx)
  const spentAll = summarizeExpenses(trip.expenses, trip.travelers, fx)
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
                          <span class="block truncate font-medium">{l.label}</span>
                          <span class="block text-xs text-muted">
                            {l.scope === 'per_person' ? 'a persona' : 'totale'}
                            {item?.dueDate && ` · entro ${formatShort(item.dueDate)}`}
                            {l.source !== 'budget' && ' · dai dati inseriti'}
                          </span>
                        </span>
                        <span class="shrink-0 text-right">
                          <span class="block font-semibold">{formatMoney(l.amount, l.currency)}</span>
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
                          <Link href={SOURCE_HREF[l.source as 'flight' | 'stay' | 'transport']} class="flex min-h-11 items-center gap-3">
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
                                  class={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${
                                    s.paid ? 'border-ok/40 bg-ok/10 text-ok' : 'border-line text-muted'
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
          class="min-h-11 rounded-full px-3 text-sm font-medium text-accent"
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
            <span class="block truncate font-medium">{e.label}</span>
            <span class="block truncate text-xs text-muted">
              {[formatShort(dateInZone(e.spentAt, trip.timezone)), payer && `pagato da ${payer.name}`].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span class="shrink-0 text-right">
            <span class="block font-semibold">{formatMoney(e.amount, e.currency)}</span>
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

  const categoryCard = (c: CategoryOverview) => {
    const over = c.planned > 0 && c.spent > c.planned
    const pct = c.planned > 0 ? Math.min(100, (c.spent / c.planned) * 100) : 0
    return (
      <section key={c.key} aria-label={c.label}>
        <Card class="!p-0">
          <div class="flex items-center gap-2 pl-4 pr-1 pt-2">
            {c.color && <span aria-hidden="true" class="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />}
            <h3 class="font-display min-w-0 flex-1 truncate text-lg font-semibold">{c.label}</h3>
            {categoryActions(c)}
          </div>
          <div class="px-4 pb-3">
            <p class="flex items-baseline justify-between gap-3">
              <span class="text-sm text-muted">Speso</span>
              <span class="font-display text-2xl font-semibold">{formatMoney(c.spent, base)}</span>
            </p>
            {c.planned > 0 && (
              <>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={c.planned} aria-valuenow={Math.min(c.spent, c.planned)} class="mt-1 h-2 overflow-hidden rounded-full bg-line">
                  <div class={`h-full rounded-full ${over ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
                </div>
                <p class={`mt-1 text-xs ${over ? 'font-medium text-danger' : 'text-muted'}`}>
                  Previsto {formatMoney(c.planned, base)}
                  {over ? ` · oltre di ${formatMoney(c.spent - c.planned, base)}` : ` · restano ${formatMoney(c.planned - c.spent, base)}`}
                </p>
              </>
            )}
            {c.spent === 0 && c.planned === 0 && c.expenses.length === 0 && c.lines.length === 0 && (
              <p class="mt-1 text-xs text-muted">Ancora vuota: registra una spesa e il totale si aggiorna da solo.</p>
            )}
            {c.unconverted.length > 0 && (
              <p role="alert" class="mt-2 rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">
                Manca il cambio per {c.unconverted.join(', ')}: quelle voci non sono nel totale.
              </p>
            )}
          </div>

          {c.expenses.length > 0 && (
            <details class="border-t border-line">
              <summary class="flex min-h-12 cursor-pointer items-center px-4 text-sm font-medium">
                {c.expenses.length} {c.expenses.length === 1 ? 'spesa' : 'spese'}
              </summary>
              <ul class="divide-y divide-line px-4 pb-1">{c.expenses.map(expenseRow)}</ul>
            </details>
          )}

          {c.lines.length > 0 && (
            <div class="border-t border-line">
              <p class="px-4 pt-2 text-xs font-medium text-muted">Costi previsti</p>
              <ul class="divide-y divide-line">{c.lines.map(lineRow)}</ul>
            </div>
          )}

          <div class="flex flex-wrap border-t border-line px-2">
            <button type="button" onClick={() => setSheet({ kind: 'new-expense', category: c.label })} class="min-h-11 rounded-full px-3 text-sm font-medium text-accent">
              + Spesa
            </button>
            <button type="button" onClick={() => setSheet({ kind: 'new', category: c.label })} class="min-h-11 rounded-full px-3 text-sm font-medium text-muted">
              + Costo previsto
            </button>
          </div>
        </Card>
      </section>
    )
  }

  return (
    <>
      <PageHeader title="Budget" subtitle="Previsto, pagato e da pagare" back={{ href: '/altro', label: 'Altro' }} />
      <div class="space-y-3 px-4">
        <Card>
          <dl class="grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt class="text-muted">Previsto</dt>
              <dd class="font-semibold">{formatMoney(summary.planned, base)}</dd>
            </div>
            <div>
              <dt class="text-muted">Pagato</dt>
              <dd class="font-semibold text-ok">{formatMoney(summary.paid, base)}</dd>
            </div>
            <div>
              <dt class="text-muted">Da pagare</dt>
              <dd class="font-semibold">{formatMoney(summary.outstanding, base)}</dd>
            </div>
          </dl>
          <p class="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-2 text-sm">
            <span class="text-muted">Speso finora ({trip.expenses.length} {trip.expenses.length === 1 ? 'spesa' : 'spese'})</span>
            <span class="font-display text-xl font-semibold">{formatMoney(spentAll.total, base)}</span>
          </p>
          {trip.travelers.length > 1 && (
            <ul class="mt-3 divide-y divide-line border-t border-line">
              {summary.perTraveler.map((p) => {
                const person = traveler.get(p.travelerId)
                return (
                  <li class="flex min-h-11 items-center gap-2 text-sm">
                    <span aria-hidden="true" class="h-3 w-3 shrink-0 rounded-full" style={{ background: person?.color }} />
                    <span class="min-w-0 flex-1 truncate font-medium">{person?.name}</span>
                    <span class="text-muted">{formatMoney(p.planned, base)}</span>
                    <span class="w-24 text-right font-medium">{formatMoney(p.outstanding, base)}</span>
                  </li>
                )
              })}
              <li class="flex justify-end gap-2 pt-1 text-[11px] text-muted">
                <span>previsto</span>
                <span class="w-24 text-right">da pagare</span>
              </li>
            </ul>
          )}
          {summary.unconverted.length > 0 && (
            <p role="alert" class="mt-3 rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">
              Mancano i tassi per {summary.unconverted.join(', ')}: queste voci non sono nei totali.
            </p>
          )}
        </Card>

        {hasLocal && <FxCard trip={trip} onEdit={() => setSheet({ kind: 'fx' })} />}

        <Link href="/altro/spese" class="block">
          <Card class="flex min-h-14 items-center gap-3">
            <span class="min-w-0 flex-1">
              <span class="block font-medium">Spese del viaggio</span>
              <span class="block text-xs text-muted">
                {trip.expenses.length ? `${trip.expenses.length} spese registrate · chi deve a chi` : 'Registra cosa spendi, anche in yen'}
              </span>
            </span>
            <span aria-hidden="true" class="text-muted">›</span>
          </Card>
        </Link>

        <div class="flex items-center justify-between gap-3 px-1">
          <h2 class="font-display text-lg font-semibold">Categorie</h2>
          <button type="button" onClick={() => setSheet({ kind: 'new-category' })} class="min-h-11 rounded-full px-3 text-sm font-medium text-accent">
            + Categoria
          </button>
        </div>

        {categories.length === 0 ? (
          <EmptyState
            title="Nessuna categoria"
            text="Crea una categoria (Cibo, Souvenir…) e scegline una quando registri una spesa: il totale della categoria si aggiorna da solo."
          />
        ) : (
          categories.map(categoryCard)
        )}

        <button type="button" onClick={() => setSheet({ kind: 'new' })} class="min-h-12 w-full rounded-full bg-accent px-6 font-semibold text-accent-ink">
          + Aggiungi costo previsto
        </button>
      </div>

      {delDialog}
      <Sheet open={sheet !== null} title={sheetTitle(sheet)} onClose={close}>
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
        {sheet?.kind === 'fx' && <FxForm trip={trip} onSubmit={(r) => t.setFxRate(trip.id, r)} onDone={close} />}
      </Sheet>
    </>
  )
}

function sheetTitle(sheet: SheetState): string {
  switch (sheet?.kind) {
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
