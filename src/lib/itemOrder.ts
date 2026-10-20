import { between, positionForMove } from './position'

// Ordine delle tappe di un giorno: ogni tappa ha una `position` numerica.
// Una nuova tappa con orario va al posto giusto tra le altre; senza orario va in fondo.

interface Ordered {
  position: number
  time?: string
}

/** Posizione per una nuova tappa. `items` deve essere già ordinato per posizione. */
export function positionForNew(items: Ordered[], time?: string): number {
  if (items.length === 0) return between(null, null)
  if (time) {
    const idx = items.findIndex((i) => i.time && i.time > time)
    if (idx !== -1) return between(idx > 0 ? items[idx - 1].position : null, items[idx].position)
  }
  return between(items[items.length - 1].position, null)
}

/** Nuova posizione per spostare la tappa `index` di una casella (-1 su, +1 giù); null se non si può. */
export function positionForStep(items: Ordered[], index: number, step: -1 | 1): number | null {
  const to = index + step
  if (to < 0 || to >= items.length) return null
  return positionForMove(
    items.map((i) => i.position),
    index,
    to,
  )
}

// ---------- ordine mostrato ----------

interface Timed {
  position?: number
  time?: string
}

/**
 * Ordine con cui si mostrano le tappe di un giorno: segue le posizioni salvate, ma le tappe con
 * un orario si dispongono in ordine di orario tra i loro posti. Le tappe senza orario restano
 * dove le ha messe chi ha scritto il programma. Così cambiare un'ora dalla modifica rimette a
 * posto la lista, senza dover riordinare a mano.
 */
export function orderItems<T extends Timed>(items: T[]): T[] {
  const byPosition = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.position ?? 0) - (b.item.position ?? 0) || a.index - b.index)
    .map((x) => x.item)
  const slots: number[] = []
  byPosition.forEach((it, i) => {
    if (it.time) slots.push(i)
  })
  // sort stabile: a parità di orario resta l'ordine di posizione
  const timed = slots.map((i) => byPosition[i]).sort((a, b) => (a.time as string).localeCompare(b.time as string))
  const out = byPosition.slice()
  slots.forEach((slot, k) => {
    out[slot] = timed[k]
  })
  return out
}

/** Due tappe con orari diversi hanno un ordine fisso (quello dell'orario): non si possono scambiare a mano. */
export function canSwap(a: Timed, b: Timed): boolean {
  return !(a.time && b.time && a.time !== b.time)
}

/** Posizioni 1000, 2000… da assegnare a una lista già nell'ordine voluto. */
export function renumber<T extends { id: string }>(items: T[]): { id: string; position: number }[] {
  return items.map((it, i) => ({ id: it.id, position: (i + 1) * 1000 }))
}

/** Tra le posizioni da assegnare, solo quelle diverse da quelle già salvate: spostare una tappa non riscrive tutto il giorno. */
export function changedPositions(before: { id: string; position?: number }[], next: { id: string; position: number }[]): { id: string; position: number }[] {
  const saved = new Map(before.map((b) => [b.id, b.position]))
  return next.filter((n) => saved.get(n.id) !== n.position)
}
