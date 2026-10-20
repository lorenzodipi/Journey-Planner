import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { currencyName, extraCurrencies } from '../lib/money'
import { useTrips } from '../state/trips'
import { AddCurrencySheet } from './AddCurrency'
import { DatePicker } from './DatePicker'
import { TickIcon } from './Icons'
import { Select } from './Select'

const inputClass = 'min-h-12 w-full rounded-[14px] border-2 border-line bg-bg px-3.5 text-base placeholder:text-muted/70'
const labelClass = 'mb-1 block text-[13px] font-extrabold'

interface TextProps {
  label: string
  value: string
  onInput: (value: string) => void
  type?: 'text' | 'date' | 'time'
  placeholder?: string
  list?: string
  autoComplete?: string
  required?: boolean
  maxLength?: number
  inputMode?: 'decimal' | 'numeric' | 'text'
  /** Per data e ora: il valore più basso scelto (es. «al» non prima di «dal»). */
  min?: string
  /** Solo per le date: il campo si può svuotare («Nessuna data»). */
  optional?: boolean
}

export function TextField({ label, value, onInput, type = 'text', list, optional, ...rest }: TextProps) {
  // le date hanno il calendario nostro, dove i giorni oltre il limite non si possono toccare
  if (type === 'date') return <DatePicker label={label} value={value} onInput={onInput} min={rest.min} optional={optional} />
  const common = {
    value,
    onInput: (e: Event) => {
      const input = e.currentTarget as HTMLInputElement
      // un orario sotto il minimo (es. «alle» prima di «dalle») torna subito al minimo: il selettore del telefono non può bloccarlo
      if (type === 'time' && rest.min && input.value && input.value < rest.min) {
        input.value = rest.min
        return onInput(rest.min)
      }
      onInput(input.value)
    },
    class: inputClass,
    ...rest,
  }
  return (
    <label class="block">
      <span class={labelClass}>{label}</span>
      {list ? (
        <input type="text" list={list} {...common} />
      ) : type === 'time' ? (
        <input type="time" {...common} />
      ) : (
        <input type="text" {...common} />
      )}
    </label>
  )
}

export function TextArea({
  label,
  value,
  onInput,
  placeholder,
}: {
  label: string
  value: string
  onInput: (value: string) => void
  placeholder?: string
}) {
  return (
    <label class="block">
      <span class={labelClass}>{label}</span>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onInput={(e) => onInput(e.currentTarget.value)}
        class="w-full rounded-[14px] border-2 border-line bg-bg px-3.5 py-3 text-base"
      />
    </label>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" class="rounded-2xl border-2 border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
      {message}
    </p>
  )
}

export function PrimaryButton({
  children,
  busy,
  disabled,
}: {
  children: ComponentChildren
  busy?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      class="min-h-[52px] w-full rounded-full bg-accent px-6 text-base font-extrabold text-accent-ink transition-opacity disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  onClick,
  danger,
}: {
  children: ComponentChildren
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={`min-h-[52px] w-full rounded-full border-2 px-6 text-base font-extrabold ${danger ? 'border-danger text-danger' : 'border-line'}`}
    >
      {children}
    </button>
  )
}

/** Casella da spuntare con etichetta, area di tocco ampia. */
export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="flex min-h-11 cursor-pointer items-center gap-2.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} class="peer sr-only" />
      <span class="grid size-6 shrink-0 place-items-center rounded-[7px] border-2 border-line text-accent-ink peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
        <TickIcon size={16} stroke-width={3.4} />
      </span>
      <span class="text-[15px] font-extrabold">{label}</span>
    </label>
  )
}

/** Scelta singola tra poche opzioni, a chip. */
export function ChipSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend class={labelClass}>{label}</legend>
      <div class="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            class={`min-h-11 rounded-full border-2 px-4 text-sm font-extrabold ${
              value === o.value ? 'border-accent bg-accent-soft text-pale' : 'border-line text-muted'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Importo + valuta + "per persona / totale". */
export function CostFields({
  amount,
  currency,
  currencies,
  scope,
  onAmount,
  onCurrency,
  onScope,
  amountLabel = 'Costo',
  withScope = true,
}: {
  amount: string
  currency: string
  /** Valute tra cui scegliere (quelle del viaggio). Con una sola, il campo è in sola lettura. */
  currencies: string[]
  scope: 'per_person' | 'total'
  onAmount: (v: string) => void
  onCurrency: (v: string) => void
  onScope: (v: 'per_person' | 'total') => void
  amountLabel?: string
  withScope?: boolean
}) {
  // «Altra valuta…» compare solo nei viaggi che hanno già almeno una valuta extra: gli altri restano come sempre
  // (la prima valuta extra si aggiunge da Budget → Cambio → Modifica).
  const trip = useTrips().active
  const [adding, setAdding] = useState(false)
  const canAdd = !!trip && extraCurrencies(trip).length > 0
  return (
    <div class="space-y-3">
      {canAdd && trip && <AddCurrencySheet open={adding} trip={trip} onClose={() => setAdding(false)} onAdded={onCurrency} />}
      <div class="grid grid-cols-[1fr_7.5rem] gap-3">
        <TextField label={amountLabel} value={amount} onInput={onAmount} inputMode="decimal" placeholder="0,00" />
        <Select
          label="Valuta"
          value={currency}
          onChange={onCurrency}
          readOnly={currencies.length <= 1}
          options={currencies.map((c) => ({ value: c, label: c, hint: currencyName(c) }))}
          extra={canAdd ? { label: '+ Altra valuta…', onPick: () => setAdding(true) } : undefined}
        />
      </div>
      {withScope && (
        <ChipSelect
          label="L'importo è"
          value={scope}
          onChange={onScope}
          options={[
            { value: 'per_person', label: 'A persona' },
            { value: 'total', label: 'Totale per tutti' },
          ]}
        />
      )}
    </div>
  )
}
