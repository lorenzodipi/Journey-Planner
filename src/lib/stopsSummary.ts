import type { DayItem } from '../types'
import { formatDuration } from './duration'

/** Riga di riepilogo di «Tappe del giorno» da mostrare anche a sezione chiusa. */
export function stopsSummary(items: Pick<DayItem, 'time' | 'done'>[], nowHHMM?: string | null, visitMinutes = 0): string {
  if (items.length === 0) return 'Giornata ancora libera'
  const parts = [`${items.length} ${items.length === 1 ? 'tappa' : 'tappe'}`]
  const done = items.filter((i) => i.done).length
  if (done > 0) parts.push(done === items.length ? 'tutte fatte' : `${done} ${done === 1 ? 'fatta' : 'fatte'}`)
  const todo = items.filter((i) => !i.done && i.time).map((i) => i.time as string).sort()
  if (todo.length > 0) {
    if (nowHHMM == null) parts.push(`dalle ${todo[0]}`)
    else {
      const next = todo.find((t) => t >= nowHHMM)
      if (next) parts.push(`prossima ${next}`)
    }
  }
  if (visitMinutes > 0) parts.push(`≈ ${formatDuration(visitMinutes)} di visite`)
  return parts.join(' · ')
}

/** Minuti dall'inizio del giorno → "HH:MM". */
export function minutesToHHMM(min: number): string {
  const m = Math.max(0, Math.min(1439, Math.floor(min)))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
