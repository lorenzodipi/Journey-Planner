// Stati dei luoghi con i nomi del mock (#33) e regole automatiche:
// «In programma» quando il luogo è in una tappa (non annullata), «Visitato» quando una tappa collegata è fatta.
import type { DayItem, Place, PlaceStatus, Trip } from '../types'

export const STATO_LUOGO: Record<PlaceStatus, { label: string; cls: string; icon: string }> = {
  idea: { label: 'Da visitare', cls: 's-todo', icon: 'g-pin' },
  planned: { label: 'In programma', cls: 's-plan', icon: 'g-cal' },
  done: { label: 'Visitato', cls: 's-done', icon: 'g-check' },
  skipped: { label: 'Scartato', cls: 's-skip', icon: 'g-minus' },
}
export const STATI_LUOGO: PlaceStatus[] = ['idea', 'planned', 'done', 'skipped']

/** La tappa che usa il luogo (la prima non annullata), con il suo giorno. */
export function tappaDelLuogo(trip: Pick<Trip, 'days'>, placeId: string): { dayIndex: number; item: DayItem } | null {
  for (let i = 0; i < trip.days.length; i++) {
    const item = trip.days[i].items.find((it) => it.placeId === placeId && it.status !== 'cancelled')
    if (item) return { dayIndex: i, item }
  }
  return null
}

/** Stato mostrato: Visitato e Scartato restano; altrimenti In programma se è in una tappa, se no Da visitare. */
export function statoLuogo(trip: Pick<Trip, 'days'>, place: Pick<Place, 'id' | 'status'>): PlaceStatus {
  if (place.status === 'done' || place.status === 'skipped') return place.status
  return tappaDelLuogo(trip, place.id) ? 'planned' : 'idea'
}

/** I luoghi con lo stato mostrato al posto di quello salvato (per filtri e gruppi). */
export function conStato(trip: Pick<Trip, 'days' | 'places'>): Place[] {
  return trip.places.map((p) => {
    const s = statoLuogo(trip, p)
    return s === p.status ? p : { ...p, status: s }
  })
}
