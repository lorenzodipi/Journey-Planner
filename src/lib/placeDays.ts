import type { Day } from '../types'
import { formatShort } from './dates'

/**
 * «Giorno 3 · mer 25 nov» per il luogo, se è in un giorno; con più giorni il primo e «+1». `null` se non è in nessuno.
 * I giorni arrivano in ordine di data, come nel viaggio.
 */
export function placeDayLine(placeId: string, days: Pick<Day, 'date' | 'items'>[]): string | null {
  const hits = days.map((d, i) => ({ d, i })).filter(({ d }) => d.items.some((it) => it.placeId === placeId))
  if (hits.length === 0) return null
  const first = hits[0]
  const more = hits.length > 1 ? ` +${hits.length - 1}` : ''
  return `Giorno ${first.i + 1} · ${formatShort(first.d.date)}${more}`
}
