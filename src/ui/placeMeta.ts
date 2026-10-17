import type { Place, PlaceStatus, Trip } from '../types'

export const STATUS_LABEL: Record<PlaceStatus, string> = {
  idea: 'Idea',
  planned: 'Pianificato',
  done: 'Fatto',
  skipped: 'Saltato',
}

export const STATUS_STYLE: Record<PlaceStatus, string> = {
  idea: 'bg-accent-soft text-accent',
  planned: 'bg-secondary/15 text-secondary',
  done: 'bg-ok/15 text-ok',
  skipped: 'bg-line text-muted',
}

export const STATUSES: PlaceStatus[] = ['idea', 'planned', 'done', 'skipped']

export const SUGGESTED_CATEGORIES = ['Tempio', 'Cibo', 'Natura', 'Shopping', 'Quartiere', 'Museo', 'Panorama', 'Cultura']

export const PALETTE = ['#c8402f', '#264653', '#2a9d8f', '#e9a23b', '#7b5ea7', '#3a86c8', '#d4608a', '#6b8e23']
export const NO_CATEGORY_COLOR = '#7a7f85'

/** Colore stabile per categoria (usa quello salvato, altrimenti uno dalla tavolozza). */
export function colorForCategory(trip: Trip, categoryId?: string): string {
  const idx = trip.categories.findIndex((c) => c.id === categoryId)
  if (idx === -1) return NO_CATEGORY_COLOR
  return trip.categories[idx].color ?? PALETTE[idx % PALETTE.length]
}

export const categoryColor = (trip: Trip, place: Place): string => colorForCategory(trip, place.categoryId)

export function uniqueCities(places: Place[]): string[] {
  return Array.from(new Set(places.map((p) => p.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'it'))
}
