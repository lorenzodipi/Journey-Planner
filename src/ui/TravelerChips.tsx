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
    <fieldset>
      <legend class="mb-1 block text-sm font-medium">{label}</legend>
      <div class="flex flex-wrap gap-2">
        {travelers.map((t) => {
          const on = selected.includes(t.id)
          return (
            <button
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t.id)}
              class={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
                on ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'
              }`}
            >
              <span aria-hidden="true" class="h-3 w-3 rounded-full" style={{ background: t.color }} />
              {t.name}
            </button>
          )
        })}
      </div>
      {hint && <p class="mt-1 text-xs text-muted">{hint}</p>}
    </fieldset>
  )
}
