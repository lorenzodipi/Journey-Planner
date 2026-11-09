// Paese scelto da un elenco con tutti i paesi (nome in italiano, in ordine alfabetico), non scritto a mano. Il valore è il codice ISO.
import { useId } from 'react'
import { COUNTRIES } from '../lib/countries'

export function CampoPaese({ label, value, onChange, vuoto = 'Non indicato', hint }: { label: string; value: string; onChange: (codice: string) => void; /** testo della voce che toglie la scelta */ vuoto?: string; hint?: string }) {
  const id = useId()
  const fuori = value && !COUNTRIES.some((c) => c.code === value)
  return (
    <div className="fa-fld">
      <label htmlFor={id}>{label}</label>
      <span className="fa-in">
        <select id={id} value={value} onChange={(e) => onChange(e.currentTarget.value)} aria-describedby={hint ? `${id}-h` : undefined}>
          <option value="">{vuoto}</option>
          {fuori ? <option value={value}>{value}</option> : null}
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </span>
      {hint ? (
        <span id={`${id}-h`} className="fa-help">
          {hint}
        </span>
      ) : null}
    </div>
  )
}
