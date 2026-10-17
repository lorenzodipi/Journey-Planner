import { describe, expect, it } from 'vitest'
import { isShortMapsLink, mapsLinkFor, parseDirectionsUrl, parseMapsUrl } from './mapsUrl'

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

describe('parseDirectionsUrl', () => {
  // link di indicazioni reale (mezzi pubblici) Kamakura Station → Kyoto
  const kamakuraKyoto =
    'https://www.google.com/maps/dir/Kamakura+Station,+Kamakura,+Kanagawa,+Japan/Kyoto,+Japan/@35.5076586,139.6165538,19z/data=!4m17!4m16!1m5!1m1!1s0x601845c22bac7dc1:0x8c89b16df6cec71b!2m2!1d139.5504119!2d35.3190647!1m5!1m1!1s0x6001a8d6cd3cc3f1:0xc0961d366bbb1d3d!2m2!1d135.7681489!2d35.011564!2m1!5e2!3e3!5i1!5m1!1e2?entry=tts'

  it('legge partenza, arrivo, coordinate e mezzo', () => {
    expect(parseDirectionsUrl(kamakuraKyoto)).toEqual({
      from: { name: 'Kamakura Station', lat: 35.3190647, lng: 139.5504119 },
      to: { name: 'Kyoto', lat: 35.011564, lng: 135.7681489 },
      mode: 'train',
    })
  })
  it('riconosce gli altri mezzi', () => {
    const base = 'https://www.google.com/maps/dir/A/B/data=!2m2!1d10!2d20!1m1!2m2!1d11!2d21'
    expect(parseDirectionsUrl(`${base}!3e0`)?.mode).toBe('car')
    expect(parseDirectionsUrl(`${base}!3e2`)?.mode).toBe('walk')
    expect(parseDirectionsUrl(`${base}!3e4`)?.mode).toBe('plane')
    expect(parseDirectionsUrl(base)?.mode).toBeUndefined()
  })
  it('con tappe intermedie prende la prima e l\'ultima', () => {
    const url = 'https://www.google.com/maps/dir/Tokyo+Station/Nagoya+Station/Kyoto+Station/data=!1m1!2m2!1d139.76!2d35.68!1m1!2m2!1d136.88!2d35.17!1m1!2m2!1d135.76!2d34.98!3e3'
    const r = parseDirectionsUrl(url)
    expect(r?.from).toEqual({ name: 'Tokyo Station', lat: 35.68, lng: 139.76 })
    expect(r?.to).toEqual({ name: 'Kyoto Station', lat: 34.98, lng: 135.76 })
  })
  it('estremi dati come coordinate', () => {
    const r = parseDirectionsUrl('https://www.google.com/maps/dir/35.68,139.76/34.98,135.76/@35,137,8z')
    expect(r?.from).toEqual({ name: '', lat: 35.68, lng: 139.76 })
    expect(r?.to).toEqual({ name: '', lat: 34.98, lng: 135.76 })
  })
  it('forma con ?api=1&origin=&destination=&travelmode=', () => {
    const r = parseDirectionsUrl('https://www.google.com/maps/dir/?api=1&origin=Tokyo+Station&destination=35.0,135.7&travelmode=transit')
    expect(r).toEqual({ from: { name: 'Tokyo Station', lat: null, lng: null }, to: { name: '', lat: 35, lng: 135.7 }, mode: 'train' })
  })
  it('senza coordinate nel link restano solo i nomi', () => {
    const r = parseDirectionsUrl('https://www.google.com/maps/dir/Osaka/Nara/')
    expect(r?.from).toEqual({ name: 'Osaka', lat: null, lng: null })
  })
  it('non è un link di indicazioni → null', () => {
    expect(parseDirectionsUrl('https://www.google.com/maps/place/Senso-ji/@35.7,139.7,17z')).toBeNull()
    expect(parseDirectionsUrl('https://maps.app.goo.gl/koxKtMMwPzZXXJYs8')).toBeNull()
    expect(parseDirectionsUrl('Kamakura Kyoto')).toBeNull()
    expect(parseDirectionsUrl('https://')).toBeNull()
  })
})

describe('isShortMapsLink', () => {
  it('riconosce i link corti', () => {
    expect(isShortMapsLink('https://maps.app.goo.gl/koxKtMMwPzZXXJYs8')).toBe(true)
    expect(isShortMapsLink(' https://goo.gl/maps/abc ')).toBe(true)
    expect(isShortMapsLink('https://www.google.com/maps/dir/A/B')).toBe(false)
  })
})
