import { FilterIcon } from './Icons'
import { countActive, toggleValue, type PlaceFilters } from '../lib/placeFilter'
import type { PlaceStatus } from '../types'
import { STATUS_LABEL } from './placeMeta'

interface Props {
  filters: PlaceFilters
  onChange: (f: PlaceFilters) => void
  onOpen: () => void
  label?: string
  /** Quanti luoghi stanno in ogni gruppo di stato (per i numeri sui pulsanti rapidi). */
  counts?: { all: number; todo: number; done: number }
}

const TODO: PlaceStatus[] = ['idea', 'planned']
const DONE: PlaceStatus[] = ['done']
const same = (a: PlaceStatus[], b: PlaceStatus[]) => a.length === b.length && a.every((x) => b.includes(x))

/**
 * Pulsanti rapidi (Tutti, Da vedere, Visitati) e il pulsante Filtri, che apre il pannello con città e categorie.
 * I filtri attivi restano visibili sotto forma di etichette che si tolgono con un tocco.
 */
export function FilterBar({ filters, onChange, onOpen, label = 'Filtri', counts }: Props) {
  const active = countActive(filters)
  const statusOnly = filters.cities.length === 0 && filters.categories.length === 0
  const quick = [
    { key: 'all', text: 'Tutti', n: counts?.all, on: statusOnly && filters.statuses.length === 0, set: [] as PlaceStatus[] },
    { key: 'todo', text: 'Da vedere', n: counts?.todo, on: statusOnly && same(filters.statuses, TODO), set: TODO },
    { key: 'done', text: 'Visitati', n: counts?.done, on: statusOnly && same(filters.statuses, DONE), set: DONE },
  ]
  const chips: { key: string; text: string; remove: () => void }[] = [
    ...filters.cities.map((v) => ({ key: `c:${v}`, text: v, remove: () => onChange({ ...filters, cities: toggleValue(filters.cities, v) }) })),
    ...filters.categories.map((v) => ({ key: `k:${v}`, text: v || 'Senza categoria', remove: () => onChange({ ...filters, categories: toggleValue(filters.categories, v) }) })),
    ...(statusOnly && quick.some((q) => q.on) ? [] : filters.statuses.map((v) => ({ key: `s:${v}`, text: STATUS_LABEL[v], remove: () => onChange({ ...filters, statuses: toggleValue(filters.statuses, v) }) }))),
  ]
  return (
    <div class="space-y-2">
      <div class="no-scrollbar flex items-center gap-2 overflow-x-auto">
        {quick.map((q) => (
          <button
            type="button"
            key={q.key}
            aria-pressed={q.on}
            onClick={() => onChange({ ...filters, statuses: q.set })}
            class={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${q.on ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink'}`}
          >
            {q.text}
            {q.n != null && <span class="ml-1.5 tabular-nums">{q.n}</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={onOpen}
          class={`ml-auto flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 text-sm font-extrabold ${active > 0 && !statusOnly ? 'border-pale text-pale' : 'border-line text-ink'}`}
        >
          <FilterIcon size={18} />
          {label}
          {active > 0 && <span class="rounded-full bg-accent px-1.5 text-xs tabular-nums text-accent-ink">{active}</span>}
        </button>
      </div>
      {chips.length > 0 && (
        <div class="no-scrollbar flex gap-2 overflow-x-auto">
          {chips.map((c) => (
            <button
              type="button"
              key={c.key}
              onClick={c.remove}
              aria-label={`Togli filtro ${c.text}`}
              class="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-pale px-3 text-sm font-extrabold text-pale"
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
