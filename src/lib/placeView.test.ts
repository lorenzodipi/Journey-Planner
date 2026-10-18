import { describe, expect, it } from 'vitest'
import type { Place } from '../types'
import { DEFAULT_VIEW, viewPlaces } from './placeView'

const p = (name: string, city: string, category: string, status: Place['status'] = 'idea', estCost?: number): Place => ({
  id: name, name, city, category, status, estCost, lat: null, lng: null,
})
const places = [
  p('Senso-ji', 'Tokyo', 'Tempio', 'planned', 0),
  p('Tsukiji', 'Tokyo', 'Cibo', 'idea', 30),
  p('Fushimi Inari', 'Kyoto', 'Tempio', 'done'),
  p('Dotonbori', 'Osaka', 'Cibo', 'idea', 15),
  p('Boh', '', '', 'skipped'),
]
const days: Record<string, number> = { 'Senso-ji': 1, Tsukiji: 0 }
const ctx = { dayIndex: (id: string) => days[id], categoryOrder: ['Tempio', 'Cibo'] }
const names = (g: { places: Place[] }[]) => g.flatMap((x) => x.places.map((y) => y.name))

describe('viewPlaces', () => {
  it('di base: un solo gruppo, per nome', () => {
    const g = viewPlaces(places, DEFAULT_VIEW, ctx)
    expect(g).toHaveLength(1)
    expect(names(g)).toEqual(['Boh', 'Dotonbori', 'Fushimi Inari', 'Senso-ji', 'Tsukiji'])
  })

  it('per città: gruppi in ordine alfabetico, senza città in fondo', () => {
    const g = viewPlaces(places, { groupBy: 'city', sortBy: 'name' }, ctx)
    expect(g.map((x) => x.title)).toEqual(['Kyoto', 'Osaka', 'Tokyo', 'Senza città'])
    expect(g[2].places.map((x) => x.name)).toEqual(['Senso-ji', 'Tsukiji'])
  })

  it('per categoria: nell\'ordine delle categorie del viaggio', () => {
    const g = viewPlaces(places, { groupBy: 'category', sortBy: 'name' }, ctx)
    expect(g.map((x) => x.title)).toEqual(['Tempio', 'Cibo', 'Senza categoria'])
  })

  it('per stato: idee, pianificati, fatti, saltati', () => {
    const g = viewPlaces(places, { groupBy: 'status', sortBy: 'name' }, ctx)
    expect(g.map((x) => x.title)).toEqual(['Idee', 'Pianificati', 'Fatti', 'Saltati'])
  })

  it('per giorno: giorni in sequenza, poi da assegnare', () => {
    const g = viewPlaces(places, { groupBy: 'day', sortBy: 'name' }, ctx)
    expect(g.map((x) => x.title)).toEqual(['Giorno 1', 'Giorno 2', 'Da assegnare'])
  })

  it('ordina per costo: dal più caro, senza costo in fondo', () => {
    const g = viewPlaces(places, { groupBy: 'none', sortBy: 'cost' }, ctx)
    expect(names(g).slice(0, 3)).toEqual(['Tsukiji', 'Dotonbori', 'Senso-ji'])
  })

  it('ordina per giorno: prima quelli in programma', () => {
    const g = viewPlaces(places, { groupBy: 'none', sortBy: 'day' }, ctx)
    expect(names(g).slice(0, 2)).toEqual(['Tsukiji', 'Senso-ji'])
  })

  it('non perde né duplica luoghi', () => {
    for (const groupBy of ['none', 'city', 'category', 'status', 'day'] as const)
      expect(names(viewPlaces(places, { groupBy, sortBy: 'status' }, ctx)).sort()).toEqual(places.map((x) => x.name).sort())
  })
})
