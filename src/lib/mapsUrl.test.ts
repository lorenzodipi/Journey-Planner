import { describe, expect, it } from 'vitest'
import { mapsLinkFor, nomeDalLink, parseMapsUrl } from './mapsUrl'

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

describe('nome del posto dal link', () => {
  const lungo =
    'https://www.google.com/maps/place/Disney+Fantasy+Shop+Tokyo+station/@35.6775228,139.76327,17z/data=!3m1!4b1!4m6!3m5!1s0x60188b560b6d6555:0x2c6915af00a25373!8m2!3d35.6775185!4d139.7658449!16s%2Fg%2F11v9v93p1n?entry=ttu&g_ep=EgoyMDI2MTEwOC4wIKXMDSoASAFQAw%3D%3D'
  it('il link di Lorenzo: nome e pin preciso', () => expect(parseMapsUrl(lungo)).toEqual({ lat: 35.6775185, lng: 139.7658449, name: 'Disney Fantasy Shop Tokyo station' }))
  it('toglie l’indirizzo che Google mette dopo il nome', () => {
    expect(nomeDalLink('Disney+FANTASY+SHOP,+1-chome-9-1+Marunouchi,+Chiyoda+City,+Tokyo+100-0005,+Japan')).toBe('Disney FANTASY SHOP')
    expect(nomeDalLink('Caf%C3%A9+de+Flore,+172+Bd+Saint-Germain,+75006+Paris')).toBe('Café de Flore')
    expect(parseMapsUrl('https://www.google.com/maps/place/Secret+Lagoon,+Hvammsvegur,+846+Fl%C3%BA%C3%B0ir,+Islanda/@64.13,-20.31,17z')?.name).toBe('Secret Lagoon')
  })
  it('un indirizzo o delle coordinate non sono un nome', () => {
    expect(nomeDalLink('1-chome-9-1+Marunouchi,+Chiyoda+City,+Tokyo+100-0005')).toBeUndefined()
    expect(nomeDalLink('35%C2%B040\'39.1%22N+139%C2%B045\'57.0%22E')).toBeUndefined()
    expect(nomeDalLink('35.6775,139.7658')).toBeUndefined()
  })
  it('un nome con una virgola e niente indirizzo resta intero', () => expect(nomeDalLink('Bar+Pasticceria,+Gelateria')).toBe('Bar Pasticceria, Gelateria'))
})
