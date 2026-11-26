// Ricerca per importo in Dettaglio spese: un numero cercato trova le spese per il loro importo in **qualsiasi** valuta del
// viaggio (l'importo scritto e il suo controvalore in tutte le altre), non solo per il testo.
//   «1»            → la parte intera contiene 1 (1, 10, 12, 21, 100…)
//   «1,» «1.» «1 » → solo 1 unità intera (1,00 … 1,99), non 11 né 10
//   «1,5»          → parte intera 1 e decimali che cominciano con 5 (1,50 … 1,59)
// Le parole che non sono numeri si cercano nel testo come nel resto dell'app (`corrisponde`).

import { normalizza } from './cerca'
import { round2 } from './money'
import { expenseBase, type FxContext } from './budget'
import type { Expense } from '../types'

/** Un importo da confrontare: valore e decimali della sua valuta (0 per lo yen, 2 per l'euro). */
export interface ImportoCercabile {
  valore: number
  decimali: number
}

type Numero = { tipo: 'contiene'; cifre: string } | { tipo: 'intero'; intero: string; decimali: string }

/** Decimali con cui si scrive una valuta (JPY 0, EUR 2); 2 se la valuta non è nota. */
export function decimaliValuta(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

/** Legge una parola cercata come numero, o null se non lo è. `seguitaDaSpazio`: nel testo dopo la parola c'è uno spazio. */
function leggiNumero(parola: string, seguitaDaSpazio: boolean): Numero | null {
  // via simboli e segni attaccati («€12», «(12)»), ma la virgola o il punto in fondo restano: vogliono dire «1 unità»
  let p = parola.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N}.,]+$/u, '')
  // migliaia all'italiana: «1.234» o «1.234,50»
  if (/^\d{1,3}(\.\d{3})+(,\d*)?$/.test(p)) p = p.replace(/\./g, '')
  const m = /^(\d+)(?:([.,])(\d*))?$/.exec(p)
  if (!m) return null
  const [, intero, sep, dec] = m
  if (sep) return { tipo: 'intero', intero: String(Number(intero)), decimali: dec ?? '' }
  if (seguitaDaSpazio) return { tipo: 'intero', intero: String(Number(intero)), decimali: '' }
  return { tipo: 'contiene', cifre: intero }
}

function corrispondeNumero(n: Numero, importi: readonly ImportoCercabile[]): boolean {
  return importi.some(({ valore, decimali }) => {
    const [intero, dec = ''] = Math.abs(valore).toFixed(decimali).split('.')
    if (n.tipo === 'contiene') return intero.includes(n.cifre)
    return intero === n.intero && dec.startsWith(n.decimali)
  })
}

/**
 * Vero se la spesa risponde a ciò che si è scritto: ogni numero deve trovare uno degli importi (o, se sono solo cifre,
 * anche il testo: «7» trova «7-Eleven»), ogni altra parola deve stare nel testo. `testo` è quello scritto, **senza
 * togliere gli spazi**: lo spazio dopo un numero vuol dire «esattamente quelle unità».
 */
export function corrispondeSpesa(testo: string, campi: readonly (string | null | undefined)[], importi: readonly ImportoCercabile[]): boolean {
  const tuttoTesto = normalizza(campi.filter(Boolean).join(' '))
  for (const m of testo.matchAll(/\S+/g)) {
    const parola = m[0]
    const seguitaDaSpazio = (m.index ?? 0) + parola.length < testo.length
    const n = leggiNumero(parola, seguitaDaSpazio)
    if (n) {
      if (corrispondeNumero(n, importi)) continue
      if (n.tipo === 'contiene' && tuttoTesto.includes(n.cifre)) continue
      return false
    }
    const q = normalizza(parola)
    if (q && !q.split(' ').every((p) => tuttoTesto.includes(p))) return false
  }
  return true
}

/** Le valute del viaggio con il loro cambio verso la base (unità di base per 1 unità). */
function valuteConCambio(fx: FxContext): [string, number][] {
  const out = new Map<string, number>([[fx.base, 1]])
  if (fx.local && fx.rate && fx.rate > 0) out.set(fx.local, fx.rate)
  for (const [c, r] of Object.entries(fx.extra ?? {})) if (r > 0 && !out.has(c)) out.set(c, r)
  return [...out]
}

/** Gli importi di una spesa in cui cercare: quello scritto e il controvalore in ogni valuta del viaggio. */
export function importiDellaSpesa(e: Pick<Expense, 'amount' | 'currency' | 'fxRate'>, fx: FxContext): ImportoCercabile[] {
  const out: ImportoCercabile[] = [{ valore: e.amount, decimali: decimaliValuta(e.currency) }]
  const base = expenseBase(e, fx)
  if (base === null) return out
  for (const [c, r] of valuteConCambio(fx)) {
    if (c === e.currency) continue
    const d = decimaliValuta(c)
    const v = c === fx.base ? base : base / r
    out.push({ valore: d === 0 ? Math.round(v) : round2(v), decimali: d })
  }
  return out
}
