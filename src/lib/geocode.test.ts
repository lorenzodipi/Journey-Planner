import { describe, expect, it } from 'vitest'
import { parseNominatim } from './geocode'

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
