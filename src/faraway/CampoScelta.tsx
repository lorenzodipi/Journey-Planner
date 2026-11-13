// Scelta da un elenco, con l'elenco vero del sistema (<select>): come CampoPaese, ma con le voci date da chi la usa.
import { useId } from 'react'

export function CampoScelta({ label, value, onChange, options }: { label: string; value: string; onChange: (valore: string) => void; options: readonly { value: string; label: string }[] }) {
  const id = useId()
  return (
    <div className="fa-fld">
      <label htmlFor={id}>{label}</label>
      <span className="fa-in">
        <select id={id} value={value} onChange={(e) => onChange(e.currentTarget.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </div>
  )
}
