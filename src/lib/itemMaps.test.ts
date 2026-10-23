import { describe, expect, it } from 'vitest'
import { itemMapsHref } from './itemMaps'

const places = [
  { id: 'a', name: 'Senso-ji', city: 'Tokyo', mapsUrl: 'https://maps.app.goo.gl/x', lat: null, lng: null },
  { id: 'b', name: 'Tsukiji', city: 'Tokyo', lat: 35.66, lng: 139.77 },
  { id: 'c', name: 'Ueno', city: 'Tokyo', lat: null, lng: null },
]

describe('itemMapsHref', () => {
  it('senza luogo collegato: nessun link', () => expect(itemMapsHref({}, places)).toBeUndefined())
  it('luogo che non esiste più: nessun link', () => expect(itemMapsHref({ placeId: 'zzz' }, places)).toBeUndefined())
  it('usa il link salvato', () => expect(itemMapsHref({ placeId: 'a' }, places)).toBe('https://maps.app.goo.gl/x'))
  it('altrimenti le coordinate', () => expect(itemMapsHref({ placeId: 'b' }, places)).toContain('35.66%2C139.77'))
  it('altrimenti nome e città', () => expect(itemMapsHref({ placeId: 'c' }, places)).toContain('Ueno%20Tokyo'))
})
