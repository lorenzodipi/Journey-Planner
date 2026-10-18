import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { baseToLocal, examples, fieldText, formatRateNumber, localPerBase, localToBase } from '../lib/fx'
import { currencySymbol, formatMoney, parseAmount } from '../lib/money'
import type { Trip } from '../types'
import { SwapIcon } from './Icons'
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
      <SwapIcon size={24} class="shrink-0 text-pale" />
      <div class="min-w-0 flex-1">
        <p class="text-[13px] text-muted">Cambio</p>
        {rate ? (
          <p class="font-display text-[22px] font-extrabold leading-tight tracking-[-0.5px]">
            1 {currencySymbol(base)} = {formatRateNumber(localPerBase(rate))} {currencySymbol(local)}
          </p>
        ) : (
          <p class="font-extrabold">Imposta il cambio {base} ↔ {local}</p>
        )}
      </div>
      {onEdit ? (
        <button type="button" onClick={onEdit} class="min-h-11 px-1 text-sm font-extrabold text-pale">
          {editLabel}
        </button>
      ) : (
        <Link href="/altro/budget" class="inline-flex min-h-11 items-center px-1 text-sm font-extrabold text-pale">
          {editLabel}
        </Link>
      )}
    </div>
  )

  if (!rate) return <Card>{header}</Card>

  const typed = parseAmount(raw)
  const baseText = side === 'base' ? raw : typed === null ? '' : fieldText(localToBase(typed, rate, base))
  const localText = side === 'local' ? raw : typed === null ? '' : fieldText(baseToLocal(typed, rate, local))
  const ex = examples(rate, local, [10, 100])

  return (
    <Card class="px-4 py-3.5">
      {header}
      <ul class="mt-2 flex border-t-2 border-dashed border-line text-sm" aria-label={`Esempi di cambio da ${base} a ${local}`}>
        {ex.map((x, i) => (
          <li class={`flex min-h-11 flex-1 items-center justify-between ${i === 0 ? 'border-r-2 border-dashed border-line pr-3' : 'pl-3'}`}>
            <span class="text-muted">{formatMoney(x.base, base)}</span>
            <span class="font-extrabold">{formatMoney(x.local, local)}</span>
          </li>
        ))}
      </ul>

      <div class="mt-1.5 rounded-xl bg-bg px-3 py-2.5">
        <p class="mb-2 text-sm font-extrabold">Calcola un importo</p>
        <div class="grid grid-cols-2 gap-2.5">
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
              class="min-h-12 w-full rounded-[14px] border-2 border-line bg-surface px-3.5 text-base"
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
              class="min-h-12 w-full rounded-[14px] border-2 border-line bg-surface px-3.5 text-base"
            />
          </label>
        </div>
        {raw.trim() !== '' && typed === null && <p class="mt-2 text-xs text-danger">Scrivi un numero (es. 1200 o 12,50).</p>}
      </div>
    </Card>
  )
}
