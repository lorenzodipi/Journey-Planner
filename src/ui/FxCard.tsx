import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { baseToLocal, examples, fieldText, formatRateNumber, localPerBase, localToBase } from '../lib/fx'
import { currencySymbol, extraCurrencies, formatMoney, parseAmount } from '../lib/money'
import type { Trip } from '../types'
import { SwapIcon } from './Icons'
import { Card } from './PageHeader'

interface Props {
  trip: Trip
  /** Apre la modifica del cambio. Senza, mostra un link alla pagina Spese. */
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
  const [picked, setPicked] = useState<string | null>(null)
  if (!local) return null

  const extras = extraCurrencies(trip)
  if (extras.length > 0) return <MultiFxCard trip={trip} onEdit={onEdit} picked={picked} onPick={setPicked} side={side} setSide={setSide} raw={raw} setRaw={setRaw} extras={extras} />

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
      <ul class="mt-2 flex border-t border-hairline text-sm" aria-label={`Esempi di cambio da ${base} a ${local}`}>
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
              class="min-h-12 w-full rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-base"
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
              class="min-h-12 w-full rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-base"
            />
          </label>
        </div>
        {raw.trim() !== '' && typed === null && <p class="mt-2 text-xs text-danger">Scrivi un numero (es. 1200 o 12,50).</p>}
      </div>
    </Card>
  )
}

interface MultiProps {
  trip: Trip
  onEdit?: () => void
  extras: string[]
  picked: string | null
  onPick: (code: string) => void
  side: 'base' | 'local'
  setSide: (s: 'base' | 'local') => void
  raw: string
  setRaw: (v: string) => void
}

/** Il riquadro dei cambi quando il viaggio ha più di una valuta estera: una riga per valuta e un convertitore con scelta della valuta. */
function MultiFxCard({ trip, onEdit, extras, picked, onPick, side, setSide, raw, setRaw }: MultiProps) {
  const base = trip.baseCurrency
  const local = trip.localCurrency as string
  const rows = [
    { code: local, rate: trip.fxRate, isLocal: true },
    ...extras.map((code) => ({ code, rate: trip.fxRates?.[code], isLocal: false })),
  ]
  const code = rows.some((r) => r.code === picked) ? (picked as string) : local
  const rate = rows.find((r) => r.code === code)?.rate
  const typed = parseAmount(raw)
  const baseText = side === 'base' ? raw : typed === null || !rate ? '' : fieldText(localToBase(typed, rate, base))
  const otherText = side === 'local' ? raw : typed === null || !rate ? '' : fieldText(baseToLocal(typed, rate, code))
  const edit = onEdit ? (
    <button type="button" onClick={onEdit} class="min-h-11 px-1 text-sm font-extrabold text-pale">
      Modifica
    </button>
  ) : (
    <Link href="/altro/budget" class="inline-flex min-h-11 items-center px-1 text-sm font-extrabold text-pale">
      Modifica
    </Link>
  )
  return (
    <Card class="px-4 py-3.5">
      <div class="flex items-center gap-3">
        <SwapIcon size={24} class="shrink-0 text-pale" />
        <div class="min-w-0 flex-1">
          <p class="text-[13px] text-muted">Cambi</p>
          <p class="font-extrabold">Valuta base: {base}</p>
        </div>
        {edit}
      </div>
      <ul class="mt-1">
        {rows.map((r, i) => (
          <li key={r.code} class={`flex min-h-12 items-center gap-3 ${i > 0 ? 'border-t border-hairline' : ''}`}>
            <span class="w-7 shrink-0 text-center text-xl">{currencySymbol(r.code)}</span>
            <span class="min-w-0 flex-1 font-display text-[19px] font-extrabold leading-tight tracking-[-0.5px]">
              {r.rate ? `1 ${currencySymbol(base)} = ${formatRateNumber(localPerBase(r.rate))} ${currencySymbol(r.code)}` : `Manca il cambio ${r.code}`}
            </span>
            {r.isLocal && <span class="rounded-md border-2 border-line px-1.5 text-xs font-extrabold leading-snug text-pale">locale</span>}
          </li>
        ))}
      </ul>

      {rate && (
        <div class="mt-1.5 rounded-xl bg-bg px-3 py-2.5">
          <p class="mb-2 text-sm font-extrabold">Calcola un importo</p>
          <div class="mb-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Valuta da convertire">
            {rows.map((r) => (
              <button
                key={r.code}
                type="button"
                role="radio"
                aria-checked={r.code === code}
                onClick={() => onPick(r.code)}
                class={`chip${r.code === code ? ' on' : ''}`}
              >
                {currencySymbol(r.code)} {r.code}
              </button>
            ))}
          </div>
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
                class="min-h-12 w-full rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-base"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-muted">{code}</span>
              <input
                type="text"
                inputMode="decimal"
                value={otherText}
                placeholder="0"
                aria-label={`Importo in ${code}`}
                onInput={(e) => {
                  setSide('local')
                  setRaw(e.currentTarget.value)
                }}
                class="min-h-12 w-full rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-base"
              />
            </label>
          </div>
          {raw.trim() !== '' && typed === null && <p class="mt-2 text-xs text-danger">Scrivi un numero (es. 1200 o 12,50).</p>}
        </div>
      )}
    </Card>
  )
}
