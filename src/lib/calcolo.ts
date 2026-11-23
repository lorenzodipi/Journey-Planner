// Calcoli nei campi degli importi (come Satispay o Revolut): «120+35,50», «1000/3», «4×12,5−3». Niente eval: si leggono numeri
// e operazioni, con × e ÷ prima di + e −. Ogni numero si legge come un importo dell'app (parseAmount: «1.234,50», «12,5»).

import { parseAmount } from './money'

export type Operazione = '+' | '−' | '×' | '÷'

/** I segni che si possono scrivere da tastiera, ricondotti ai quattro del tastierino. */
const SEGNI: Record<string, Operazione> = { '+': '+', '-': '−', '−': '−', '–': '−', '*': '×', '×': '×', x: '×', X: '×', '/': '÷', '÷': '÷', ':': '÷' }

const isSegno = (c: string) => c in SEGNI

/** C'è almeno un'operazione dopo il primo numero («100+», «12×3»): allora il campo è un calcolo, non un importo. */
export function eCalcolo(testo: string): boolean {
  const t = testo.trim()
  for (let i = 1; i < t.length; i++) if (isSegno(t[i])) return true
  return false
}

/** Il risultato del calcolo (arrotondato al centesimo), o null se non torna (divisione per zero, numero non valido, negativo). Un'operazione in fondo («100+») si ignora. */
export function calcola(testo: string): number | null {
  const t = testo.replace(/\s/g, '')
  if (!t) return null
  const numeri: number[] = []
  const ops: Operazione[] = []
  let cur = ''
  for (const c of t) {
    if (isSegno(c) && cur !== '') {
      const n = parseAmount(cur)
      if (n === null) return null
      numeri.push(n)
      ops.push(SEGNI[c])
      cur = ''
    } else if (isSegno(c)) {
      // due segni di fila: vale l'ultimo («5+×2» = «5×2»); un segno all'inizio non conta
      if (ops.length > 0) ops[ops.length - 1] = SEGNI[c]
    } else cur += c
  }
  if (cur !== '') {
    const n = parseAmount(cur)
    if (n === null) return null
    numeri.push(n)
  } else ops.pop()
  if (numeri.length === 0) return null
  // prima × e ÷, poi + e −
  const somma: number[] = [numeri[0]]
  const segni: ('+' | '−')[] = []
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const n = numeri[i + 1]
    if (op === '×') somma[somma.length - 1] *= n
    else if (op === '÷') {
      if (n === 0) return null
      somma[somma.length - 1] /= n
    } else {
      somma.push(n)
      segni.push(op)
    }
  }
  let r = somma[0]
  for (let i = 0; i < segni.length; i++) r = segni[i] === '+' ? r + somma[i + 1] : r - somma[i + 1]
  if (!Number.isFinite(r) || r < -1e-9) return null
  return Math.round(r * 100) / 100
}

/** Come parseAmount, ma un calcolo vale il suo risultato: è il valore del campo dell'importo. */
export function leggiImporto(testo: string): number | null {
  return eCalcolo(testo) ? calcola(testo) : parseAmount(testo)
}

/** Il testo del campo dopo il tasto premuto sul tastierino (si scrive sempre in fondo). */
export function premi(testo: string, tasto: string): string {
  if (tasto === '⌫') return testo.slice(0, -1)
  if (isSegno(tasto)) {
    if (!testo) return testo // niente segno all'inizio
    const ultimo = testo[testo.length - 1]
    if (isSegno(ultimo)) return testo.slice(0, -1) + tasto // cambia segno
    if (ultimo === ',') return testo.slice(0, -1) + tasto
    return testo + tasto
  }
  if (tasto === ',') {
    // una sola virgola per numero; «,» all'inizio di un numero diventa «0,»
    const numero = testo.split(/[+\-−–*×xX/÷:]/).pop() ?? ''
    if (numero.includes(',')) return testo
    return testo + (numero === '' ? '0,' : ',')
  }
  // cifre: «0» davanti non si ripete («00»)
  const numero = testo.split(/[+\-−–*×xX/÷:]/).pop() ?? ''
  if (numero === '0') return testo.slice(0, -1) + tasto
  return testo + tasto
}
