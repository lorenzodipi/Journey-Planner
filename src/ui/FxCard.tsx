import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { baseToLocal, examples, fieldText, formatRateNumber, localPerBase, localToBase } from '../lib/fx'
import { formatMoney, parseAmount } from '../lib/money'
import type { Trip } from '../types'
import { Card } from './PageHeader'

interface Props {
  trip: Trip
  /** Apre la modifica del cambio. Senza, mostra un link alla pagina Budget. */
  onEdit?: () => void
}

/**
 * Cambio del viaggio, letto al contrario ("1 € = 178,57 ¥"), esempi da 10 e 100 e un convertitore
 * a due campi: si scrive in una valuta e l'altra si calcola, in entrambi i sensi.
 */
export function FxCard({ trip, onEdit }: Props) {
  const base = trip.baseCurrency
  const local = trip.localCurrency
  const rate = trip.fxRate
  // si ricorda quale campo ha scritto l'utente: l'altro si ricalcola (anche se il tasso cambia)
  const [side, setSide] = useState<'base' | 'local'>('base')
  const [raw, setRaw] = useState('')
  if (!local) return null

  const editLabel = rate ? 'Modifica' : 'Imposta'
  const header = (
    <div class="flex items-center gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Cambio</p>
        {rate ? (
          <p class="font-display text-xl font-semibold">
            1 {base} = {formatRateNumber(localPerBase(rate))} {local}
          </p>
        ) : (
          <p class="font-medium">Imposta il cambio {base} ↔ {local}</p>
        )}
      </div>
      {onEdit ? (
        <button type="button" onClick={onEdit} class="min-h-11 rounded-full px-3 text-sm font-medium text-accent">
          {editLabel}
        </button>
      ) : (
        <Link href="/altro/budget" class="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-accent">
          {editLabel}
        </Link>
      )}
    </div>
  )

  if (!rate) return <Card>{header}</Card>

  const typed = parseAmount(raw)
  const baseText = side === 'base' ? raw : typed === null ? '' : fieldText(localToBase(typed, rate, base))
  const localText = side === 'local' ? raw : typed === null ? '' : fieldText(baseToLocal(typed, rate, local))

  return (
    <Card>
      {header}
      <ul class="mt-3 divide-y divide-line border-t border-line text-sm" aria-label={`Esempi di cambio da ${base} a ${local}`}>
        {examples(rate, local, [10, 100]).map((x) => (
          <li class="flex min-h-11 items-center justify-between gap-2">
            <span class="text-muted">{formatMoney(x.base, base)}</span>
            <span class="font-medium">{formatMoney(x.local, local)}</span>
          </li>
        ))}
      </ul>

      <div class="mt-3 rounded-2xl bg-bg p-3">
        <p class="mb-2 text-sm font-medium">Calcola un importo</p>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-xs text-muted">{base}</span>
            <input
              type="text"
              inputMode="decimal"
              value={baseText}
              placeholder="0"
              aria-label={`Importo in ${base}`}
              onInput={(e) => {
                setSide('base')
                setRaw(e.currentTarget.value)
              }}
              class="min-h-12 w-full rounded-2xl border border-line bg-surface px-4"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs text-muted">{local}</span>
            <input
              type="text"
              inputMode="decimal"
              value={localText}
              placeholder="0"
              aria-label={`Importo in ${local}`}
              onInput={(e) => {
                setSide('local')
                setRaw(e.currentTarget.value)
              }}
              class="min-h-12 w-full rounded-2xl border border-line bg-surface px-4"
            />
          </label>
        </div>
        {raw.trim() !== '' && typed === null && <p class="mt-2 text-xs text-danger">Scrivi un numero (es. 1200 o 12,50).</p>}
      </div>
    </Card>
  )
}
