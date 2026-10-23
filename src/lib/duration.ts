import type { DayItem, Place } from '../types'

// Tempo di permanenza di luoghi e tappe, in minuti.

export const MAX_DURATION_MIN = 24 * 60

/** Scorciatoie per scegliere la durata con un tocco. */
export const DURATION_CHIPS = [30, 60, 90, 120, 180]

/** «45 min», «1 h», «1 h 30». */
export function formatDuration(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h} h` : `${h} h ${rest}`
}

/**
 * Legge una durata scritta a mano: «90», «45 min», «1h», «1 h 30», «1h30», «1:30», «1,5 h», «2 ore».
 * `null` se il campo è vuoto, `NaN` se non si capisce o è fuori misura (da 1 minuto a 24 ore).
 */
export function parseDuration(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!t) return null
  let min: number | undefined
  let m: RegExpExecArray | null
  if ((m = /^(\d+):(\d{1,2})$/.exec(t))) min = Number(m[1]) * 60 + Number(m[2])
  else if ((m = /^(\d+(?:[.,]\d+)?) ?(?:h|ore|ora)(?: ?e? ?(\d+) ?(?:m|min|minuti)?)?$/.exec(t))) min = Math.round(Number(m[1].replace(',', '.')) * 60) + (m[2] ? Number(m[2]) : 0)
  else if ((m = /^(\d+) ?(?:m|min|minuti)?$/.exec(t))) min = Number(m[1])
  if (min === undefined || !Number.isFinite(min) || min < 1 || min > MAX_DURATION_MIN) return Number.NaN
  return min
}

/** Durata di una tappa: la sua, se l'ha personalizzata, altrimenti quella del luogo collegato. */
export function itemDuration(item: Pick<DayItem, 'durationMinutes'>, place: Pick<Place, 'visitMinutes'> | undefined): number | undefined {
  return item.durationMinutes ?? place?.visitMinutes
}

/** Totale delle durate di un giorno (0 se nessuna tappa ne ha). */
export function totalDuration(items: Pick<DayItem, 'durationMinutes' | 'placeId'>[], places: Pick<Place, 'id' | 'visitMinutes'>[]): number {
  const byId = new Map(places.map((p) => [p.id, p]))
  return items.reduce((sum, it) => sum + (itemDuration(it, it.placeId ? byId.get(it.placeId) : undefined) ?? 0), 0)
}
