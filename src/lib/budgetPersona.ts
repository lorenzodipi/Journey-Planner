// Budget a persona (0055): ognuno scrive il suo, chi può modificare il viaggio scrive quello di chi non ha l'account.
// Il budget del viaggio è la somma dei budget messi («2 persone su 3»). Prima della migrazione vale il budget unico
// del viaggio di sempre (trips.budget_limit), che conta come budget di tutti e, da soli, anche come il proprio.
import type { Trip } from '../types'

export interface BudgetTotale {
  importo?: number
  /** quante persone hanno messo un budget e quante sono (solo con il budget a persona) */
  persone?: number
  viaggiatori?: number
}

/** Il budget a persona c'è (migrazione eseguita e si vedono i costi). */
export const budgetAPersona = (trip: Pick<Trip, 'budgets'>) => trip.budgets !== undefined

/** Budget di tutto il viaggio: la somma dei budget messi, oppure quello unico di prima. */
export function budgetTotale(trip: Pick<Trip, 'budgets' | 'budgetLimit'>): BudgetTotale {
  if (trip.budgets) return trip.budgets.totale > 0 ? { importo: trip.budgets.totale, persone: trip.budgets.persone, viaggiatori: trip.budgets.viaggiatori } : {}
  return trip.budgetLimit ? { importo: trip.budgetLimit } : {}
}

/** Budget di una persona (il mio o di chi non ha l'account). Senza il budget a persona, da soli vale quello del viaggio. */
export function budgetDi(trip: Pick<Trip, 'budgets' | 'budgetLimit' | 'travelers'>, travelerId: string | undefined): number | undefined {
  if (!travelerId) return undefined
  if (trip.budgets) return trip.budgets.righe[travelerId]
  return trip.travelers.length <= 1 ? trip.budgetLimit : undefined
}

/** Chi ha un budget che posso scrivere oltre al mio: i viaggiatori senza account (se posso modificare il viaggio). */
export function budgetAltrui(trip: Pick<Trip, 'travelers'>, me: string | undefined, puoModificare: boolean): Trip['travelers'] {
  return puoModificare ? trip.travelers.filter((t) => t.id !== me && !t.userId) : []
}
