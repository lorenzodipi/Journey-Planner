import type { ComponentChildren } from 'preact'
import { EMPTY_FILTERS, countActive, filterPlaces, toggleValue, type PlaceFilters } from '../lib/placeFilter'
import type { PlaceStatus, Trip } from '../types'
import { STATUSES, STATUS_LABEL, uniqueCities } from './placeMeta'
import { Sheet } from './Sheet'

function Group({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  if (options.length === 0) return null
  return (
    <fieldset>
      <legend class="mb-2 text-sm font-medium">{title}</legend>
      <div class="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            aria-pressed={selected.includes(o.value)}
            onClick={() => onToggle(o.value)}
            class={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
              selected.includes(o.value) ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

interface Props {
  trip: Trip
  open: boolean
  filters: PlaceFilters
  onChange: (f: PlaceFilters) => void
  onClose: () => void
  /** Contenuto extra sotto i filtri (es. colori dei pin nella mappa). */
  children?: ComponentChildren
}

export function FilterSheet({ trip, open, filters, onChange, onClose, children }: Props) {
  const matching = filterPlaces(trip.places, filters).length
  const active = countActive(filters)
  return (
    <Sheet open={open} title="Filtri" onClose={onClose}>
      <div class="space-y-5">
        <p class="-mt-2 text-sm text-muted">Puoi sceglierne più di uno per gruppo.</p>
        <Group
          title="Città"
          options={uniqueCities(trip.places).map((c) => ({ value: c, label: c }))}
          selected={filters.cities}
          onToggle={(v) => onChange({ ...filters, cities: toggleValue(filters.cities, v) })}
        />
        <Group
          title="Categoria"
          options={trip.categories.map((c) => ({ value: c.label, label: c.label }))}
          selected={filters.categories}
          onToggle={(v) => onChange({ ...filters, categories: toggleValue(filters.categories, v) })}
        />
        <Group
          title="Stato"
          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          selected={filters.statuses}
          onToggle={(v) => onChange({ ...filters, statuses: toggleValue(filters.statuses, v as PlaceStatus) })}
        />
        {children}
        <div class="grid grid-cols-[auto_1fr] gap-2 pt-1">
          <button
            type="button"
            disabled={active === 0}
            onClick={() => onChange(EMPTY_FILTERS)}
            class="min-h-12 rounded-full border border-line px-5 font-medium disabled:opacity-40"
          >
            Azzera
          </button>
          <button
            type="button"
            onClick={onClose}
            class="min-h-12 rounded-full bg-accent px-6 font-semibold text-accent-ink"
          >
            Mostra {matching} {matching === 1 ? 'luogo' : 'luoghi'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
