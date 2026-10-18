import type { Place, PlaceStatus } from '../types'

// Come si mostra l'elenco dei luoghi: raggruppato per qualcosa e ordinato in un certo modo.
// Non toglie luoghi (quello lo fanno i filtri): cambia solo l'ordine e le intestazioni.

export type GroupBy = 'none' | 'city' | 'category' | 'status' | 'day'
export type SortBy = 'name' | 'day' | 'status' | 'cost'

export interface PlaceView {
  groupBy: GroupBy
  sortBy: SortBy
}

export const DEFAULT_VIEW: PlaceView = { groupBy: 'none', sortBy: 'name' }

export const GROUP_LABEL: Record<GroupBy, string> = {
  none: 'Nessuno',
  city: 'Città',
  category: 'Categoria',
  status: 'Stato',
  day: 'Giorno',
}

export const SORT_LABEL: Record<SortBy, string> = {
  name: 'Nome',
  day: 'Giorno',
  status: 'Stato',
  cost: 'Costo',
}

export const isDefaultView = (v: PlaceView) => v.groupBy === DEFAULT_VIEW.groupBy && v.sortBy === DEFAULT_VIEW.sortBy

const STATUS_ORDER: PlaceStatus[] = ['idea', 'planned', 'done', 'skipped']
const STATUS_TITLE: Record<PlaceStatus, string> = { idea: 'Idee', planned: 'Pianificati', done: 'Fatti', skipped: 'Saltati' }

const collator = new Intl.Collator('it', { sensitivity: 'base' })
const byName = (a: Place, b: Place) => collator.compare(a.name, b.name)

export interface PlaceGroup {
  key: string
  title: string
  places: Place[]
}

/** `dayIndex`: numero del giorno (0 = primo) in cui il luogo è in programma, se c'è. */
export function viewPlaces(
  places: Place[],
  view: PlaceView,
  ctx: { dayIndex: (placeId: string) => number | undefined; categoryOrder: string[] },
): PlaceGroup[] {
  const day = (p: Place) => ctx.dayIndex(p.id) ?? Number.POSITIVE_INFINITY

  const compare = (a: Place, b: Place): number => {
    switch (view.sortBy) {
      case 'day':
        return day(a) - day(b) || byName(a, b)
      case 'status':
        return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || byName(a, b)
      case 'cost':
        // dal più caro; senza costo in fondo
        return (b.estCost ?? -1) - (a.estCost ?? -1) || byName(a, b)
      default:
        return byName(a, b)
    }
  }

  const sorted = [...places].sort(compare)
  if (view.groupBy === 'none') return [{ key: 'all', title: '', places: sorted }]

  const keyOf = (p: Place): string => {
    switch (view.groupBy) {
      case 'city':
        return p.city || ''
      case 'category':
        return p.category || ''
      case 'status':
        return p.status
      default: {
        const d = ctx.dayIndex(p.id)
        return d === undefined ? '' : String(d)
      }
    }
  }
  const titleOf = (key: string): string => {
    switch (view.groupBy) {
      case 'city':
        return key || 'Senza città'
      case 'category':
        return key || 'Senza categoria'
      case 'status':
        return STATUS_TITLE[key as PlaceStatus]
      default:
        return key === '' ? 'Da assegnare' : `Giorno ${Number(key) + 1}`
    }
  }

  const groups = new Map<string, Place[]>()
  for (const p of sorted) {
    const k = keyOf(p)
    groups.set(k, [...(groups.get(k) ?? []), p])
  }

  // Ordine dei gruppi: città in ordine alfabetico, categorie come nel viaggio, stati e giorni in sequenza;
  // il gruppo "senza…" va sempre in fondo.
  const rank = (k: string): number => {
    switch (view.groupBy) {
      case 'category': {
        const i = ctx.categoryOrder.indexOf(k)
        return i < 0 ? Number.MAX_SAFE_INTEGER : i
      }
      case 'status':
        return STATUS_ORDER.indexOf(k as PlaceStatus)
      case 'day':
        return k === '' ? Number.MAX_SAFE_INTEGER : Number(k)
      default:
        return 0
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === '' && b !== '') return 1
      if (b === '' && a !== '') return -1
      return rank(a) - rank(b) || collator.compare(a, b)
    })
    .map(([key, list]) => ({ key, title: titleOf(key), places: list }))
}
