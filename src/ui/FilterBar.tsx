import { CloseG, FilterG } from './glyphs'
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
    <>
      <div class="chips">
        {quick.map((q) => (
          <button type="button" key={q.key} aria-pressed={q.on} onClick={() => onChange({ ...filters, statuses: q.set })} class={`chip${q.on ? ' on' : ''}`}>
            {q.text}
            {q.n != null && <span class="n num">{q.n}</span>}
          </button>
        ))}
        <button type="button" onClick={onOpen} class={`chip${active > 0 && !statusOnly ? ' on' : ''}`} style={{ marginLeft: 'auto' }}>
          <FilterG size={18} />
          {label}
          {active > 0 && <span class="n num">{active}</span>}
        </button>
      </div>
      {chips.length > 0 && (
        <div class="chips">
          {chips.map((c) => (
            <button type="button" key={c.key} onClick={c.remove} aria-label={`Togli filtro ${c.text}`} class="chip on">
              {c.text}
              <CloseG size={14} sw={2.6} />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
