// «Pagato da» con più persone: ogni nome si accende e si spegne. Con una sola persona ha pagato lei; con più persone
// il totale si divide in parti uguali (es. 311,50 € a testa su 623 €). Usato dai fogli di volo e trasporto.
import { Chip } from './base'
import type { Traveler } from '../types'

export function ChiHaPagato({ travelers, value, onChange, error }: { travelers: Pick<Traveler, 'id' | 'name'>[]; value: string[]; onChange: (ids: string[]) => void; error?: string }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  return (
    <div className="fa-fld" role="group" aria-label="Pagato da">
      Pagato da
      <div className="fa-chips wrap">
        {travelers.map((p) => (
          <Chip key={p.id} on={value.includes(p.id)} onPress={() => toggle(p.id)}>
            {p.name.split(/\s+/)[0]}
          </Chip>
        ))}
      </div>
      {value.length > 1 ? <span className="fa-help">Hanno pagato in {value.length}: il totale si divide in parti uguali tra loro.</span> : null}
      {error ? (
        <span className="fa-help bad" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
