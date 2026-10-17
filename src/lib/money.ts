// Regole dei soldi, replicate dal foglio Google ma calcolate, mai digitate:
//  - "per_person": ognuno paga `amount`
//  - "total": `amount` è il totale, da dividere tra i viaggiatori
// Lo stato "pagato" è per viaggiatore.

export type Scope = 'per_person' | 'total'

export interface BudgetLine {
  amount: number
  scope: Scope
  /** Quanti viaggiatori hanno già pagato questa voce. */
  paidCount: number
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Importo a carico di ogni persona. */
export function perPerson(amount: number, scope: Scope, persons: number): number {
  return round2(scope === 'per_person' ? amount : amount / persons)
}

/** Importo complessivo per tutti i viaggiatori. */
export function totalFor(amount: number, scope: Scope, persons: number): number {
  return round2(scope === 'total' ? amount : amount * persons)
}

/** Residuo ancora da pagare per una voce. */
export function outstanding(line: BudgetLine, persons: number): number {
  const unpaid = Math.max(0, persons - line.paidCount)
  return round2(perPerson(line.amount, line.scope, persons) * unpaid)
}

/** Residuo per una singola persona (somma delle sue voci non pagate). */
export function outstandingForPerson(lines: { amount: number; scope: Scope; paid: boolean }[], persons: number): number {
  return round2(
    lines.reduce((sum, l) => sum + (l.paid ? 0 : perPerson(l.amount, l.scope, persons)), 0),
  )
}

/** Converte un importo con un tasso (unità di valuta base per 1 unità di valuta di origine). */
export function convert(amount: number, rate: number): number {
  return round2(amount * rate)
}
