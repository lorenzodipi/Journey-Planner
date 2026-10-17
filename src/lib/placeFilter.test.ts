import { describe, expect, it } from 'vitest'
import type { Place } from '../types'
import { EMPTY_FILTERS, countActive, filterPlaces, toggleValue } from './placeFilter'

const p = (name: string, city: string, category: string, status: Place['status'] = 'idea'): Place => ({
  id: name, name, city, category, status, lat: null, lng: null,
})
const places = [
  p('Senso-ji', 'Tokyo', 'Tempio'),
  p('Meiji', 'Tokyo', 'Tempio', 'planned'),
  p('Tsukiji', 'Tokyo', 'Cibo'),
  p('Fushimi Inari', 'Kyoto', 'Tempio', 'done'),
  p('Dotonbori', 'Osaka', 'Cibo'),
]
const names = (r: Place[]) => r.map((x) => x.name)

describe('filterPlaces', () => {
  it('senza filtri restituisce tutto', () => expect(filterPlaces(places, EMPTY_FILTERS)).toHaveLength(5))
  it('più valori nello stesso gruppo = oppure', () => {
    expect(names(filterPlaces(places, { ...EMPTY_FILTERS, cities: ['Kyoto', 'Osaka'] }))).toEqual(['Fushimi Inari', 'Dotonbori'])
  })
  it('gruppi diversi = e', () => {
    const r = filterPlaces(places, { cities: ['Tokyo'], categories: ['Tempio', 'Cibo'], statuses: ['idea'] })
    expect(names(r)).toEqual(['Senso-ji', 'Tsukiji'])
  })
  it('il testo si combina con i filtri, senza badare ad accenti e maiuscole', () => {
    expect(names(filterPlaces(places, { ...EMPTY_FILTERS, categories: ['Tempio'] }, 'MEIJI'))).toEqual(['Meiji'])
    expect(names(filterPlaces([p('Café È', 'Roma', '')], EMPTY_FILTERS, 'cafe e'))).toEqual(['Café È'])
  })
  it('nessun risultato se i filtri sono incompatibili', () => {
    expect(filterPlaces(places, { cities: ['Osaka'], categories: ['Tempio'], statuses: [] })).toEqual([])
  })
})

describe('toggleValue / countActive', () => {
  it('aggiunge e toglie', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b'])
  })
  it('conta i valori selezionati', () => {
    expect(countActive({ cities: ['x'], categories: ['y', 'z'], statuses: [] })).toBe(3)
  })
})
