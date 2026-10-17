import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { budgetLines, fxOf, groupByCategory, logisticsLines, shareAmounts, summarizeLines, toBase, type Line } from '../lib/budget'
import { formatShort } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { BudgetItem } from '../types'
import { BudgetItemForm } from '../ui/BudgetItemForm'
import { FxForm } from '../ui/FxForm'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'

type SheetState = { kind: 'new' } | { kind: 'edit'; item: BudgetItem } | { kind: 'fx' } | null

const SOURCE_HREF = { flight: '/altro/trasporti', stay: '/altro/alloggi', transport: '/altro/trasporti' } as const

export function Budget() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const close = () => setSheet(null)
  const fx = fxOf(trip)
  const base = trip.baseCurrency
  const hasLocal = !!trip.localCurrency && trip.localCurrency !== base

  const lines: Line[] = [...budgetLines(trip.budget), ...logisticsLines(trip)]
  const summary = summarizeLines(lines, trip.travelers, fx)
  const groups = groupByCategory(lines)
  const itemById = new Map(trip.budget.map((b) => [b.id, b]))
  const traveler = new Map(trip.travelers.map((p) => [p.id, p]))

  async function togglePaid(shareId: string, paid: boolean) {
    const message = await t.setBudgetSharePaid(shareId, !paid)
    if (message) showToast(message)
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

        {hasLocal && (
          <Card>
            <div class="flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">Cambio</p>
                <p class="font-medium">
                  {trip.fxRate ? `1 ${trip.localCurrency} = ${String(trip.fxRate).replace('.', ',')} ${base}` : `Imposta il cambio ${trip.localCurrency} → ${base}`}
                </p>
              </div>
              <button type="button" onClick={() => setSheet({ kind: 'fx' })} class="min-h-11 rounded-full px-3 text-sm font-medium text-accent">
                {trip.fxRate ? 'Modifica' : 'Imposta'}
              </button>
            </div>
          </Card>
        )}

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

        {lines.length === 0 ? (
          <EmptyState title="Nessuna voce" text="Aggiungi le spese previste (treni, ingressi, assicurazione…). Voli, alloggi e trasporti con un costo compaiono da soli." />
        ) : (
          groups.map((g) => (
            <section aria-label={g.category}>
              <h2 class="mb-1 px-1 text-sm font-semibold text-muted">{g.category}</h2>
              <Card class="!p-0">
                <ul class="divide-y divide-line">
                  {g.lines.map((l) => {
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
                      <li class="px-4 py-2">
                        {item ? (
                          <button type="button" onClick={() => setSheet({ kind: 'edit', item })} class="flex min-h-11 w-full items-center gap-3 text-left">
                            {body}
                          </button>
                        ) : (
                          <Link href={SOURCE_HREF[l.source as 'flight' | 'stay' | 'transport']} class="flex min-h-11 items-center gap-3">
                            {body}
                          </Link>
                        )}
                        {item && item.shares.length > 0 && trip.travelers.length > 0 && (
                          <div class="mb-1 flex flex-wrap gap-2">
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
                          <p class="mb-1 text-xs text-muted">
                            {l.shares.length > 0 && l.shares.every((s) => s.paid) ? '✓ Pagato' : '○ Da pagare'}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </section>
          ))
        )}

        <button type="button" onClick={() => setSheet({ kind: 'new' })} class="min-h-12 w-full rounded-full bg-accent px-6 font-semibold text-accent-ink">
          + Aggiungi voce
        </button>
      </div>

      <Sheet open={sheet !== null} title={sheet?.kind === 'new' ? 'Nuova voce' : sheet?.kind === 'fx' ? 'Cambio' : 'Modifica voce'} onClose={close}>
        {sheet?.kind === 'new' && <BudgetItemForm trip={trip} onSubmit={(i) => t.createBudgetItem(trip.id, i)} onDone={close} />}
        {sheet?.kind === 'edit' && (
          <BudgetItemForm
            key={sheet.item.id}
            trip={trip}
            initial={sheet.item}
            onSubmit={(i) => t.updateBudgetItem(trip.id, sheet.item, i)}
            onDelete={async () => {
              const id = sheet.item.id
              const message = await t.setBudgetItemDeleted(id, true)
              if (!message) showToast('Voce eliminata', { label: 'Annulla', run: () => void t.setBudgetItemDeleted(id, false) })
              return message
            }}
            onDone={close}
          />
        )}
        {sheet?.kind === 'fx' && <FxForm trip={trip} onSubmit={(r) => t.setFxRate(trip.id, r)} onDone={close} />}
      </Sheet>
    </>
  )
}
