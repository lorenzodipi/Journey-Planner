import type { ComponentChildren } from 'preact'

const inputClass = 'min-h-12 w-full rounded-2xl border border-line bg-bg px-4'

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
      <span class="mb-1 block text-sm font-medium">{label}</span>
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
      <span class="mb-1 block text-sm font-medium">{label}</span>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onInput={(e) => onInput(e.currentTarget.value)}
        class="w-full rounded-2xl border border-line bg-bg px-4 py-3"
      />
    </label>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" class="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
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
      class="min-h-12 w-full rounded-full bg-accent px-6 font-semibold text-accent-ink transition-opacity disabled:opacity-50"
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
      class={`min-h-12 w-full rounded-full border border-line px-6 font-medium ${danger ? 'text-danger' : ''}`}
    >
      {children}
    </button>
  )
}

/** Casella da spuntare con etichetta, area di tocco ampia. */
export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="flex min-h-11 items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        class="h-5 w-5 shrink-0 accent-[var(--accent)]"
      />
      <span class="text-sm font-medium">{label}</span>
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
      <legend class="mb-1 block text-sm font-medium">{label}</legend>
      <div class="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            class={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              value === o.value ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'
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
  scope,
  onAmount,
  onCurrency,
  onScope,
  amountLabel = 'Costo',
  withScope = true,
}: {
  amount: string
  currency: string
  scope: 'per_person' | 'total'
  onAmount: (v: string) => void
  onCurrency: (v: string) => void
  onScope: (v: 'per_person' | 'total') => void
  amountLabel?: string
  withScope?: boolean
}) {
  return (
    <div class="space-y-3">
      <div class="grid grid-cols-[1fr_6rem] gap-3">
        <TextField label={amountLabel} value={amount} onInput={onAmount} inputMode="decimal" placeholder="0,00" />
        <TextField label="Valuta" value={currency} onInput={(v) => onCurrency(v.toUpperCase())} maxLength={3} />
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
