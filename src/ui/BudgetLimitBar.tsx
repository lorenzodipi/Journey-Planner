import { budgetLine, type BudgetStatus } from '../lib/budget'
import { formatMoney } from '../lib/money'

// Colori dello stato sulla carta chiara dello scontrino (i token seguono il tema); il testo dice lo stesso a parole.
const FILL = { ok: 'var(--ok)', warn: 'var(--warn)', over: 'var(--danger)' } as const

/** Barra «speso rispetto al budget massimo»; il segno scuro è dove arriva il previsto. */
export function BudgetLimitBar({ status, spent, limit, currency }: { status: BudgetStatus; spent: number; limit: number; currency: string }) {
  return (
    <div className="mt-3.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-extrabold">Budget massimo</span>
        <span className="tabular-nums text-paper-muted">{formatMoney(limit, currency)}</span>
      </div>
      <div
        role="meter"
        aria-label="Speso rispetto al budget massimo"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(spent, limit)}
        aria-valuetext={budgetLine(status, spent, limit, currency)}
        className="relative mt-1.5 h-2.5 rounded-full bg-surface-high"
      >
        <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${status.spentPct}%`, background: FILL[status.state] }} />
        {status.plannedPct > 0 && status.plannedPct < 100 && (
          <i aria-hidden="true" className="absolute -inset-y-[3px] block w-0.5 rounded bg-paper-ink" style={{ left: `calc(${status.plannedPct}% - 1px)` }} />
        )}
      </div>
      <p className="mt-1.5 text-[13px] font-extrabold" style={{ color: FILL[status.state] }}>
        {budgetLine(status, spent, limit, currency)}
      </p>
    </div>
  )
}
