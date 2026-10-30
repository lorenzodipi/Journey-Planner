// Spese avanzate (#50): paganti multipli, divisione per parti uguali / percentuali / importi fissi, controlli e saldo.
// Tutto in centesimi interi, così le somme tornano sempre al centesimo; il resto va al primo beneficiario.
import type { Expense, ExpensePayer, ExpenseShare, SplitMode } from '../types'
import { formatMoney, round2 } from './money'

const cents = (n: number) => Math.round(n * 100)
const euro = (c: number) => c / 100

export const SPLIT_LABEL: Record<SplitMode, string> = { equal: 'In parti uguali', percent: 'Percentuali', fixed: 'Importi fissi' }

export interface Check {
  ok: boolean
  /** Spiegazione da mostrare accanto al campo; vuota se va tutto bene. */
  message: string
  /** Quanto manca (> 0) o quanto avanza (< 0), nell'unità controllata (valuta o punti percentuali). */
  missing: number
}

const OK: Check = { ok: true, message: '', missing: 0 }

/** I versamenti devono sommare esattamente l'importo, senza negativi né doppioni. */
export function checkPayers(total: number, payers: readonly ExpensePayer[], currency: string): Check {
  if (payers.length === 0) return OK
  if (payers.some((p) => !(p.amount >= 0))) return { ok: false, message: 'Un versamento non può essere negativo.', missing: 0 }
  const ids = payers.map((p) => p.travelerId)
  if (new Set(ids).size !== ids.length) return { ok: false, message: 'Una persona può comparire una sola volta tra chi ha pagato.', missing: 0 }
  const diff = cents(total) - payers.reduce((n, p) => n + cents(p.amount), 0)
  if (diff === 0) return OK
  return {
    ok: false,
    missing: euro(diff),
    message: diff > 0 ? `Mancano ${formatMoney(euro(diff), currency)} ai versamenti` : `I versamenti superano di ${formatMoney(euro(-diff), currency)}`,
  }
}

/** Le percentuali devono fare esattamente 100,00. */
export function checkPercents(shares: readonly Pick<ExpenseShare, 'percent'>[]): Check {
  const sum = shares.reduce((n, s) => n + Math.round((s.percent ?? 0) * 100), 0) // centesimi di punto
  if (sum === 10000) return OK
  const points = (x: number) => String(x / 100).replace('.', ',')
  const diff = 10000 - sum
  return {
    ok: false,
    missing: diff / 100,
    message: diff > 0 ? `Le quote fanno ${points(sum)}%: mancano ${points(diff)} punti` : `Le quote fanno ${points(sum)}%: ${points(-diff)} punti in più`,
  }
}

/** Gli importi fissi devono sommare esattamente il totale. */
export function checkFixed(total: number, shares: readonly Pick<ExpenseShare, 'amount'>[], currency: string): Check {
  if (shares.some((s) => !((s.amount ?? 0) >= 0))) return { ok: false, message: 'Un importo non può essere negativo.', missing: 0 }
  const diff = cents(total) - shares.reduce((n, s) => n + cents(s.amount ?? 0), 0)
  if (diff === 0) return OK
  return {
    ok: false,
    missing: euro(diff),
    message: diff > 0 ? `Mancano ${formatMoney(euro(diff), currency)} agli importi` : `Gli importi superano di ${formatMoney(euro(-diff), currency)}`,
  }
}

/** Controllo della divisione scelta. Parti uguali: basta una persona. */
export function checkSplit(mode: SplitMode, total: number, shares: readonly ExpenseShare[], currency: string): Check {
  if (shares.length === 0) return { ok: false, message: 'Scegli almeno una persona tra cui dividere.', missing: 0 }
  if (mode === 'percent') return checkPercents(shares)
  if (mode === 'fixed') return checkFixed(total, shares, currency)
  return OK
}

/**
 * Quote in denaro, nella stessa unità di `total`, ordinate come `shares`.
 * Percentuali: ogni quota è arrotondata per difetto al centesimo e il resto va alla prima persona.
 * Importi fissi: valgono quelli scritti (se non sommano al totale, il resto va alla prima).
 * Parti uguali: pesi, con il resto distribuito dalla prima.
 */
export function splitAmounts(total: number, mode: SplitMode, shares: readonly ExpenseShare[]): number[] {
  if (shares.length === 0) return []
  const tot = cents(total)
  let parts: number[]
  if (mode === 'percent') {
    parts = shares.map((s) => Math.floor((tot * Math.round((s.percent ?? 0) * 100)) / 10000))
  } else if (mode === 'fixed') {
    parts = shares.map((s) => cents(s.amount ?? 0))
  } else {
    const w = shares.map((s) => (s.weight > 0 ? s.weight : 0))
    const sum = w.reduce((a, b) => a + b, 0)
    if (sum === 0) return shares.map(() => 0)
    parts = w.map((x) => Math.floor((tot * x) / sum))
    // il resto, un centesimo alla volta, dalla prima persona che ha una quota
    let rest = tot - parts.reduce((a, b) => a + b, 0)
    for (let i = 0; rest > 0; i = (i + 1) % parts.length) {
      if (w[i] > 0) {
        parts[i] += 1
        rest -= 1
      }
    }
    return parts.map(euro)
  }
  parts[0] += tot - parts.reduce((a, b) => a + b, 0)
  return parts.map(euro)
}

/** I versamenti della spesa: quelli scritti, altrimenti `paidBy` per l'intero importo. */
export function payersOf(e: Pick<Expense, 'amount' | 'paidBy' | 'payers'>): ExpensePayer[] {
  if (e.payers && e.payers.length > 0) return e.payers
  return e.paidBy ? [{ travelerId: e.paidBy, amount: e.amount }] : []
}

/** Riporta importi nella valuta della spesa a un totale in un'altra valuta (la base), centesimo per centesimo; il resto al primo. */
export function scaleTo<T extends { amount: number }>(items: readonly T[], from: number, to: number): T[] {
  if (items.length === 0) return []
  if (from === 0) return items.map((i) => ({ ...i, amount: 0 }))
  const scaled = items.map((i) => Math.round((cents(i.amount) * cents(to)) / cents(from)))
  const part = scaled.reduce((a, b) => a + b, 0)
  // il resto sta sul primo che ha un importo: i versamenti a zero restano a zero
  const first = items.findIndex((i) => i.amount > 0)
  if (first >= 0) scaled[first] += cents(to) - part
  return items.map((i, k) => ({ ...i, amount: euro(scaled[k]) }))
}

/** Saldo di ogni persona su una spesa: quanto ha versato meno la sua quota (> 0: deve ricevere). */
export function expenseBalance(
  payers: readonly ExpensePayer[],
  owed: readonly { travelerId: string; amount: number }[],
): { travelerId: string; paid: number; owed: number; net: number }[] {
  const ids = Array.from(new Set([...payers.map((p) => p.travelerId), ...owed.map((o) => o.travelerId)]))
  return ids.map((travelerId) => {
    const paid = round2(payers.filter((p) => p.travelerId === travelerId).reduce((n, p) => n + p.amount, 0))
    const owe = round2(owed.filter((o) => o.travelerId === travelerId).reduce((n, o) => n + o.amount, 0))
    return { travelerId, paid, owed: owe, net: round2(paid - owe) }
  })
}

/** Traccia del cambio: «BCE · 30 ott 09:10», «Scritto a mano da Anna · 30 ott 09:10» o «Cambio del viaggio». */
export function fxTrace(e: Pick<Expense, 'fxRate' | 'fxSource' | 'fxAt' | 'fxManual'>, setBy: string | undefined, locale = 'it-IT'): string {
  if (!e.fxRate) return ''
  const when = e.fxAt
    ? new Date(e.fxAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', '')
    : ''
  const who = e.fxManual ? `Scritto a mano${setBy ? ` da ${setBy}` : ''}` : e.fxSource || 'Cambio del viaggio'
  return when ? `${who} · ${when}` : who
}

/**
 * Chi può modificare o eliminare una spesa: chi l'ha creata e chi ha pagato (anche solo in parte).
 * Le spese senza autore (di prima della 0028) restano modificabili da tutti i partecipanti.
 */
export function puoModificareSpesa(e: Pick<Expense, 'createdBy' | 'paidBy' | 'payers'>, userId: string | undefined, travelerId: string | undefined): boolean {
  if (!e.createdBy) return true
  if (userId && e.createdBy === userId) return true
  if (!travelerId) return false
  return e.paidBy === travelerId || !!e.payers?.some((p) => p.travelerId === travelerId)
}
