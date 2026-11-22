import { describe, expect, it } from 'vitest'
import { allerteMeteo, allerteTerremoti, distanzaKm, leggiTerremoti, oreDelGiorno, ordinaAllerte, type Terremoto } from './allerte'
import type { OraPrevista } from './oggi'

const ora = (h: number, x: Partial<OraPrevista> = {}, date = '2026-11-24'): OraPrevista => ({ date, h, t: 15, code: 2, rain: 0, ...x })
const giornata = (fn: (h: number) => Partial<OraPrevista>) => Array.from({ length: 12 }, (_, i) => ora(10 + i, fn(10 + i)))

describe('allerte meteo', () => {
  it('niente allerte con il bel tempo', () => {
    expect(allerteMeteo(giornata(() => ({})), '2026-11-24', 'Tokyo')).toEqual([])
  })

  it('la pioggia di sempre resta un «da sapere», quella forte è un\'attenzione, quella molto forte un pericolo', () => {
    expect(allerteMeteo(giornata((h) => (h === 13 ? { rain: 80, mm: 1 } : {})), '2026-11-24', 'Tokyo').map((a) => [a.tipo, a.livello])).toEqual([['pioggia', 'info']])
    expect(allerteMeteo(giornata((h) => (h >= 13 && h <= 14 ? { mm: 10 } : {})), '2026-11-24', 'Tokyo')[0]).toMatchObject({ tipo: 'pioggia', livello: 'attenzione', titolo: 'Pioggia forte' })
    expect(allerteMeteo(giornata((h) => (h === 15 ? { mm: 25 } : {})), '2026-11-24', 'Tokyo')[0]).toMatchObject({ livello: 'pericolo', titolo: 'Pioggia molto forte' })
  })

  it('vento: valgono le raffiche se ci sono, altrimenti il vento medio', () => {
    expect(allerteMeteo(giornata((h) => ({ gust: h === 16 ? 95 : 20 })), '2026-11-24', 'Tokyo')[0]).toMatchObject({ tipo: 'vento', livello: 'pericolo' })
    expect(allerteMeteo(giornata((h) => ({ wind: h === 16 ? 45 : 10 })), '2026-11-24', 'Tokyo')[0]).toMatchObject({ tipo: 'vento', livello: 'attenzione' })
    // con le raffiche sotto soglia il vento medio non conta
    expect(allerteMeteo(giornata(() => ({ gust: 50, wind: 45 })), '2026-11-24', 'Tokyo')).toEqual([])
  })

  it('temporale, neve, caldo e freddo; dopo mezzanotte l\'ora dice «domani»', () => {
    const ore = [ora(22), ora(23, { code: 95 }), ora(0, { code: 95 }, '2026-11-25')]
    const [t] = allerteMeteo(ore, '2026-11-24', 'Tokyo')
    expect(t).toMatchObject({ tipo: 'temporale', livello: 'attenzione' })
    expect(t.testo).toContain('23:00')
    expect(t.testo).toContain('domani 01:00')
    expect(allerteMeteo([ora(9, { code: 73 })], '2026-11-24', 'Sapporo')[0]).toMatchObject({ tipo: 'neve' })
    expect(allerteMeteo([ora(14, { feels: 41 })], '2026-11-24', 'X')[0]).toMatchObject({ tipo: 'caldo', livello: 'pericolo' })
    expect(allerteMeteo([ora(6, { feels: -12 })], '2026-11-24', 'X')[0]).toMatchObject({ tipo: 'freddo', livello: 'attenzione' })
  })

  it('le ore di un giorno: oggi da adesso, poi tutto il giorno, nulla per il passato', () => {
    const days = [{ date: '2026-11-24', code: 2, max: 18, min: 9, rainPct: 0, hours: [{ h: 9, t: 10, code: 2, rain: 0 }, { h: 20, t: 12, code: 2, rain: 0 }] }]
    const ore = oreDelGiorno(days, '2026-11-24', '2026-11-24', new Date('2026-11-24T03:00:00Z'), 'Asia/Tokyo')
    expect(ore.map((o) => o.h)).toEqual([20])
    expect(oreDelGiorno(days, '2026-11-23', '2026-11-24', new Date(), 'Asia/Tokyo')).toEqual([])
  })
})

describe('terremoti', () => {
  const tokyo = { city: 'Tokyo', lat: 35.68, lng: 139.76 }
  const adesso = Date.parse('2026-11-24T03:00:00Z')
  const scossa = (x: Partial<Terremoto>): Terremoto => ({ id: 'us1', mag: 5.2, time: adesso - 2 * 3600_000, lat: 35.9, lng: 140.1, tsunami: false, ...x })

  it('legge il GeoJSON di USGS e scarta le righe malformate', () => {
    const json = { features: [
      { id: 'a', properties: { mag: 5, time: 1, tsunami: 1, url: 'https://earthquake.usgs.gov/x' }, geometry: { coordinates: [140, 35, 10] } },
      { id: 'b', properties: { mag: null, time: 1 }, geometry: { coordinates: [140, 35] } },
      { properties: {} },
    ] }
    expect(leggiTerremoti(json)).toEqual([{ id: 'a', mag: 5, time: 1, lng: 140, lat: 35, tsunami: true, url: 'https://earthquake.usgs.gov/x' }])
    expect(leggiTerremoti(null)).toEqual([])
  })

  it('distanza: Tokyo–Osaka circa 400 km', () => {
    expect(Math.round(distanzaKm(tokyo, { lat: 34.69, lng: 135.5 }) / 10) * 10).toBe(400)
  })

  it('vicino e forte = attenzione, lontano o vecchio = niente, piccolo = niente', () => {
    expect(allerteTerremoti([scossa({})], [tokyo], adesso, 'Asia/Tokyo')[0]).toMatchObject({ tipo: 'terremoto', livello: 'attenzione' })
    expect(allerteTerremoti([scossa({ mag: 4.8, lat: 37.5, lng: 141 })], [tokyo], adesso, 'Asia/Tokyo')[0]).toMatchObject({ livello: 'info' })
    expect(allerteTerremoti([scossa({ lat: 43, lng: 141 })], [tokyo], adesso, 'Asia/Tokyo')).toEqual([])
    expect(allerteTerremoti([scossa({ time: adesso - 30 * 3600_000 })], [tokyo], adesso, 'Asia/Tokyo')).toEqual([])
    expect(allerteTerremoti([scossa({ mag: 4.2 })], [tokyo], adesso, 'Asia/Tokyo')).toEqual([])
  })

  it('non dice mai che non c\'è pericolo di tsunami; con un evento in mare dice di controllare gli avvisi ufficiali', () => {
    const [a] = allerteTerremoti([scossa({})], [tokyo], adesso, 'Asia/Tokyo')
    expect(a.testo).not.toMatch(/tsunami/i)
    const [b] = allerteTerremoti([scossa({ mag: 4.6, lat: 37, lng: 142, tsunami: true })], [tokyo], adesso, 'Asia/Tokyo')
    expect(b.livello).toBe('attenzione')
    expect(b.testo).toContain('avvisi ufficiali di tsunami')
  })

  it('in ordine: prima il pericolo, poi l\'attenzione, poi il resto', () => {
    const tutte = ordinaAllerte([
      ...allerteMeteo([ora(13, { rain: 80, mm: 1 })], '2026-11-24', 'Tokyo'),
      ...allerteTerremoti([scossa({})], [tokyo], adesso, 'Asia/Tokyo'),
      ...allerteMeteo([ora(15, { gust: 100 })], '2026-11-24', 'Tokyo'),
    ])
    expect(tutte.map((a) => a.livello)).toEqual(['pericolo', 'attenzione', 'info'])
  })

  it('più terremoti: resta solo il più recente; tipi diversi restano tutti', () => {
    const tre = allerteTerremoti([scossa({ id: 'vecchio', time: adesso - 6 * 3600_000 }), scossa({ id: 'nuovo', time: adesso - 3600_000 }), scossa({ id: 'medio', time: adesso - 3 * 3600_000 })], [tokyo], adesso, 'Asia/Tokyo')
    expect(tre.map((a) => a.id)).toEqual(['terremoto:nuovo'])
    // il più recente lontano non conta: resta il più recente tra quelli vicini
    expect(allerteTerremoti([scossa({ id: 'lontano', time: adesso - 600_000, lat: -33, lng: 151 }), scossa({ id: 'vicino' })], [tokyo], adesso, 'Asia/Tokyo').map((a) => a.id)).toEqual(['terremoto:vicino'])
    const tutte = ordinaAllerte([...allerteMeteo([ora(13, { rain: 80, mm: 1 })], '2026-11-24', 'Tokyo'), ...tre, ...allerteTerremoti([scossa({ id: 'altro' })], [tokyo], adesso, 'Asia/Tokyo')])
    expect(tutte.map((a) => a.tipo).sort()).toEqual(['pioggia', 'terremoto'])
    expect(tutte.find((a) => a.tipo === 'terremoto')?.id).toBe('terremoto:nuovo')
  })
})
