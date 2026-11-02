// La durata si sceglie con il selettore dell'orario del telefono: «01:30» vale 1 h 30 min.
import { parseDuration } from './duration'

/** Testo della durata («90», «1h 30min», «01:30») → «HH:MM» per il selettore; `''` se vuota; `null` se non ci sta (24 h o più, testo non chiaro). */
export function durataComeOra(text: string): string | null {
  if (!text.trim()) return ''
  const min = parseDuration(text)
  if (min === null || Number.isNaN(min) || min < 1 || min > 23 * 60 + 59) return null
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** «HH:MM» dal selettore → testo della durata; «00:00» vale nessuna durata. */
export function oraComeDurata(hhmm: string): string {
  return /^\d{2}:\d{2}$/.test(hhmm) && hhmm !== '00:00' ? hhmm : ''
}
