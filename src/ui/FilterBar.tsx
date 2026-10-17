import { countActive, toggleValue, type PlaceFilters } from '../lib/placeFilter'
import { STATUS_LABEL } from './placeMeta'

interface Props {
  filters: PlaceFilters
  onChange: (f: PlaceFilters) => void
  onOpen: () => void
  label?: string
}

/** Pulsante "Filtri" con i filtri attivi sotto forma di etichette che si tolgono con un tocco. */
export function FilterBar({ filters, onChange, onOpen, label = 'Filtri' }: Props) {
  const active = countActive(filters)
  const chips: { key: string; text: string; remove: () => void }[] = [
    ...filters.cities.map((v) => ({ key: `c:${v}`, text: v, remove: () => onChange({ ...filters, cities: toggleValue(filters.cities, v) }) })),
    ...filters.categories.map((v) => ({ key: `k:${v}`, text: v || 'Senza categoria', remove: () => onChange({ ...filters, categories: toggleValue(filters.categories, v) }) })),
    ...filters.statuses.map((v) => ({ key: `s:${v}`, text: STATUS_LABEL[v], remove: () => onChange({ ...filters, statuses: toggleValue(filters.statuses, v) }) })),
  ]
  return (
    <div class="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        class={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-card ${
          active > 0 ? 'bg-accent text-accent-ink' : 'bg-surface'
        }`}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {label}
        {active > 0 && <span class="rounded-full bg-white/25 px-1.5 text-xs tabular-nums">{active}</span>}
      </button>
      {chips.length > 0 && (
        <div class="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {chips.map((c) => (
            <button
              type="button"
              onClick={c.remove}
              aria-label={`Togli filtro ${c.text}`}
              class="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-sm font-medium text-accent"
            >
              {c.text}
              <span aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
