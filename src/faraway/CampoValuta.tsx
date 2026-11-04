// Valuta scelta da un elenco (le valute del viaggio), non scritta a mano.
import { useId } from 'react'

export function CampoValuta({ value, onChange, valute, label = 'Valuta' }: { value: string; onChange: (valuta: string) => void; valute: string[]; label?: string }) {
  const id = useId()
  return (
    <div className="fa-fld">
      <label htmlFor={id}>{label}</label>
      <span className="fa-in">
        <select id={id} value={value} onChange={(e) => onChange(e.currentTarget.value)}>
          {valute.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </span>
    </div>
  )
}
