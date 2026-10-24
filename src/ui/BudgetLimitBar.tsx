import { budgetLine, type BudgetStatus } from '../lib/budget'
import { formatMoney } from '../lib/money'

// Colori dello stato sulla carta chiara dello scontrino (i token seguono il tema); il testo dice lo stesso a parole.
const FILL = { ok: 'var(--ok)', warn: 'var(--warn)', over: 'var(--danger)' } as const

/** Barra «speso rispetto al budget massimo»; il segno scuro è dove arriva il previsto. */
export function BudgetLimitBar({ status, spent, limit, currency }: { status: BudgetStatus; spent: number; limit: number; currency: string }) {
  return (
    <div class="mt-3.5">
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <span class="font-extrabold">Budget massimo</span>
        <span class="tabular-nums text-paper-muted">{formatMoney(limit, currency)}</span>
      </div>
      <div
        role="meter"
        aria-label="Speso rispetto al budget massimo"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(spent, limit)}
        aria-valuetext={budgetLine(status, spent, limit, currency)}
        class="relative mt-1.5 h-2.5 rounded-full bg-surface-high"
      >
        <i class="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${status.spentPct}%`, background: FILL[status.state] }} />
        {status.plannedPct > 0 && status.plannedPct < 100 && (
          <i aria-hidden="true" class="absolute -inset-y-[3px] block w-0.5 rounded bg-paper-ink" style={{ left: `calc(${status.plannedPct}% - 1px)` }} />
        )}
      </div>
      <p class="mt-1.5 text-[13px] font-extrabold" style={{ color: FILL[status.state] }}>
        {budgetLine(status, spent, limit, currency)}
      </p>
    </div>
  )
}
