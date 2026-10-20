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

/** Legge un importo scritto a mano ("1.234,50", "12,5", "300"). `null` se vuoto o non valido. */
export function parseAmount(text: string): number | null {
  let t = text.trim().replace(/\s/g, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.') // 1.234,50 -> 1234.50
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '') // 1.234 -> 1234
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? round2(n) : null
}

/** Tasso di cambio scritto a mano: come un importo, ma con fino a 6 decimali (0,0056 non diventa 0,01). */
export function parseRate(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1e6) / 1e6 : null
}

/** Importo con simbolo di valuta; lo yen non ha decimali. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

/** Simbolo della valuta (€, ¥, $…); se non lo conosce, il codice. */
export function currencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

/** Importo per un campo di testo, senza zeri inutili ("30" invece di "30.00"). */
export function amountToText(amount: number | undefined | null): string {
  return amount == null ? '' : String(amount).replace('.', ',')
}

/** Somma per valuta: [{ currency: 'EUR', amount: 600 }, …], ordinata per valuta. */
export function sumByCurrency(items: { amount: number; currency: string }[]): { currency: string; amount: number }[] {
  const map = new Map<string, number>()
  for (const i of items) map.set(i.currency, (map.get(i.currency) ?? 0) + i.amount)
  return Array.from(map, ([currency, amount]) => ({ currency, amount: round2(amount) })).sort((a, b) =>
    a.currency.localeCompare(b.currency),
  )
}

type RateTrip = { baseCurrency: string; localCurrency?: string; fxRate?: number; fxRates?: Record<string, number> }

/** Valute extra del viaggio (oltre a base e locale), in ordine alfabetico. */
export function extraCurrencies(trip: Pick<RateTrip, 'fxRates'>): string[] {
  return Object.keys(trip.fxRates ?? {}).sort()
}

/** Cambio del viaggio per una valuta (unità di valuta base per 1 unità), se c'è: 1 per la base. */
export function rateFor(trip: RateTrip, currency: string): number | undefined {
  const code = currency.trim().toUpperCase()
  if (code === trip.baseCurrency) return 1
  if (code === trip.localCurrency) return trip.fxRate && trip.fxRate > 0 ? trip.fxRate : undefined
  const r = trip.fxRates?.[code]
  return r && r > 0 ? r : undefined
}

/** Ripulisce un oggetto di cambi (da database o file): codici di 3 lettere maiuscole, tassi positivi e sensati. */
export function cleanRates(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const code = k.trim().toUpperCase()
    const n = typeof v === 'number' ? v : Number(v)
    if (/^[A-Z]{3}$/.test(code) && Number.isFinite(n) && n > 0 && n < 1e7) out[code] = n
  }
  return out
}

/**
 * Valute che si possono scegliere in un viaggio: la base, quella locale (se c'è e se è diversa) e le extra.
 * `current` è la valuta già salvata su una voce da modificare: resta nell'elenco anche se il viaggio non la prevede più.
 */
export function tripCurrencies(trip: { baseCurrency: string; localCurrency?: string; fxRates?: Record<string, number> }, current?: string): string[] {
  const out: string[] = []
  for (const c of [trip.baseCurrency, trip.localCurrency, ...extraCurrencies(trip), current]) {
    const code = c?.trim().toUpperCase()
    if (code && !out.includes(code)) out.push(code)
  }
  return out
}

/** Nome esteso della valuta in italiano ("euro", "yen giapponese"); se non lo conosce, niente. */
export function currencyName(currency: string): string | undefined {
  try {
    return new Intl.DisplayNames('it', { type: 'currency' }).of(currency) ?? undefined
  } catch {
    return undefined
  }
}
