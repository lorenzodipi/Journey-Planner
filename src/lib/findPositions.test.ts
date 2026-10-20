import { describe, expect, it } from 'vitest'
import type { GeoResult } from './geocode'
import { CityCenters, findPositions, locatePlace, pickResult, queriesFor, type Searchable, type Searcher } from './findPositions'

const KYOTO = { lat: 35.01, lng: 135.77 }
const hit = (lat: number, lng: number, name = 'x'): GeoResult => ({ name, address: '', city: '', lat, lng })
const place = (id: string, name: string, city = 'Kyoto', address = ''): Searchable => ({ id, name, city, address, lat: null, lng: null })

describe('queriesFor', () => {
  it('nome+città, poi indirizzo senza il nome, poi solo il nome', () => {
    expect(queriesFor({ name: 'Todai-ji', city: 'Nara', address: '406 Zoshicho, Nara' })).toEqual(['Todai-ji, Nara', '406 Zoshicho, Nara', 'Todai-ji'])
  })
  it('aggiunge la città all\'indirizzo se manca, e toglie i doppioni', () => {
    expect(queriesFor({ name: 'Gion', city: 'Kyoto', address: 'Gion' })).toEqual(['Gion, Kyoto', 'Gion'])
    expect(queriesFor({ name: 'Bar', city: 'Osaka', address: 'Bar 1-2-3 Namba' })).toEqual(['Bar, Osaka', '1-2-3 Namba, Osaka', 'Bar'])
  })
  it('senza città cerca solo per nome e indirizzo', () => {
    expect(queriesFor({ name: 'Maruten', city: '', address: '' })).toEqual(['Maruten'])
  })
})

describe('pickResult', () => {
  it('prende il più vicino e scarta i troppo lontani', () => {
    const far = hit(35.68, 139.69) // Tokyo
    const near = hit(35.02, 135.78)
    expect(pickResult([far, near], KYOTO, 40)).toBe(near)
    expect(pickResult([far], KYOTO, 40)).toBeNull()
  })
})

describe('locatePlace', () => {
  it('passa alla ricerca successiva se la prima non dà risultati plausibili', async () => {
    const asked: string[] = []
    const search: Searcher = async (q) => {
      asked.push(q)
      return q === 'Sagatenryuji, Kyoto' ? [hit(35.0168, 135.6713)] : q.startsWith('Arashima') ? [hit(40.7, -74)] : []
    }
    const at = await locatePlace(place('a', 'Arashima Bamboo Grove', 'Kyoto', 'Arashima Bamboo Grove Sagatenryuji'), search, new CityCenters(), KYOTO)
    expect(at).toEqual({ lat: 35.0168, lng: 135.6713 })
    expect(asked).toEqual(['Arashima Bamboo Grove, Kyoto', 'Sagatenryuji, Kyoto'])
  })
  it('una volta trovato un luogo, la città diventa il riferimento per i successivi', async () => {
    const centers = new CityCenters()
    await locatePlace(place('a', 'A'), async () => [hit(35.0, 135.7)], centers, KYOTO)
    expect(centers.get('kyoto')).toEqual({ lat: 35.0, lng: 135.7 })
    // un omonimo a 300 km non è più accettato (entro 40 km dalla città)
    expect(await locatePlace(place('b', 'B'), async () => [hit(35.0, 139.0)], centers, KYOTO)).toBeNull()
  })
})

describe('findPositions', () => {
  const ok: Searcher = async (q) => (q.startsWith('Perso') ? [] : [hit(35.0 + q.length / 1000, 135.7)])
  it('salva a gruppi e riporta i non trovati', async () => {
    const saved: number[] = []
    const r = await findPositions({
      places: [place('1', 'Uno'), place('2', 'Due'), place('3', 'Perso'), place('4', 'Quattro')],
      tripCenter: KYOTO,
      search: ok,
      batchSize: 2,
      save: async (b) => (saved.push(b.length), null),
    })
    expect(r.found).toBe(3)
    expect(r.notFound.map((p) => p.name)).toEqual(['Perso'])
    expect(saved.reduce((a, b) => a + b, 0)).toBe(3)
    expect(r.error).toBeUndefined()
  })
  it('se la ricerca fallisce si ferma ma salva quanto trovato', async () => {
    let n = 0
    const saved: string[] = []
    const r = await findPositions({
      places: [place('1', 'Uno'), place('2', 'Due'), place('3', 'Tre')],
      tripCenter: KYOTO,
      search: async () => {
        if (++n > 2) throw new Error('Ricerca non disponibile (429)')
        return [hit(35.0, 135.7)]
      },
      save: async (b) => (saved.push(...b.map((x) => x.id)), null),
    })
    expect(r.error).toMatch(/429/)
    expect(saved.length).toBe(2)
    expect(r.found).toBe(2)
  })
  it('traduce gli errori di rete del browser', async () => {
    const r = await findPositions({ places: [place('1', 'Uno')], tripCenter: KYOTO, search: async () => Promise.reject(new TypeError('Failed to fetch')), save: async () => null })
    expect(r.error).toMatch(/controlla la connessione/)
  })
  it('si ferma se il salvataggio non riesce', async () => {
    const r = await findPositions({ places: [place('1', 'Uno'), place('2', 'Due')], tripCenter: KYOTO, search: ok, batchSize: 1, save: async () => 'Sei offline.' })
    expect(r.error).toMatch(/Sei offline/)
    expect(r.found).toBe(0)
  })
  it('si può interrompere', async () => {
    let calls = 0
    const r = await findPositions({ places: [place('1', 'Uno'), place('2', 'Due')], tripCenter: KYOTO, search: ok, shouldStop: () => ++calls > 1, save: async () => null })
    expect(r.stopped).toBe(true)
    expect(r.found).toBe(1)
  })
})
