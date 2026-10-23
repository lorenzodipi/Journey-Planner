import { changedPositions, renumber } from './itemOrder'

// Riordino a trascinamento: calcoli puri (la parte con i tocchi sta in ui/useDragReorder).

/**
 * Dove finisce la riga trascinata: `mids` sono i centri verticali delle righe ferme, `from` l'indice della riga
 * trascinata e `y` il suo centro adesso. Il nuovo indice è il numero di altre righe che stanno sopra `y`.
 */
export function dropIndex(mids: number[], from: number, y: number): number {
  let to = 0
  mids.forEach((m, i) => {
    if (i !== from && m < y) to++
  })
  return to
}

/** Di quanto si sposta la riga `i` mentre `from` viene trascinata su `to`: -1 sale di un posto, +1 scende, 0 resta. */
export function shiftDirection(i: number, from: number, to: number): -1 | 0 | 1 {
  if (i === from) return 0
  if (from < i && i <= to) return -1
  if (to <= i && i < from) return 1
  return 0
}

/**
 * Posizioni da scrivere per portare la tappa `from` al posto `to`; `null` se non c'è nulla da fare.
 * Le tappe con un orario seguono l'orario e non si spostano a mano; le altre possono andare ovunque.
 */
export function planMove(
  items: { id: string; position?: number; time?: string }[],
  from: number,
  to: number,
): { id: string; position: number }[] | null {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return null
  if (items[from].time) return null
  const next = items.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  const changed = changedPositions(items, renumber(next))
  return changed.length === 0 ? null : changed
}
