import type { Category, Place, PlaceStatus, Trip } from '../types'
import { categoryIcon, type PinIcon } from '../lib/categoryIcon'

export const STATUS_LABEL: Record<PlaceStatus, string> = {
  idea: 'Idea',
  planned: 'Pianificato',
  done: 'Fatto',
  skipped: 'Saltato',
}

export const STATUS_STYLE: Record<PlaceStatus, string> = {
  idea: 'border-pale text-pale',
  planned: 'border-warn text-warn',
  done: 'border-ok text-ok',
  skipped: 'border-line text-muted',
}

export const STATUSES: PlaceStatus[] = ['idea', 'planned', 'done', 'skipped']

export const SUGGESTED_CATEGORIES = ['Tempio', 'Cibo', 'Natura', 'Shopping', 'Quartiere', 'Museo', 'Panorama', 'Cultura', 'Supermercato', 'Benzinaio', 'Treno']

/** Tavolozza Eki Notte: blu, arancio, verde e poi i colori di contorno. */
export const PALETTE = ['#3d86ff', '#ffa23a', '#2cc48a', '#7fb0ff', '#ff6b6b', '#b58cff', '#f7b733', '#4fd1c5']
export const NO_CATEGORY_COLOR = '#9fb0c8'
/** Un colore preferito per ogni tipo di categoria, tutti diversi e leggibili sul blu notte. */
const ICON_COLOR: Record<PinIcon, string> = {
  temple: '#ff6b6b',
  food: '#ffa23a',
  cafe: '#b8845a',
  shopping: '#3fd0e8',
  nature: '#a3d65c',
  viewpoint: '#f2d43d',
  district: '#3d86ff',
  museum: '#b58cff',
  castle: '#d6c7a1',
  spa: '#9de6d2',
  stay: '#22a373',
  train: '#c0c8d6',
  airport: '#6cc3ff',
  transit: '#a0a8f0',
  night: '#5a5fd6',
  fun: '#ff5fa8',
  grocery: '#98aa07',
  fuel: '#b97aaa',
  pin: '#9fb0c8',
}
/** Colori di riserva per le categorie senza un tipo riconosciuto o con il colore già preso. */
const ICON_COLORS = Object.entries(ICON_COLOR)
  .filter(([icon]) => icon !== 'pin')
  .map(([, color]) => color)

/** Colore preferito di una categoria in base al nome (Tempio rosso, Cibo arancio, Alloggio verde…). */
export function themeColor(label: string): string {
  if (!label.trim()) return NO_CATEGORY_COLOR
  return ICON_COLOR[categoryIcon(label)]
}

const assigned = new WeakMap<Category[], Map<string, string>>()

/**
 * Colori delle categorie del viaggio, tutti diversi tra loro: ognuna prende il colore preferito del suo tipo
 * e, se è già di un'altra categoria (es. Tempio e Santuario), il primo libero della tavolozza.
 */
function categoryColors(categories: Category[]): Map<string, string> {
  const cached = assigned.get(categories)
  if (cached) return cached
  const taken = new Set<string>()
  const colors = new Map<string, string>()
  for (const c of categories) {
    const preferred = categoryIcon(c.label) === 'pin' ? undefined : themeColor(c.label)
    const color = preferred && !taken.has(preferred) ? preferred : (ICON_COLORS.find((x) => !taken.has(x)) ?? preferred ?? NO_CATEGORY_COLOR)
    taken.add(color)
    colors.set(c.id, color)
  }
  assigned.set(categories, colors)
  return colors
}

/** Colore di una categoria del viaggio (stabile finché l'elenco delle categorie non cambia). */
export function colorForCategory(trip: Trip, categoryId?: string): string {
  return (categoryId && categoryColors(trip.categories).get(categoryId)) || NO_CATEGORY_COLOR
}

export const categoryColor = (trip: Trip, place: Place): string =>
  place.categoryId ? colorForCategory(trip, place.categoryId) : themeColor(place.category)

export function uniqueCities(places: Place[]): string[] {
  return Array.from(new Set(places.map((p) => p.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'it'))
}
