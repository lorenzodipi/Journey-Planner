// Città di un giorno quando non è scritta: quella dell'alloggio in cui si dorme quella notte (o, l'ultimo giorno,
// quella da cui si parte). Serve a dividere i giorni per città e a disegnare lo stepper del viaggio.
import type { Stay } from '../types'

export function cittaDaAlloggi(stays: readonly Pick<Stay, 'city' | 'checkIn' | 'checkOut'>[] | undefined, date: string): string {
  const list = stays ?? []
  const notte = list.find((s) => s.city?.trim() && s.checkIn <= date && date < s.checkOut)
  if (notte) return notte.city.trim()
  const partenza = list.find((s) => s.city?.trim() && s.checkOut === date)
  return partenza ? partenza.city.trim() : ''
}
