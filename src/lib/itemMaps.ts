import { mapsLinkFor } from './mapsUrl'
import type { DayItem, Place } from '../types'

/**
 * Link per aprire in Maps il luogo di una tappa. Solo se la tappa ha un luogo collegato: per note e tempo libero
 * niente ricerche generiche, che potrebbero aprire un posto sbagliato.
 */
export function itemMapsHref(item: Pick<DayItem, 'placeId'>, places: Pick<Place, 'id' | 'name' | 'city' | 'mapsUrl' | 'lat' | 'lng'>[]): string | undefined {
  if (!item.placeId) return undefined
  const place = places.find((p) => p.id === item.placeId)
  return place ? mapsLinkFor(place) : undefined
}
