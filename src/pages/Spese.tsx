import { useState } from 'preact/hooks'
import { expenseBase, expensesOf, fxOf, personSummary, shareOf, summarizeExpenses } from '../lib/budget'
import { dateInZone } from '../lib/flights'
import { formatShort } from '../lib/dates'
import { extraCurrencies, formatMoney } from '../lib/money'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Expense, Traveler } from '../types'
import { TrashButton } from '../ui/ConfirmDialog'
import { ExpenseForm } from '../ui/ExpenseForm'
import { FxCard } from '../ui/FxCard'
import { ChevronRightIcon } from '../ui/Icons'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { PlaceDisc } from '../ui/PlaceDisc'
import { themeColor } from '../ui/placeMeta'
import { Receipt } from '../ui/Receipt'
import { Avatar, Fab, Ticket } from '../ui/Ticket'
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

  // dalla più recente: la data sta nella riga di ogni spesa
  const list = [...shown].sort((x, y) => y.spentAt.localeCompare(x.spentAt))
  const pctOfTotal = (n: number) => (summary.total > 0 ? Math.round((n / summary.total) * 100) : 0)
  const perHead = summary.spentBy.map((x) => ({ p: person.get(x.travelerId), amount: x.amount }))
  const shares = perHead.every((x) => x.amount === perHead[0]?.amount) ? perHead[0]?.amount : undefined

  const transferBox = (lines: { from: string; to: string; amount: number }[], sub?: string) => (
    <div class="mt-3.5 rounded-xl border-2 border-paper-ink bg-white px-3 py-2.5">
      {lines.map((x) => {
        const from = person.get(x.from)
        const to = person.get(x.to)
        return (
          <div key={`${x.from}-${x.to}`} class="mb-1.5 last:mb-0">
            <div class="flex items-center gap-2">
              {from && <Avatar name={from.name} color={from.color} size={30} />}
              <ChevronRightIcon size={18} class="text-paper-muted" />
              {to && <Avatar name={to.name} color={to.color} size={30} />}
              <span class="flex-1" />
              <span class="text-2xl font-extrabold tracking-[-0.5px] tabular-nums text-[#1559c7]">{formatMoney(x.amount, base)}</span>
            </div>
            <p class="mt-1.5 text-sm font-extrabold">
              {from?.name} deve a {to?.name} {formatMoney(x.amount, base)}
            </p>
          </div>
        )
      })}
      {sub && <p class="text-xs text-paper-muted">{sub}</p>}
    </div>
  )

  const settleSub = shares !== undefined && trip.travelers.length > 1 ? `Spese divise · ${formatMoney(shares, base)} a testa` : undefined

  return (
    <>
      <PageHeader title="Spese" back={{ href: '/altro/budget', label: 'Budget' }} />
      <div class="px-5" style={{ paddingBottom: '8rem' }}>
        {trip.travelers.length > 1 && (
          <div role="tablist" aria-label="Spese per persona" class="mb-3.5 flex gap-0.5 rounded-[14px] border-2 border-line bg-surface p-[3px]">
            <button
              type="button"
              role="tab"
              aria-selected={!selected}
              onClick={() => setWho('all')}
              class={`min-h-10 min-w-0 flex-1 truncate rounded-[10px] px-1 text-sm font-extrabold ${!selected ? 'bg-accent text-white' : 'text-muted'}`}
            >
              Tutti
            </button>
            {trip.travelers.map((p) => (
              <button
                type="button"
                role="tab"
                key={p.id}
                aria-selected={selected?.id === p.id}
                onClick={() => setWho(p.id)}
                class={`min-h-10 min-w-0 flex-1 truncate rounded-[10px] px-1 text-sm font-extrabold ${selected?.id === p.id ? 'bg-accent text-white' : 'text-muted'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <Receipt>
          {selected && me ? (
            <>
              <p class="text-[13px] text-paper-muted">Speso da {selected.name}</p>
              <p class="font-display text-[44px] font-extrabold leading-[1.05] tracking-[-2px] tabular-nums">{formatMoney(me.paid, base)}</p>
              <p class="text-[13px] text-paper-muted">
                in {shown.filter((e) => e.paidBy === selected.id).length} {shown.filter((e) => e.paidBy === selected.id).length === 1 ? 'spesa' : 'spese'} · {pctOfTotal(me.paid)}% del totale
              </p>
              <p class="mt-1 text-sm font-extrabold">La sua parte: {formatMoney(me.share, base)}</p>
              <div class="mt-3 rounded-xl border-2 border-paper-ink bg-white px-3 py-2.5 text-sm font-extrabold">
                {me.gives.length === 0 && me.receives.length === 0 ? (
                  <p>È pari: non deve né ricevere né dare.</p>
                ) : (
                  <>
                    {me.gives.map((x) => (
                      <p key={`g${x.to}`}>
                        Deve dare {formatMoney(x.amount, base)} a {person.get(x.to)?.name}
                      </p>
                    ))}
                    {me.receives.map((x) => (
                      <p key={`r${x.from}`}>
                        Deve ricevere {formatMoney(x.amount, base)} da {person.get(x.from)?.name}
                      </p>
                    ))}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <p class="text-[13px] text-paper-muted">Speso finora</p>
              <p class="font-display text-[44px] font-extrabold leading-[1.05] tracking-[-2px] tabular-nums">{formatMoney(summary.total, base)}</p>
              <p class="text-[13px] text-paper-muted">
                in {trip.expenses.length} {trip.expenses.length === 1 ? 'spesa' : 'spese'}
              </p>
              {trip.travelers.length > 1 &&
                trip.expenses.length > 0 &&
                (summary.transfers.length === 0 ? (
                  <div class="mt-3.5 rounded-xl border-2 border-paper-ink bg-white px-3 py-2.5 text-sm font-extrabold">Siete pari: nessuno deve niente.</div>
                ) : (
                  transferBox(summary.transfers, settleSub)
                ))}
            </>
          )}
          {summary.unconverted.length > 0 && (
            <p role="alert" class="mt-3 rounded-lg border-2 border-ink px-3 py-2 text-xs font-extrabold">
              Manca il cambio per {summary.unconverted.join(', ')}: quelle spese non sono nei totali.
            </p>
          )}
        </Receipt>

        {trip.localCurrency && trip.localCurrency !== trip.baseCurrency && (
          <div class="mt-[18px]">
            <FxCard trip={trip} />
          </div>
        )}

        {trip.expenses.length === 0 ? (
          <div class="mt-[18px]">
            <EmptyState title="Nessuna spesa" text="Tocca + e scrivi importo e cosa hai pagato: in yen il cambio si calcola da solo." />
          </div>
        ) : shown.length === 0 ? (
          <div class="mt-[18px]">
            <EmptyState title="Niente qui" text={`Nessuna spesa riguarda ${selected?.name ?? 'questa persona'}.`} />
          </div>
        ) : (
          <ul class="mt-[18px] space-y-3.5">
            {list.map((e) => {
              const inBase = expenseBase(e, fx)
              const payer = e.paidBy ? person.get(e.paidBy) : undefined
              const share = mine(e)
              const color = themeColor(e.category ?? '')
              return (
                <li key={e.id}>
                  <Ticket stub={<PlaceDisc category={e.category} color={color} />}>
                    <button type="button" onClick={() => setSheet({ kind: 'edit', expense: e })} aria-label={`Modifica ${e.label}`} class="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span class="min-w-0 flex-1">
                        <span class="block text-[17px] font-extrabold leading-tight">{e.label}</span>
                        <span class="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                          {payer && <Avatar name={payer.name} color={payer.color} size={20} />}
                          <span class="min-w-0 truncate">
                            {[payer?.name, formatShort(dateInZone(e.spentAt, trip.timezone))].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        {selected && share !== null && <span class="block text-xs font-extrabold text-pale">quota {formatMoney(share, base)}</span>}
                      </span>
                      <span class="shrink-0 text-right">
                        <span class="block text-[17px] font-extrabold tabular-nums">{formatMoney(e.amount, e.currency)}</span>
                        {e.currency !== base && inBase !== null && <span class="block text-xs text-muted">≈ {formatMoney(inBase, base)}</span>}
                        {e.currency !== base && inBase === null && extraCurrencies(trip).length > 0 && <span class="block text-xs font-extrabold text-warn">manca il cambio</span>}
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
                  </Ticket>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Fab label="Spesa" wide onClick={() => setSheet({ kind: 'new' })} />

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
