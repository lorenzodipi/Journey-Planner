// Ordinamento "frazionario": ogni elemento ha un numero `position`. Per inserire
// o spostare un elemento si calcola un valore tra i due vicini, senza riscrivere
// tutte le altre righe (importante per la sincronizzazione offline).

const STEP = 1000
const MIN_GAP = 1e-6

/** Posizione per un elemento inserito tra `prev` e `next` (entrambi opzionali). */
export function between(prev?: number | null, next?: number | null): number {
  if (prev == null && next == null) return STEP
  if (prev == null) return (next as number) - STEP
  if (next == null) return prev + STEP
  return (prev + next) / 2
}

/** True se due posizioni sono troppo vicine e conviene rinumerare la lista. */
export function needsRebalance(positions: number[]): boolean {
  const sorted = [...positions].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < MIN_GAP) return true
  }
  return false
}

/** Nuove posizioni equidistanti (1000, 2000, ...) per una lista di `n` elementi. */
export function rebalance(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (i + 1) * STEP)
}

/** Posizione di destinazione per spostare un elemento dall'indice `from` a `to`. */
export function positionForMove(positions: number[], from: number, to: number): number {
  const others = positions.filter((_, i) => i !== from)
  const prev = to > 0 ? others[to - 1] : null
  const next = to < others.length ? others[to] : null
  return between(prev, next)
}
