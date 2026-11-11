import { describe, expect, it } from 'vitest'
import { cittaDa, parseNominatim, parsePhoton, parsePhotonReverse, parseReverse } from './geocode'

describe('parseNominatim', () => {
  it('estrae nome, nome locale, città e coordinate', () => {
    const r = parseNominatim([
      {
        lat: '35.7147651',
        lon: '139.7966553',
        name: 'Senso-ji',
        display_name: 'Senso-ji, 2, Asakusa, Taito, Tokyo, Giappone',
        namedetails: { name: '浅草寺', 'name:it': 'Senso-ji' },
        address: { city: 'Taito', suburb: 'Asakusa' },
      },
    ])
    expect(r).toEqual([
      {
        name: 'Senso-ji',
        nameLocal: '浅草寺',
        address: 'Senso-ji, 2, Asakusa, Taito, Tokyo, Giappone',
        city: 'Taito',
        lat: 35.7147651,
        lng: 139.7966553,
      },
    ])
  })
  it('usa la prima parte dell’indirizzo se manca il nome', () => {
    const r = parseNominatim([{ lat: '1', lon: '2', display_name: 'Piazza Test, Roma, Italia', address: { town: 'Roma' } }])
    expect(r[0].name).toBe('Piazza Test')
    expect(r[0].city).toBe('Roma')
    expect(r[0].nameLocal).toBeUndefined()
  })
  it('scarta risultati senza coordinate valide o senza nome', () => {
    expect(parseNominatim([{ lat: 'x', lon: '2', name: 'A' }, { lat: '1', lon: '2' }])).toEqual([])
  })
})

describe('parseReverse', () => {
  it('via e civico, città', () => {
    expect(parseReverse({ address: { road: 'Via Roma', house_number: '12', postcode: '53100', town: 'Siena', country: 'Italia' } })).toEqual({ address: 'Via Roma 12, 53100 Siena, Italia', city: 'Siena' })
    expect(parseReverse({ address: { road: 'Hrunavegur', postcode: '846', village: 'Flúðir', country: 'Islanda' } })).toEqual({ address: 'Hrunavegur, 846 Flúðir, Islanda', city: 'Flúðir' })
  })
  it('senza via usa il quartiere; risposta vuota non rompe', () => {
    expect(parseReverse({ address: { suburb: 'Asakusa', city: 'Taito' } })).toEqual({ address: 'Asakusa, Taito', city: 'Taito' })
    expect(parseReverse(null)).toEqual({ address: '', city: '' })
  })
})

describe('città dei quartieri di Tokyo', () => {
  it('Chiyoda, Shibuya… dentro la prefettura di Tokyo diventano Tokyo', () => {
    expect(cittaDa({ city: 'Chiyoda', state: 'Tokyo', 'ISO3166-2-lvl4': 'JP-13' })).toBe('Tokyo')
    expect(cittaDa({ city: '千代田区', province: '東京都' })).toBe('Tokyo')
    expect(cittaDa({ city: 'Shibuya-ku', state: 'Tokyo' })).toBe('Tokyo')
    expect(cittaDa({ city: 'Ōta City', 'ISO3166-2-lvl4': 'JP-13' })).toBe('Tokyo')
    expect(parseReverse({ address: { road: 'Marunouchi', postcode: '100-0005', city: 'Chiyoda', state: 'Tokyo', country: 'Giappone' } })).toEqual({ address: 'Marunouchi, 100-0005 Tokyo, Giappone', city: 'Tokyo' })
  })
  it('le città vere della prefettura e i quartieri omonimi altrove restano', () => {
    expect(cittaDa({ city: 'Hachiōji', state: 'Tokyo' })).toBe('Hachiōji')
    expect(cittaDa({ city: 'Kita', state: 'Osaka' })).toBe('Kita')
    expect(cittaDa({ town: 'Siena' })).toBe('Siena')
  })
})

describe('Photon (quando Nominatim non risponde)', () => {
  const disney = {
    features: [
      {
        geometry: { coordinates: [139.7658449, 35.6775185] as [number, number] },
        properties: { name: 'Disney FANTASY SHOP', street: 'Marunouchi', housenumber: '1', postcode: '100-0005', district: 'Marunouchi', city: 'Chiyoda', state: 'Tokyo', country: 'Japan', countrycode: 'JP', type: 'house' },
      },
    ],
  }
  it('reverse: indirizzo e città, con i quartieri di Tokyo riportati a Tokyo', () =>
    expect(parsePhotonReverse(disney)).toEqual({ address: 'Marunouchi 1, 100-0005 Tokyo, Japan', city: 'Tokyo' }))
  it('reverse vuoto', () => expect(parsePhotonReverse({ features: [] })).toEqual({ address: '', city: '' }))
  it('ricerca: nome, indirizzo, città e coordinate (GeoJSON è lng, lat)', () =>
    expect(parsePhoton(disney)).toEqual([{ name: 'Disney FANTASY SHOP', address: 'Disney FANTASY SHOP, Marunouchi 1, 100-0005 Tokyo, Japan', city: 'Tokyo', lat: 35.6775185, lng: 139.7658449 }]))
  it('una città trovata come tale ha il suo nome come città', () =>
    expect(parsePhoton({ features: [{ geometry: { coordinates: [11.33, 43.32] }, properties: { name: 'Siena', type: 'city', state: 'Toscana', country: 'Italy' } }] })[0].city).toBe('Siena'))
})
