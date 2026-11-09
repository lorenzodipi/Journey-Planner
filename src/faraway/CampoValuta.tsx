// Valuta scelta da un elenco, non scritta a mano: le valute del viaggio (`valute`) oppure, con `tutte`, tutte le valute con il nome.
import { useId, useMemo } from 'react'
import { currencyGroups } from '../lib/currencies'

export function CampoValuta({ value, onChange, valute = [], label = 'Valuta', tutte, hint }: { value: string; onChange: (valuta: string) => void; valute?: string[]; label?: string; /** tutte le valute del mondo, «EUR · Euro», le più usate in cima */ tutte?: boolean; hint?: string }) {
  const id = useId()
  const gruppi = useMemo(() => (tutte ? currencyGroups(value) : []), [tutte, value])
  return (
    <div className="fa-fld">
      <label htmlFor={id}>{label}</label>
      <span className="fa-in">
        <select id={id} value={value} onChange={(e) => onChange(e.currentTarget.value)} aria-describedby={hint ? `${id}-h` : undefined}>
          {tutte
            ? gruppi.map((g) => (
                <optgroup key={g.gruppo} label={g.gruppo}>
                  {g.valute.map((v) => (
                    <option key={v.code} value={v.code}>
                      {v.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : valute.map((c) => (
                <option key={c} value={c}>
                  {c}
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
