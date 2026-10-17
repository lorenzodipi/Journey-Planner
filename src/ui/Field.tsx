import type { ComponentChildren } from 'preact'

const inputClass = 'min-h-12 w-full rounded-2xl border border-line bg-bg px-4'

interface TextProps {
  label: string
  value: string
  onInput: (value: string) => void
  type?: 'text' | 'date'
  placeholder?: string
  list?: string
  autoComplete?: string
  required?: boolean
  maxLength?: number
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
