import { describe, expect, it } from 'vitest'
import { parseKml, type KmzPoint } from './kmz'
import { matchPlaces, nearestCity, normName, planImport } from './kmzPlan'
import type { Place } from '../types'

const place = (id: string, name: string, lat: number | null, lng: number | null, extra: Partial<Place> = {}): Place => ({
  id,
  name,
  city: '',
  category: '',
  status: 'idea',
  lat,
  lng,
  ...extra,
})
const pt = (name: string, lat: number | null = 1, lng: number | null = 1, extra: Partial<KmzPoint> = {}): KmzPoint => ({
  name,
  folder: '',
  type: '',
  city: '',
  lat,
  lng,
  address: name,
  note: '',
  links: [],
  url: `https://maps.test/${encodeURIComponent(name)}`,
  ...extra,
})

describe('abbinamento ai luoghi esistenti', () => {
  it('normalizza i nomi', () => {
    expect(normName('The Tokyo-Tower!')).toBe('tokyo tower')
    expect(normName('Café  Ōmori')).toBe('cafe omori')
  })

  it('abbina per nome identico, simile o nome locale', () => {
    const places = [place('1', 'Senso-ji', 0, 0), place('2', 'Ichiran', 0, 0), place('3', 'Tempio', 0, 0, { nameLocal: '浅草寺' })]
    const { matched, fresh } = matchPlaces([pt('senso ji'), pt('Ichiran Shibuya'), pt('浅草寺'), pt('Nuovo posto')], places)
    expect(matched.map((m) => [m.point.name, m.place.id])).toEqual([
      ['senso ji', '1'],
      ['浅草寺', '3'],
      ['Ichiran Shibuya', '2'],
    ])
    expect(fresh.map((p) => p.name)).toEqual(['Nuovo posto'])
  })

  it('un luogo esistente si usa una volta sola e il nome identico ha la precedenza', () => {
    const { matched, fresh } = matchPlaces([pt('Ichiran Ueno'), pt('Ichiran')], [place('1', 'Ichiran', 0, 0)])
    expect(matched.map((m) => [m.point.name, m.how])).toEqual([['Ichiran', 'nome']])
    expect(fresh.map((p) => p.name)).toEqual(['Ichiran Ueno'])
  })

  it('abbina per vicinanza solo se la prima parola del nome coincide', () => {
    const places = [place('1', 'Sushi Dai', 35.6, 139.7)]
    expect(matchPlaces([pt('Sushi Daiwa', 35.6005, 139.7)], places).matched).toHaveLength(1)
    expect(matchPlaces([pt('Sushi Daiwa', 35.7, 139.7)], places).fresh).toHaveLength(1)
    expect(matchPlaces([pt('Museo', 35.6005, 139.7)], places).fresh).toHaveLength(1)
  })

  it('dà ai luoghi nuovi la città del vicino più prossimo', () => {
    const places = [place('1', 'A', 35.0, 139.0, { city: 'Tokyo' }), place('2', 'B', 34.7, 135.5, { city: 'Osaka' })]
    expect(nearestCity({ lat: 35.01, lng: 139.01 }, places)).toBe('Tokyo')
    expect(nearestCity({ lat: 34.69, lng: 135.51 }, places)).toBe('Osaka')
    expect(nearestCity({ lat: 43, lng: 141 }, places)).toBeNull()
    expect(nearestCity({ lat: null, lng: null }, places)).toBeNull()
  })
})

describe('piano dell\'import', () => {
  const kml = `<kml><Document><Folder><name>Nara</name>
    <Placemark><name>Tempio Todai-ji</name><address>Tempio Todai-ji 406 Zoshicho, Nara</address>
      <ExtendedData><Data name="Tipologia"><value>Tempio</value></Data><Data name="Città"><value>Nara</value></Data>
      <Data name="Indirizzo"><value>406 Zoshicho, Nara</value></Data><Data name="Note"><value>Aprire presto</value></Data></ExtendedData></Placemark>
    <Placemark><name>Kasuga Taisha</name><address>Kasuga Taisha 160 Kasuganocho, Nara</address>
      <ExtendedData><Data name="Tipologia"><value>Santuario</value></Data><Data name="Città"><value>Nara</value></Data><Data name="Indirizzo"><value>160 Kasuganocho, Nara</value></Data></ExtendedData></Placemark>
  </Folder></Document></kml>`
  const { points } = parseKml(kml)

  it('aggiunge il link ai luoghi presenti e crea quelli nuovi con la categoria della tipologia', () => {
    const places = [place('1', 'Tempio Todai-ji', 34.69, 135.84, { city: 'Nara' })]
    const plan = planImport(points, places, ['Tempio'])
    expect(plan.matched).toBe(1)
    expect(plan.updates).toEqual([
      { id: '1', name: 'Tempio Todai-ji', patch: { mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Tempio%20Todai-ji%20406%20Zoshicho%2C%20Nara' } },
    ])
    expect(plan.fresh).toHaveLength(1)
    expect(plan.fresh[0]).toMatchObject({ name: 'Kasuga Taisha', city: 'Nara', category: 'Santuario', address: '160 Kasuganocho, Nara', lat: null, lng: null, status: 'idea' })
    expect(plan.newCategories).toEqual(['Santuario'])
    expect(plan.withoutCoords).toBe(2)
  })

  it('non tocca i link già presenti, a meno che si chieda di sostituirli', () => {
    const places = [place('1', 'Tempio Todai-ji', 34.69, 135.84, { mapsUrl: 'https://maps.app.goo.gl/mio' })]
    expect(planImport(points, places, []).updates).toEqual([])
    expect(planImport(points, places, [], { replaceLinks: true }).updates).toHaveLength(1)
  })

  it('con le coordinate di Google sposta il pin e segnala i luoghi troppo distanti', () => {
    const withCoords = [pt('Tokyo Tower', 35.6586, 139.7454)]
    const near = planImport(withCoords, [place('1', 'Tokyo Tower', 35.6590, 139.7460)], [])
    expect(near.updates[0].patch).toMatchObject({ lat: 35.6586, lng: 139.7454 })
    expect(near.far).toEqual([])
    const far = planImport(withCoords, [place('1', 'Tokyo Tower', 34.7, 135.5)], [])
    expect(far.far).toHaveLength(1)
    expect(far.far[0].name).toBe('Tokyo Tower')
    expect(far.far[0].km).toBeGreaterThan(300)
    expect(planImport(withCoords, [place('1', 'Tokyo Tower', 34.7, 135.5)], [], { moveCoords: false }).updates[0].patch.lat).toBeUndefined()
  })

  it('è idempotente: ripetuto dopo l\'import non c\'è più nulla da fare', () => {
    const imported = [
      place('1', 'Tempio Todai-ji', null, null, { mapsUrl: points[0].url }),
      place('2', 'Kasuga Taisha', null, null, { mapsUrl: points[1].url, city: 'Nara' }),
    ]
    const plan = planImport(points, imported, ['Tempio', 'Santuario'])
    expect(plan.updates).toEqual([])
    expect(plan.fresh).toEqual([])
    expect(plan.matched).toBe(2)
  })
})
