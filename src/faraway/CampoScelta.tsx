// Scelta da un elenco, con l'elenco vero del sistema (<select>): come CampoPaese, ma con le voci date da chi la usa.
// Le voci con `group` finiscono in un <optgroup> (voci vicine con lo stesso gruppo stanno insieme).
import { useId } from 'react'

interface Voce {
  value: string
  label: string
  group?: string
}

export function CampoScelta({ label, value, onChange, options, hint }: { label: string; value: string; onChange: (valore: string) => void; options: readonly Voce[]; hint?: string }) {
  const id = useId()
  const blocchi: { group?: string; voci: Voce[] }[] = []
  for (const o of options) {
    const ultimo = blocchi[blocchi.length - 1]
    if (ultimo && ultimo.group === o.group) ultimo.voci.push(o)
    else blocchi.push({ group: o.group, voci: [o] })
  }
  const voce = (o: Voce) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  )
  return (
    <div className="fa-fld">
      <label htmlFor={id}>{label}</label>
      <span className="fa-in">
        <select id={id} value={value} onChange={(e) => onChange(e.currentTarget.value)} aria-describedby={hint ? `${id}-h` : undefined}>
          {blocchi.map((b, i) =>
            b.group ? (
              <optgroup key={`${b.group}-${i}`} label={b.group}>
                {b.voci.map(voce)}
              </optgroup>
            ) : (
              b.voci.map(voce)
            ),
          )}
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
