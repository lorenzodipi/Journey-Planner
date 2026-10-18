import type { ComponentChildren } from 'preact'
import { currencyName } from '../lib/money'
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
}

export function TextField({ label, value, onInput, type = 'text', list, ...rest }: TextProps) {
  const common = {
    value,
    onInput: (e: Event) => onInput((e.currentTarget as HTMLInputElement).value),
    class: inputClass,
    ...rest,
  }
  return (
    <label class="block">
      <span class={labelClass}>{label}</span>
      {list ? (
        <input type="text" list={list} {...common} />
      ) : type === 'date' ? (
        <input type="date" {...common} />
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
  return (
    <div class="space-y-3">
      <div class="grid grid-cols-[1fr_7.5rem] gap-3">
        <TextField label={amountLabel} value={amount} onInput={onAmount} inputMode="decimal" placeholder="0,00" />
        <Select
          label="Valuta"
          value={currency}
          onChange={onCurrency}
          readOnly={currencies.length <= 1}
          options={currencies.map((c) => ({ value: c, label: c, hint: currencyName(c) }))}
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
