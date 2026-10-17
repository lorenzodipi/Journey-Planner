import { useState } from 'preact/hooks'
import { expenseBase, fxOf, summarizeExpenses } from '../lib/budget'
import { dateInZone } from '../lib/flights'
import { formatDay } from '../lib/dates'
import { formatMoney, round2 } from '../lib/money'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Expense } from '../types'
import { ExpenseForm } from '../ui/ExpenseForm'
import { FxCard } from '../ui/FxCard'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'

type SheetState = { kind: 'new' } | { kind: 'edit'; expense: Expense } | null

export function Spese() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)
  const fx = fxOf(trip)
  const base = trip.baseCurrency
  const summary = summarizeExpenses(trip.expenses, trip.travelers, fx)
  const person = new Map(trip.travelers.map((p) => [p.id, p]))

  // raggruppate per giorno (nel fuso del viaggio), dalla più recente
  const byDay = new Map<string, Expense[]>()
  for (const e of trip.expenses) {
    const day = dateInZone(e.spentAt, trip.timezone)
    byDay.set(day, [...(byDay.get(day) ?? []), e])
  }
  const days = Array.from(byDay.keys()).sort().reverse()

  return (
    <>
      <PageHeader title="Spese" subtitle="Quello che spendi in viaggio" back={{ href: '/altro/budget', label: 'Budget' }} />
      <div class="space-y-3 px-4" style={{ paddingBottom: '5rem' }}>
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

        {trip.localCurrency && trip.localCurrency !== trip.baseCurrency && <FxCard trip={trip} />}

        {trip.expenses.length === 0 ? (
          <EmptyState title="Nessuna spesa" text="Tocca + e scrivi importo e cosa hai pagato: in yen il cambio si calcola da solo." />
        ) : (
          days.map((day) => {
            const list = byDay.get(day) ?? []
            const dayTotal = round2(list.reduce((n, e) => n + (expenseBase(e, fx) ?? 0), 0))
            return (
              <section aria-label={formatDay(day)}>
                <h2 class="mb-1 flex items-baseline justify-between px-1 text-sm font-semibold text-muted">
                  <span>{formatDay(day)}</span>
                  <span class="font-medium">{formatMoney(dayTotal, base)}</span>
                </h2>
                <Card class="!p-0">
                  <ul class="divide-y divide-line">
                    {list.map((e) => {
                      const inBase = expenseBase(e, fx)
                      const payer = e.paidBy ? person.get(e.paidBy) : undefined
                      return (
                        <li>
                          <button type="button" onClick={() => setSheet({ kind: 'edit', expense: e })} class="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
                            <span class="min-w-0 flex-1">
                              <span class="block truncate font-medium">{e.label}</span>
                              <span class="block truncate text-xs text-muted">
                                {[e.category, payer && `pagato da ${payer.name}`].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            <span class="shrink-0 text-right">
                              <span class="block font-semibold">{formatMoney(e.amount, e.currency)}</span>
                              {e.currency !== base && inBase !== null && <span class="block text-xs text-muted">≈ {formatMoney(inBase, base)}</span>}
                            </span>
                          </button>
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
