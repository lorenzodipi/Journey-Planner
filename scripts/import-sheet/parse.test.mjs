import { describe, expect, it } from 'vitest'
import { createGeocoder, buildQueries } from './geocode.mjs'
import { nightsCities, parseBudget, parsePlaces, parseStays, parseTransports, ymd } from './parse.mjs'

describe('luoghi a blocchi', () => {
  // tre blocchi: il primo con colonna Città, gli altri senza
  const rows = [
    ['Location', 'Tipologia', 'Città', 'Indirizzo', 'Note', null, 'Location', 'Tipologia', 'Indirizzo', 'Note', null, 'Location', 'Tipologia', 'Indirizzo', 'Note'],
    ['Tempio A', 'Tempio', 'Cittauno', '1 Via, Cittauno', null, null, 'Locale B', 'Ristorante', '2-3 Sumida-ku', 'Ottimo', null, 'Parco C', 'Natura', 'Via 9, Cittatre'],
    ['Museo A', 'Attrazione', 'Cittauno', '2 Via, Cittauno', 'Chiude presto', null, 'Negozio B', 'Shopping', '4 Chuo-ku', null, null, null, null, null],
    [null, null, null, null, null, null, 'Altro B', 'Shopping', '5 Minato-ku', null, null, null, null, null],
  ]

  it('legge i blocchi e deduce la città per eliminazione', () => {
    const p = parsePlaces(rows, { candidates: ['Cittadue', 'Cittatre'] })
    expect(p).toHaveLength(6)
    expect(p.filter((x) => x.city === 'Cittauno')).toHaveLength(2)
    expect(p.filter((x) => x.city === 'Cittatre')).toHaveLength(1) // dal voto sugli indirizzi
    expect(p.filter((x) => x.city === 'Cittadue')).toHaveLength(3) // rimasta per eliminazione
    expect(p.find((x) => x.name === 'Museo A')).toMatchObject({ type: 'Attrazione', note: 'Chiude presto', block: 1 })
  })

  it('ambiguo: chiede la configurazione', () => {
    expect(() => parsePlaces(rows, { candidates: [] })).toThrow(/import-config\.json/)
  })

  it('la configurazione ha la precedenza', () => {
    const p = parsePlaces(rows, { blockCities: [null, 'X', 'Y'] })
    expect(p.filter((x) => x.city === 'X')).toHaveLength(3)
    expect(p.filter((x) => x.city === 'Y')).toHaveLength(1)
  })
})

describe('hotel, trasporti, spese', () => {
  it('hotel con date, costi e stati', () => {
    const rows = [
      ['Città', 'Notti', 'Data arrivo', 'Data partenza', 'Hotel', 'Costo Totale', 'Costo Persona', 'Costo Notte/p', 'Prenotato', 'Pagato', 'Note'],
      ['Tokyo', 4, new Date(Date.UTC(2026, 10, 22)), new Date(Date.UTC(2026, 10, 26)), 'Hotel Uno', 352.67, 176.335, 44, true, false, 'Mezza pensione'],
      [null, null, null, null, null, 1517.9, 758.95, 65, null, null, null],
    ]
    expect(parseStays(rows)).toEqual([
      { city: 'Tokyo', name: 'Hotel Uno', checkIn: '2026-11-22', checkOut: '2026-11-26', totalCost: 352.67, booked: true, paid: false, note: 'Mezza pensione' },
    ])
  })

  it('date a mezzanotte, in UTC o locale', () => {
    expect(ymd(new Date(Date.UTC(2026, 10, 22)))).toBe('2026-11-22')
    expect(ymd(new Date(2026, 10, 22))).toBe('2026-11-22')
    expect(ymd('2026-11-22 00:00:00')).toBe('2026-11-22')
    expect(ymd('boh')).toBeNull()
  })

  it('trasporti: tratte, pass e modalità; salta i totali', () => {
    const rows = [
      ['Tratta', 'Costo', 'Tipologia', 'Note', 'Comprato'],
      ['Tokyo - Nikko', 18, 'Treno', null, false],
      ['Osaka-Nara', 10, 'Treno', '5 andata, 5 ritorno', false],
      ['Osaka Pass', 25, 'Metro/Bus', null, true],
      [null, 196, null, null, null],
    ]
    expect(parseTransports(rows)).toEqual([
      { from: 'Tokyo', to: 'Nikko', mode: 'train', cost: 18, note: '', bought: false },
      { from: 'Osaka', to: 'Nara', mode: 'train', cost: 10, note: '5 andata, 5 ritorno', bought: false },
      { from: 'Osaka Pass', to: 'Osaka', mode: 'metro', cost: 25, note: '', bought: true },
    ])
  })

  it('spese previste: niente voci già calcolate, niente colonna Dettagli', () => {
    const rows = [
      ['Oggetto', 'Dettagli', 'Prezzo', 'Pagato'],
      ['Aereo', 'Booking volo', 623, true],
      ['Hotel', null, 758.95, true],
      ['Trasporti', null, 196, false],
      ['E-Sim', 'https://esempio.test', 30, false],
      ['Assicurazione Sanitaria', 'polizza SEGRETA123', 77.12, true],
      ['Cibo', null, 300, false],
      [null, 'TOT.', 2135.07, 676],
    ]
    const out = parseBudget(rows)
    expect(out.map((b) => b.label)).toEqual(['E-Sim', 'Assicurazione sanitaria', 'Cibo'])
    expect(out[1]).toMatchObject({ amount: 77.12, paid: true, category: 'Assicurazione' })
    expect(JSON.stringify(out)).not.toMatch(/SEGRETA|esempio/)
  })

  it('città di ogni notte, check-out escluso', () => {
    const n = nightsCities([{ city: 'A', checkIn: '2026-11-29', checkOut: '2026-12-02' }, { city: 'B', checkIn: '2026-12-02', checkOut: '2026-12-03' }])
    expect(n).toEqual([
      { date: '2026-11-29', city: 'A' },
      { date: '2026-11-30', city: 'A' },
      { date: '2026-12-01', city: 'A' },
      { date: '2026-12-02', city: 'B' },
    ])
  })
})

describe('geocoding', () => {
  const place = { name: 'Senso-ji', city: 'Tokyo', address: '2-3-1 Asakusa, Taito' }

  it('ricerche dalla più precisa alla più generica', () => {
    expect(buildQueries(place)).toEqual(['2-3-1 Asakusa, Taito, Japan', 'Senso-ji, Tokyo, Japan', 'Senso-ji, 2-3-1 Asakusa, Taito'])
  })

  it('prova le ricerche in ordine, usa la cache e rispetta 1 richiesta al secondo', async () => {
    const calls = []
    const sleeps = []
    let t = 0
    const fetchFn = async (url) => {
      calls.push(new URL(url).searchParams.get('q'))
      const q = calls[calls.length - 1]
      const hit = q.startsWith('Senso-ji, Tokyo')
      return { ok: true, status: 200, json: async () => (hit ? [{ lat: '35.7147651', lon: '139.7966553', display_name: 'x', namedetails: { name: '浅草寺' } }] : []) }
    }
    const g = createGeocoder({ fetchFn, userAgent: 'test', sleep: async (ms) => { sleeps.push(ms); t += ms }, now: () => t })
    const r = await g.locate(place)
    expect(r).toMatchObject({ lat: 35.714765, lng: 139.796655, nameLocal: '浅草寺', query: 'Senso-ji, Tokyo, Japan' })
    expect(calls).toHaveLength(2)
    expect(sleeps.length).toBeGreaterThanOrEqual(1) // la seconda richiesta ha aspettato
    await g.locate(place)
    expect(calls).toHaveLength(2) // tutto dalla cache
  })

  it('segnala il limite di richieste', async () => {
    const g = createGeocoder({ fetchFn: async () => ({ ok: false, status: 429 }), userAgent: 't', sleep: async () => {} })
    await expect(g.locate(place)).rejects.toThrow(/429/)
  })
})
