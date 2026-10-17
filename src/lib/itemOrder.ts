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
