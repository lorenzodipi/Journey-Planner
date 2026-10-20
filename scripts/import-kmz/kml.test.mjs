import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { googleLinks, kmlFromBytes, mapsUrlFor, parseKml, plainText } from './kml.mjs'
import { matchPlaces, nearestCity, normName } from './match.mjs'

/** Zip minimo (un solo file, compresso) per provare la lettura del .kmz. */
function zip(name, text, method = 8) {
  const raw = Buffer.from(text, 'utf8')
  const data = method === 8 ? deflateRawSync(raw) : raw
  const nm = Buffer.from(name)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(method, 8)
  local.writeUInt32LE(data.length, 18)
  local.writeUInt32LE(raw.length, 22)
  local.writeUInt16LE(nm.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(method, 10)
  central.writeUInt32LE(data.length, 20)
  central.writeUInt32LE(raw.length, 24)
  central.writeUInt16LE(nm.length, 28)
  central.writeUInt32LE(0, 42)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(1, 8)
  eocd.writeUInt16LE(1, 10)
  eocd.writeUInt32LE(46 + nm.length, 12)
  eocd.writeUInt32LE(30 + nm.length + data.length, 16)
  return Buffer.concat([local, nm, data, central, nm, eocd])
}

const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Giappone</name>
<Folder><name>Ristoranti</name>
  <Placemark><name>Ichiran Shibuya</name>
    <description><![CDATA[Ramen ottimo<br>https://www.google.com/maps/place/Ichiran/data=!3m1!1e3?cid=123456]]></description>
    <Point><coordinates>139.7005,35.6595,0</coordinates></Point></Placemark>
  <Placemark><name>Caf&#233; &amp; Co</name><Point><coordinates>
     139.71, 35.66, 0</coordinates></Point></Placemark>
</Folder>
<Folder><name>Templi</name>
  <Placemark><name>Senso-ji</name><description>Aprire presto</description><Point><coordinates>139.7966,35.7148,0</coordinates></Point></Placemark>
  <Placemark><name>Percorso</name><LineString><coordinates>1,2,0 3,4,0</coordinates></LineString></Placemark>
</Folder></Document></kml>`

describe('lettura del kmz', () => {
  it('apre lo zip (compresso o no) e legge il kml', () => {
    expect(kmlFromBytes(zip('doc.kml', KML))).toBe(KML)
    expect(kmlFromBytes(zip('doc.kml', KML, 0))).toBe(KML)
    expect(kmlFromBytes(Buffer.from(KML))).toBe(KML) // anche un .kml semplice
  })

  it('rifiuta uno zip senza kml', () => {
    expect(() => kmlFromBytes(zip('foto.jpg', 'x'))).toThrow(/kml/i)
  })

  it('estrae nome, livello, coordinate (lng,lat) e ignora linee e aree', () => {
    const { points, skipped, folders } = parseKml(KML)
    expect(folders).toEqual(['Ristoranti', 'Templi'])
    expect(skipped).toBe(1)
    expect(points.map((p) => p.name)).toEqual(['Ichiran Shibuya', 'Café & Co', 'Senso-ji'])
    expect(points[0]).toMatchObject({ folder: 'Ristoranti', lat: 35.6595, lng: 139.7005 })
    expect(points[1]).toMatchObject({ lat: 35.66, lng: 139.71 })
    expect(points[2].folder).toBe('Templi')
  })

  it('usa il link di Google della descrizione e lo toglie dalle note', () => {
    const [a, , c] = parseKml(KML).points
    expect(a.links).toEqual(['https://www.google.com/maps/place/Ichiran/data=!3m1!1e3?cid=123456'])
    expect(a.url).toBe(a.links[0])
    expect(a.note).toBe('Ramen ottimo')
    expect(c.note).toBe('Aprire presto')
  })

  it('senza link costruisce una ricerca per nome centrata sulle coordinate di Google', () => {
    const [, b] = parseKml(KML).points
    expect(b.url).toBe('https://www.google.com/maps/search/Caf%C3%A9+%26+Co/@35.66,139.71,17z')
    expect(mapsUrlFor('Tokyo Tower', 35.6586, 139.7454)).toBe('https://www.google.com/maps/search/Tokyo+Tower/@35.6586,139.7454,17z')
  })

  it('riconosce solo i link di Google Maps', () => {
    expect(googleLinks('vedi https://example.com/x e https://maps.app.goo.gl/AbC123, ok')).toEqual(['https://maps.app.goo.gl/AbC123'])
    expect(plainText('a<br>b &amp; c')).toBe('a\nb & c')
  })
})

describe('abbinamento ai luoghi esistenti', () => {
  const place = (id, name, lat, lng, extra = {}) => ({ id, name, name_local: null, city: null, lat, lng, ...extra })
  const pts = (...l) => l.map(([name, lat, lng]) => ({ name, lat, lng }))

  it('normalizza i nomi', () => {
    expect(normName('The Tokyo-Tower!')).toBe('tokyo tower')
    expect(normName('Café  Ōmori')).toBe('cafe omori')
  })

  it('abbina per nome identico, simile o nome locale', () => {
    const places = [place('1', 'Senso-ji', 0, 0), place('2', 'Ichiran', 0, 0), place('3', 'Tempio', 0, 0, { name_local: '浅草寺' })]
    const { matched, fresh } = matchPlaces(pts(['senso ji', 1, 1], ['Ichiran Shibuya', 1, 1], ['浅草寺', 1, 1], ['Nuovo posto', 1, 1]), places)
    expect(matched.map((m) => [m.point.name, m.place.id])).toEqual([
      ['senso ji', '1'],
      ['浅草寺', '3'],
      ['Ichiran Shibuya', '2'],
    ])
    expect(fresh.map((p) => p.name)).toEqual(['Nuovo posto'])
  })

  it('un luogo esistente si usa una volta sola e il nome identico ha la precedenza', () => {
    const places = [place('1', 'Ichiran', 0, 0)]
    const { matched, fresh } = matchPlaces(pts(['Ichiran Ueno', 1, 1], ['Ichiran', 1, 1]), places)
    expect(matched.map((m) => [m.point.name, m.how])).toEqual([['Ichiran', 'nome']])
    expect(fresh.map((p) => p.name)).toEqual(['Ichiran Ueno'])
  })

  it('abbina per vicinanza solo se la prima parola del nome coincide', () => {
    const places = [place('1', 'Sushi Dai', 35.6, 139.7)]
    const near = matchPlaces(pts(['Sushi Daiwa', 35.6005, 139.7]), places)
    expect(near.matched).toHaveLength(1)
    const far = matchPlaces(pts(['Sushi Daiwa', 35.7, 139.7]), places)
    expect(far.fresh).toHaveLength(1)
    const other = matchPlaces(pts(['Museo', 35.6005, 139.7]), places)
    expect(other.fresh).toHaveLength(1)
  })

  it('dà ai luoghi nuovi la città del vicino più prossimo', () => {
    const places = [place('1', 'A', 35.0, 139.0, { city: 'Tokyo' }), place('2', 'B', 34.7, 135.5, { city: 'Osaka' })]
    expect(nearestCity({ lat: 35.01, lng: 139.01 }, places)).toBe('Tokyo')
    expect(nearestCity({ lat: 34.69, lng: 135.51 }, places)).toBe('Osaka')
    expect(nearestCity({ lat: 43, lng: 141 }, places)).toBeNull()
  })
})
