import { round2 } from './money'

// Cambio mostrato in modo "umano": 1 € = N valuta locale.
// Nel viaggio il tasso è salvato al contrario: unità di valuta base per 1 unità di valuta locale (es. 0,0056 € per 1 ¥).

/** Quante unità di valuta locale vale 1 unità di valuta base (es. 1 € = 178,57 ¥). */
export function localPerBase(rate: number): number {
  return 1 / rate
}

/** Cifre decimali usate da una valuta (yen: 0, euro: 2). */
export function decimalsOf(currency: string): number {
  try {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

export function roundTo(n: number, digits: number): number {
  const f = 10 ** digits
  return Math.round((n + Number.EPSILON) * f) / f
}

/** Valuta base → locale (€ → ¥), arrotondato ai decimali della valuta locale. */
export function baseToLocal(amount: number, rate: number, localCurrency: string): number {
  return roundTo(amount / rate, decimalsOf(localCurrency))
}

/** Valuta locale → base (¥ → €), arrotondato ai decimali della valuta base. */
export function localToBase(amount: number, rate: number, baseCurrency: string): number {
  return roundTo(amount * rate, decimalsOf(baseCurrency))
}

/** Esempi fissi: 1, 10 e 100 unità di valuta base nella valuta locale. */
export function examples(rate: number, localCurrency: string, amounts: number[] = [1, 10, 100]): { base: number; local: number }[] {
  return amounts.map((base) => ({ base, local: baseToLocal(base, rate, localCurrency) }))
}

/** Numero con decimali fissi, formato italiano (178,57). Per il "1 € = …" serve sempre qualche decimale. */
export function formatRateNumber(n: number): string {
  const digits = n < 1 ? 4 : 2
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}

/** Testo per un campo: senza zeri inutili, virgola decimale, nessun separatore delle migliaia. */
export function fieldText(n: number): string {
  return String(round2(n)).replace('.', ',')
}
