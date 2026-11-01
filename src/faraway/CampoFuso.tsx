// Fuso orario scelto da un elenco (non scritto a mano): prima quelli del viaggio e i più usati, poi tutti per area.
import { useId, useMemo } from 'react'
import { fusiRaggruppati } from '../lib/timezones'

export function CampoFuso({ label, value, onChange, usati = [] }: { label: string; value: string; onChange: (zone: string) => void; usati?: string[] }) {
  const id = useId()
  const gruppi = useMemo(() => fusiRaggruppati(...usati, value), [usati.join('|'), value]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fa-fld">
      <label htmlFor={id}>{label}</label>
      <span className="fa-in">
        <select id={id} value={value} onChange={(e) => onChange(e.currentTarget.value)}>
          {value ? null : <option value="">Scegli il fuso orario</option>}
          {gruppi.map((g) => (
            <optgroup key={g.gruppo} label={g.gruppo}>
              {g.zone.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </span>
    </div>
  )
}
