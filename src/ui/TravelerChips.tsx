import type { Traveler } from '../types'

/** Scelta multipla dei viaggiatori, a chip colorati. */
export function TravelerChips({
  label,
  travelers,
  selected,
  onChange,
  hint,
}: {
  label: string
  travelers: Traveler[]
  selected: string[]
  onChange: (ids: string[]) => void
  hint?: string
}) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  return (
    <fieldset class="fgroup">
      <legend>{label}</legend>
      <div class="chips">
        {travelers.map((t) => {
          const on = selected.includes(t.id)
          return (
            <button type="button" aria-pressed={on} onClick={() => toggle(t.id)} class={`chip${on ? ' on' : ''}`}>
              <span aria-hidden="true" style={{ width: '12px', height: '12px', borderRadius: '9999px', background: t.color, boxShadow: '0 0 0 2px var(--surface-card)' }} />
              {t.name}
            </button>
          )
        })}
      </div>
      {hint && <p class="b-sm muted" style={{ marginTop: '8px' }}>{hint}</p>}
    </fieldset>
  )
}
