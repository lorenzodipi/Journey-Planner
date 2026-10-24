import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { currencyName, extraCurrencies } from '../lib/money'
import { useTrips } from '../state/trips'
import { AddCurrencySheet } from './AddCurrency'
import { DatePicker } from './DatePicker'
import { TickIcon } from './Icons'
import { Select } from './Select'

// campi come nel Design System v3: riquadro con etichetta piccola sopra il valore

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
    class: 'v',
    ...rest,
  }
  return (
    <label class="fld">
      <div>
        <span class="l">{label}</span>
        {list ? (
          <input type="text" list={list} {...common} />
        ) : type === 'time' ? (
          <input type="time" {...common} />
        ) : (
          <input type="text" {...common} />
        )}
      </div>
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
    <label class="fld" style={{ alignItems: 'flex-start' }}>
      <div>
        <span class="l">{label}</span>
        <textarea rows={3} value={value} placeholder={placeholder} onInput={(e) => onInput(e.currentTarget.value)} class="v" />
      </div>
    </label>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" class="formerr">
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
      class="btn block"
      style={busy || disabled ? { opacity: 0.5 } : undefined}
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
      class={danger ? 'btn line block' : 'btn soft block'}
      style={danger ? { color: 'var(--danger)', boxShadow: 'inset 0 0 0 1.5px var(--danger)' } : undefined}
    >
      {children}
    </button>
  )
}

/** Casella da spuntare con etichetta, area di tocco ampia. */
export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="chk">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
      <span class="cb">
        <TickIcon size={16} stroke-width={3.4} />
      </span>
      <span>{label}</span>
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
    <fieldset class="fgroup">
      <legend>{label}</legend>
      <div class="chips">
        {options.map((o) => (
          <button type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)} class={`chip${value === o.value ? ' on' : ''}`}>
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
  // (la prima valuta extra si aggiunge da Spese → Cambio → Modifica).
  const trip = useTrips().active
  const [adding, setAdding] = useState(false)
  const canAdd = !!trip && extraCurrencies(trip).length > 0
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {canAdd && trip && <AddCurrencySheet open={adding} trip={trip} onClose={() => setAdding(false)} onAdded={onCurrency} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 7.5rem", gap: "12px" }}>
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
