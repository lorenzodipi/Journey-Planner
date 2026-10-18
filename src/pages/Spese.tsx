import { useState } from 'preact/hooks'
import { expenseBase, expensesOf, fxOf, personSummary, shareOf, summarizeExpenses } from '../lib/budget'
import { dateInZone } from '../lib/flights'
import { formatDay } from '../lib/dates'
import { formatMoney, round2 } from '../lib/money'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Expense, Traveler } from '../types'
import { TrashButton } from '../ui/ConfirmDialog'
import { ExpenseForm } from '../ui/ExpenseForm'
import { FxCard } from '../ui/FxCard'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'
import { useDeleter } from '../ui/useDeleter'

type SheetState = { kind: 'new' } | { kind: 'edit'; expense: Expense } | null

export function Spese() {
  const trip = useTrip()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)
  const fx = fxOf(trip)
  const base = trip.baseCurrency
  const summary = summarizeExpenses(trip.expenses, trip.travelers, fx)
  const person = new Map(trip.travelers.map((p) => [p.id, p]))

  // filtro per persona: "Tutti" oppure un viaggiatore (se è stato tolto torna su "Tutti")
  const [who, setWho] = useState<'all' | string>('all')
  const selected: Traveler | undefined = who === 'all' ? undefined : person.get(who)
  const filterId = selected ? selected.id : 'all'
  const shown = expensesOf(trip.expenses, filterId)
  const me = selected ? personSummary(summary, selected.id) : undefined
  const mine = (e: Expense) => (selected ? shareOf(e, trip.travelers, selected.id, fx) : null)

  // raggruppate per giorno (nel fuso del viaggio), dalla più recente
  const byDay = new Map<string, Expense[]>()
  for (const e of shown) {
    const day = dateInZone(e.spentAt, trip.timezone)
    byDay.set(day, [...(byDay.get(day) ?? []), e])
  }
  const days = Array.from(byDay.keys()).sort().reverse()

  return (
    <>
      <PageHeader title="Spese" subtitle="Quello che spendi in viaggio" back={{ href: '/altro/budget', label: 'Budget' }} />
      <div class="space-y-3 px-4" style={{ paddingBottom: '5rem' }}>
        {trip.travelers.length > 1 && (
          <div
            role="tablist"
            aria-label="Spese per persona"
            class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={!selected}
              onClick={() => setWho('all')}
              class={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${!selected ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}`}
            >
              Tutti
            </button>
            {trip.travelers.map((p) => (
              <button
                type="button"
                role="tab"
                aria-selected={selected?.id === p.id}
                onClick={() => setWho(p.id)}
                class={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium ${selected?.id === p.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}`}
              >
                <span aria-hidden="true" class="h-3 w-3 rounded-full" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        )}

        {selected && me ? (
          <Card>
            <p class="flex items-center gap-2 text-sm text-muted">
              <span aria-hidden="true" class="h-3 w-3 rounded-full" style={{ background: selected.color }} />
              {selected.name}
            </p>
            <p class="font-display text-2xl font-semibold">{formatMoney(me.share, base)}</p>
            <p class="text-sm text-muted">la sua parte delle spese</p>
            <dl class="mt-2 divide-y divide-line border-t border-line text-sm">
              <div class="flex min-h-11 items-center justify-between">
                <dt>Ha anticipato</dt>
                <dd class="font-medium">{formatMoney(me.paid, base)}</dd>
              </div>
              <div class="flex min-h-11 items-center justify-between">
                <dt>Spese che lo riguardano</dt>
                <dd class="font-medium">{shown.length}</dd>
              </div>
            </dl>
            <div class="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
              {me.gives.length === 0 && me.receives.length === 0 ? (
                <p>È pari: non deve né ricevere né dare.</p>
              ) : (
                <>
                  {me.gives.map((x) => (
                    <p>Deve dare {formatMoney(x.amount, base)} a {person.get(x.to)?.name}</p>
                  ))}
                  {me.receives.map((x) => (
                    <p>Deve ricevere {formatMoney(x.amount, base)} da {person.get(x.from)?.name}</p>
                  ))}
                </>
              )}
            </div>
            {summary.unconverted.length > 0 && (
              <p role="alert" class="mt-3 rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">
                Manca il cambio per {summary.unconverted.join(', ')}: quelle spese non sono nei totali.
              </p>
            )}
          </Card>
        ) : (
        <Card>
          <p class="text-sm text-muted">Totale speso</p>
          <p class="font-display text-2xl font-semibold">{formatMoney(summary.total, base)}</p>
          {trip.travelers.length > 1 && trip.expenses.length > 0 && (
            <>
              <ul class="mt-2 divide-y divide-line border-t border-line">
                {summary.spentBy.map((s) => (
                  <li class="flex min-h-11 items-center gap-2 text-sm">
                    <span aria-hidden="true" class="h-3 w-3 shrink-0 rounded-full" style={{ background: person.get(s.travelerId)?.color }} />
                    <span class="min-w-0 flex-1 truncate">{person.get(s.travelerId)?.name}</span>
                    <span class="font-medium">{formatMoney(s.amount, base)}</span>
                  </li>
                ))}
              </ul>
              <div class="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
                {summary.transfers.length === 0
                  ? 'Siete pari: nessuno deve niente.'
                  : summary.transfers.map((x) => (
                      <p>
                        {person.get(x.from)?.name} deve {formatMoney(x.amount, base)} a {person.get(x.to)?.name}
                      </p>
                    ))}
              </div>
            </>
          )}
          {summary.unconverted.length > 0 && (
            <p role="alert" class="mt-3 rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">
              Manca il cambio per {summary.unconverted.join(', ')}: quelle spese non sono nei totali.
            </p>
          )}
        </Card>
        )}

        {trip.localCurrency && trip.localCurrency !== trip.baseCurrency && <FxCard trip={trip} />}

        {trip.expenses.length === 0 ? (
          <EmptyState title="Nessuna spesa" text="Tocca + e scrivi importo e cosa hai pagato: in yen il cambio si calcola da solo." />
        ) : shown.length === 0 ? (
          <EmptyState title="Niente qui" text={`Nessuna spesa riguarda ${selected?.name ?? 'questa persona'}.`} />
        ) : (
          days.map((day) => {
            const list = byDay.get(day) ?? []
            const dayTotal = round2(list.reduce((n, e) => n + (selected ? (mine(e) ?? 0) : (expenseBase(e, fx) ?? 0)), 0))
            return (
              <section aria-label={formatDay(day)}>
                <h2 class="mb-1 flex items-baseline justify-between px-1 text-sm font-semibold text-muted">
                  <span>{formatDay(day)}</span>
                  <span class="font-medium">
                    {selected && 'quota '}
                    {formatMoney(dayTotal, base)}
                  </span>
                </h2>
                <Card class="!p-0">
                  <ul class="divide-y divide-line">
                    {list.map((e) => {
                      const inBase = expenseBase(e, fx)
                      const payer = e.paidBy ? person.get(e.paidBy) : undefined
                      const share = mine(e)
                      return (
                        <li class="flex items-center pr-1">
                          <button type="button" onClick={() => setSheet({ kind: 'edit', expense: e })} class="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left">
                            <span class="min-w-0 flex-1">
                              <span class="block truncate font-medium">{e.label}</span>
                              <span class="block truncate text-xs text-muted">
                                {[e.category, payer && `pagato da ${payer.name}`].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            <span class="shrink-0 text-right">
                              <span class="block font-semibold">{formatMoney(e.amount, e.currency)}</span>
                              {e.currency !== base && inBase !== null && <span class="block text-xs text-muted">≈ {formatMoney(inBase, base)}</span>}
                              {selected && share !== null && (
                                <span class="block text-xs font-medium text-accent">quota {formatMoney(share, base)}</span>
                              )}
                            </span>
                          </button>
                          <TrashButton
                            label={`Elimina la spesa ${e.label}`}
                            onClick={() =>
                              void del({
                                title: `Eliminare la spesa «${e.label}»?`,
                                text: `${formatMoney(e.amount, e.currency)}: sparisce dai totali e dai conti tra voi. Puoi annullare subito dopo.`,
                                done: 'Spesa eliminata',
                                run: () => t.setExpenseDeleted(e.id, true),
                                undo: () => t.setExpenseDeleted(e.id, false),
                              })
                            }
                          />
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              </section>
            )
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => setSheet({ kind: 'new' })}
        aria-label="Aggiungi spesa"
        class="fixed right-4 z-20 flex min-h-14 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-ink shadow-card"
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
      >
        <span aria-hidden="true" class="text-2xl leading-none">+</span>
        Spesa
      </button>

      {delDialog}
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
    </>
  )
}
