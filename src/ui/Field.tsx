import { segnaposto } from '../faraway/base'
import type { ReactNode } from 'react'

// campi delle schede rimaste del primo disegno (ripristino, KMZ, posizioni, collegamento account):
// riquadro con etichetta piccola sopra il valore

interface TextProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  maxLength?: number
}

export function TextField({ label, value, onChange, placeholder, ...rest }: TextProps) {
  return (
    <label className="fld">
      <div>
        <span className="l">{label}</span>
        {/* come in Campo: ogni campo vuoto dice cosa scrivere, anche dove chi lo usa non ha dato un segnaposto */}
        <input type="text" className="v" value={value} onChange={(e) => onChange(e.currentTarget.value)} placeholder={placeholder ?? segnaposto(label, 'text', false)} {...rest} />
      </div>
    </label>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="formerr">
      {message}
    </p>
  )
}

export function PrimaryButton({
  children,
  busy,
  disabled,
}: {
  children: ReactNode
  busy?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="btn block"
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
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={danger ? 'btn line block' : 'btn soft block'}
      style={danger ? { color: 'var(--danger)', boxShadow: 'inset 0 0 0 1.5px var(--danger)' } : undefined}
    >
      {children}
    </button>
  )
}
