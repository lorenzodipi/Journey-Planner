import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { googleLinks, kmlFromBytes, mapsUrlFor, parseKml, plainText } from './kmz'

/** Zip minimo (un solo file, compresso) per provare la lettura del .kmz. */
function zip(name: string, text: string, method = 8): Uint8Array {
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
  return new Uint8Array(Buffer.concat([local, nm, data, central, nm, eocd]))
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
  it('apre lo zip (compresso o no) e legge il kml', async () => {
    expect(await kmlFromBytes(zip('doc.kml', KML))).toBe(KML)
    expect(await kmlFromBytes(zip('doc.kml', KML, 0))).toBe(KML)
    expect(await kmlFromBytes(new Uint8Array(Buffer.from(KML)))).toBe(KML) // anche un .kml semplice
  })

  it('rifiuta uno zip senza kml', async () => {
    await expect(kmlFromBytes(zip('foto.jpg', 'x'))).rejects.toThrow(/kml/i)
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

describe('mappa creata da un foglio (senza coordinate)', () => {
  const SHEET_KML = `<kml><Document><Folder><name>Nara</name>
    <Placemark><name>Tempio Todai-ji</name><address>Tempio Todai-ji 406 Zoshicho, Nara</address>
      <description><![CDATA[Tipologia: Tempio<br>Città: Nara<br>Indirizzo: 406 Zoshicho, Nara<br>Note: Aprire presto]]></description>
      <ExtendedData><Data name="Tipologia"><value>Tempio</value></Data><Data name="Città"><value>Nara</value></Data>
        <Data name="Indirizzo"><value>406 Zoshicho, Nara</value></Data><Data name="Note"><value>Aprire presto</value></Data></ExtendedData></Placemark>
    <Placemark><name>Vuoto</name><address>Vuoto</address><ExtendedData><Data name="Note"><value/></Data></ExtendedData></Placemark>
  </Folder></Document></kml>`

  it('legge tipologia, città e note dai campi e usa l\'indirizzo per il link', () => {
    const { points } = parseKml(SHEET_KML)
    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ name: 'Tempio Todai-ji', type: 'Tempio', city: 'Nara', lat: null, lng: null, note: 'Aprire presto', folder: 'Nara' })
    expect(points[0].url).toBe('https://www.google.com/maps/search/?api=1&query=Tempio%20Todai-ji%20406%20Zoshicho%2C%20Nara')
    expect(points[1]).toMatchObject({ note: '', type: '' })
  })

  it('raddrizza le righe con le colonne sfalsate', () => {
    const row = (name: string, type: string, city: string, addr: string, note: string) =>
      `<Placemark><name>${name}</name><ExtendedData><Data name="Tipologia"><value>${type}</value></Data><Data name="Città"><value>${city}</value></Data><Data name="Indirizzo"><value>${addr}</value></Data><Data name="Note"><value>${note}</value></Data></ExtendedData></Placemark>`
    const kml = `<kml><Document>${['A', 'B', 'C'].map((n) => row(n, 'Ristorante', 'Osaka', '1 Via', '')).join('')}${row('Storto', ' Tennoji', 'Ristorante', 'Osaka', '2-3-19 Ebisu, Osaka')}</Document></kml>`
    const storto = parseKml(kml).points[3]
    expect(storto).toMatchObject({ type: 'Ristorante', city: 'Osaka', note: '' })
    expect(storto.address).toBe('Storto 2-3-19 Ebisu, Osaka')
    expect(storto.url).toContain('query=Storto%202-3-19%20Ebisu%2C%20Osaka')
  })
})
