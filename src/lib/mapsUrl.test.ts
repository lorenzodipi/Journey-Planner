import { describe, expect, it } from 'vitest'
import { mapsLinkFor, parseMapsUrl } from './mapsUrl'

describe('parseMapsUrl', () => {
  it('preferisce il pin preciso e legge il nome', () => {
    const url =
      'https://www.google.com/maps/place/Senso-ji/@35.7147651,139.7966553,17z/data=!3m1!4b1!4m6!3m5!1s0x60188:0x1!8m2!3d35.7148!4d139.7967'
    expect(parseMapsUrl(url)).toEqual({ lat: 35.7148, lng: 139.7967, name: 'Senso-ji' })
  })
  it('legge il centro @lat,lng', () => {
    expect(parseMapsUrl('https://www.google.com/maps/@35.68,139.76,15z')).toEqual({ lat: 35.68, lng: 139.76, name: undefined })
  })
  it('legge ?q= e ?query=', () => {
    expect(parseMapsUrl('https://www.google.com/maps?q=35.6586,139.7454')?.lat).toBe(35.6586)
    expect(parseMapsUrl('https://www.google.com/maps/search/?api=1&query=35.6586%2C139.7454')?.lng).toBe(139.7454)
  })
  it('legge coordinate negative', () => {
    expect(parseMapsUrl('https://maps.google.com/?ll=-33.86,151.21')).toEqual({ lat: -33.86, lng: 151.21, name: undefined })
  })
  it('decodifica i nomi con spazi e caratteri speciali', () => {
    expect(parseMapsUrl('https://www.google.com/maps/place/Tokyo+Tower/@35.6586,139.7454,17z')?.name).toBe('Tokyo Tower')
  })
  it('link corti, testo libero e coordinate impossibili → null', () => {
    expect(parseMapsUrl('https://maps.app.goo.gl/abc123')).toBeNull()
    expect(parseMapsUrl('Senso-ji Tokyo')).toBeNull()
    expect(parseMapsUrl('https://www.google.com/maps/@135.0,239.0,15z')).toBeNull()
  })
})

describe('mapsLinkFor', () => {
  it('usa il link salvato', () => expect(mapsLinkFor({ mapsUrl: 'https://x.y', lat: 1, lng: 2, name: 'a' })).toBe('https://x.y'))
  it('altrimenti le coordinate', () =>
    expect(mapsLinkFor({ lat: 35.1, lng: 139.2, name: 'a' })).toContain('query=35.1%2C139.2'))
  it('altrimenti nome e città', () =>
    expect(mapsLinkFor({ lat: null, lng: null, name: 'Senso-ji', city: 'Tokyo' })).toContain('Senso-ji%20Tokyo'))
})
