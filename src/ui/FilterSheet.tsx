import type { ComponentChildren } from 'preact'
import { EMPTY_FILTERS, countActive, filterPlaces, toggleValue, type PlaceFilters } from '../lib/placeFilter'
import { DEFAULT_VIEW, GROUP_LABEL, SORT_LABEL, isDefaultView, type GroupBy, type PlaceView, type SortBy } from '../lib/placeView'
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
      <legend class="mb-2 text-sm font-extrabold">{title}</legend>
      <div class="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            aria-pressed={selected.includes(o.value)}
            onClick={() => onToggle(o.value)}
            class={`min-h-11 rounded-full border-2 px-4 text-sm font-extrabold ${
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

/** Scelta singola (raggruppa per, ordina per): un solo valore alla volta. */
function Choice<T extends string>({
  title,
  value,
  options,
  onPick,
}: {
  title: string
  value: T
  options: { value: T; label: string }[]
  onPick: (v: T) => void
}) {
  return (
    <fieldset>
      <legend class="mb-2 text-sm font-extrabold">{title}</legend>
      <div class="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onPick(o.value)}
            class={`min-h-11 rounded-full border-2 px-4 text-sm font-extrabold ${
              value === o.value ? 'border-pale bg-accent-soft text-pale' : 'border-line text-ink'
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
  /** Se c'è, il pannello offre anche "Raggruppa per" e "Ordina per" (solo nell'elenco Luoghi). */
  view?: PlaceView
  onViewChange?: (v: PlaceView) => void
  /** Contenuto extra sotto i filtri (es. colori dei pin nella mappa). */
  children?: ComponentChildren
}

export function FilterSheet({ trip, open, filters, onChange, onClose, view, onViewChange, children }: Props) {
  const matching = filterPlaces(trip.places, filters).length
  const active = countActive(filters)
  const viewChanged = view != null && !isDefaultView(view)
  return (
    <Sheet open={open} title={view ? 'Filtri e ordine' : 'Filtri'} onClose={onClose}>
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
        {view && onViewChange && (
          <>
            <Choice
              title="Raggruppa per"
              value={view.groupBy}
              options={(Object.keys(GROUP_LABEL) as GroupBy[]).map((g) => ({ value: g, label: GROUP_LABEL[g] }))}
              onPick={(groupBy) => onViewChange({ ...view, groupBy })}
            />
            <Choice
              title="Ordina per"
              value={view.sortBy}
              options={(Object.keys(SORT_LABEL) as SortBy[]).map((k) => ({ value: k, label: SORT_LABEL[k] }))}
              onPick={(sortBy) => onViewChange({ ...view, sortBy })}
            />
          </>
        )}
        {children}
        <div class="grid grid-cols-[auto_1fr] gap-2 pt-1">
          <button
            type="button"
            disabled={active === 0 && !viewChanged}
            onClick={() => {
              onChange(EMPTY_FILTERS)
              onViewChange?.(DEFAULT_VIEW)
            }}
            class="min-h-[52px] rounded-[14px] border-2 border-line px-5 font-extrabold disabled:opacity-40"
          >
            Azzera
          </button>
          <button
            type="button"
            onClick={onClose}
            class="min-h-[52px] rounded-[14px] bg-accent px-6 font-extrabold text-accent-ink"
          >
            Mostra {matching} {matching === 1 ? 'luogo' : 'luoghi'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
