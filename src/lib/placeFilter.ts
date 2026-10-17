import type { Place, PlaceStatus } from '../types'

// Filtri multipli: dentro lo stesso gruppo vale "oppure" (Tempio o Cibo),
// tra gruppi diversi vale "e" (Tempio E a Kyoto E ancora da fare).

export interface PlaceFilters {
  cities: string[]
  categories: string[]
  statuses: PlaceStatus[]
}

export const EMPTY_FILTERS: PlaceFilters = { cities: [], categories: [], statuses: [] }

export function countActive(f: PlaceFilters): number {
  return f.cities.length + f.categories.length + f.statuses.length
}

export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

export function filterPlaces(places: Place[], f: PlaceFilters, text = ''): Place[] {
  const q = norm(text.trim())
  return places.filter(
    (p) =>
      (f.cities.length === 0 || f.cities.includes(p.city)) &&
      (f.categories.length === 0 || f.categories.includes(p.category)) &&
      (f.statuses.length === 0 || f.statuses.includes(p.status)) &&
      (!q || norm(`${p.name} ${p.nameLocal ?? ''} ${p.city} ${p.category}`).includes(q)),
  )
}
