// Persone dentro una riga delle card (alloggi, trasporti): pallini con le iniziali, poi «Tutti» se ci sono tutti i
// viaggiatori, altrimenti i nomi. Stesso formato in ogni card.
import { discOf, initials } from '../state/me'
import type { Trip } from '../types'

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']

/** Vero se le due liste hanno le stesse persone, in qualunque ordine. */
export function stessePersone(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id))
}

export function PersoneRiga({ trip, ids }: { trip: Pick<Trip, 'travelers'>; ids: readonly string[] }) {
  // nell'ordine dei viaggiatori, così i pallini sono uguali in ogni riga
  const people = trip.travelers.filter((p) => ids.includes(p.id))
  const tutti = trip.travelers.length > 1 && stessePersone(trip.travelers.map((p) => p.id), people.map((p) => p.id))
  return (
    <>
      <span aria-hidden="true" className="avs">
        {people.slice(0, 4).map((p) => (
          <span key={p.id} style={{ background: `var(--disco-${COL[(discOf(trip, p.id) - 1) % 5]})` }}>
            {initials(p.name)}
          </span>
        ))}
      </span>
      {tutti ? 'Tutti' : people.map((p) => p.name.split(/\s+/)[0]).join(', ')}
    </>
  )
}
