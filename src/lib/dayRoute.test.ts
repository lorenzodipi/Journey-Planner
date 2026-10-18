import { describe, expect, it, vi } from 'vitest'
import type { Day, Place, Transport } from '../types'
import {
  dayStops,
  dayTransportLines,
  distanceM,
  describeLeg,
  fetchWalkRoute,
  formatDistance,
  formatMinutes,
  legKey,
  localRouteStore,
  parseOsrm,
  planLegs,
  resolveWalkLegs,
  transportBetween,
  walkLegs,
  WALK_MAX_M,
} from './dayRoute'

const place = (id: string, lat: number | null, lng: number | null, name = id): Place => ({
  id, name, city: 'Tokyo', category: '', status: 'planned', lat, lng,
})
const day: Day = {
  id: 'd1', date: '2026-11-23', city: 'Tokyo',
  items: [
    { id: 'i1', title: 'Senso-ji', kind: 'visit', placeId: 'a' },
    { id: 'i2', title: 'Pranzo', kind: 'meal' }, // senza luogo: manca
    { id: 'i3', title: 'Nakamise', kind: 'visit', placeId: 'b' },
    { id: 'i4', title: 'Nota', kind: 'note' },
    { id: 'i5', title: 'Skytree', kind: 'visit', placeId: 'c' },
    { id: 'i6', title: 'Luogo senza posizione', kind: 'visit', placeId: 'z' },
  ],
}
const places = [place('a', 35.7148, 139.7967), place('b', 35.7117, 139.7963), place('c', 35.7101, 139.8107), place('z', null, null)]

describe('distanza', () => {
  it('Tokyo–Kyoto è circa 370 km in linea d\'aria', () => {
    const km = distanceM({ lat: 35.6812, lng: 139.7671 }, { lat: 34.9858, lng: 135.7588 }) / 1000
    expect(km).toBeGreaterThan(360)
    expect(km).toBeLessThan(375)
  })
  it('stesso punto = 0', () => expect(distanceM({ lat: 1, lng: 2 }, { lat: 1, lng: 2 })).toBe(0))
})

describe('tappe del giorno', () => {
  it('il numero è la posizione nel programma; sulla mappa solo le tappe con posizione', () => {
    const { stops, missing } = dayStops(day, places)
    expect(stops.map((s) => [s.n, s.name])).toEqual([[1, 'Senso-ji'], [3, 'Nakamise'], [5, 'Skytree']])
    expect(missing).toBe(2) // pranzo senza luogo + luogo senza posizione; la nota non conta
  })
  it('nessuna tappa', () => {
    expect(dayStops({ ...day, items: [] }, places)).toEqual({ stops: [], missing: 0 })
  })
})

describe('tratti', () => {
  it('a piedi sempre, linea tratteggiata solo se è troppo lontano', () => {
    const { stops } = dayStops(day, places)
    const legs = planLegs(stops)
    expect(legs).toHaveLength(2)
    expect(legs[0].kind).toBe('walk') // Senso-ji → Nakamise, ~350 m
    expect(legs[0].straightM).toBeLessThan(WALK_MAX_M)
    expect(legs[1].kind).toBe('walk') // Nakamise → Skytree, ~1,3 km
    const far = planLegs([
      { id: 'x', n: 1, name: 'x', lat: 35.68, lng: 139.76 },
      { id: 'y', n: 2, name: 'y', lat: 35.0, lng: 135.76 },
    ])
    expect(far[0].kind).toBe('line')
  })
  it('un trasporto del giorno che copre il tratto: linea d\'aria solo per il mezzo, a piedi da/verso le stazioni', () => {
    const a = { id: 'x', n: 1, name: 'x', lat: 35.6959, lng: 139.7929 } // vicino a Ryōgoku
    const b = { id: 'y', n: 2, name: 'y', lat: 35.3191, lng: 139.5504 } // vicino a Kamakura
    const train = dayTransportLines(day, [
      { id: 't1', from: 'Ryōgoku', to: 'Kamakura', mode: 'train', currency: 'JPY', scope: 'per_person', bought: false, dayId: 'd1',
        fromLat: 35.6965, fromLng: 139.7926, toLat: 35.3195, toLng: 139.5506 },
    ])
    const legs = planLegs([a, b], train)
    expect(legs[0].kind).toBe('line')
    expect(legs[0].via?.id).toBe('t1')
    const walks = walkLegs(legs)
    expect(walks).toHaveLength(2) // tappa → stazione, stazione → tappa
    expect(walks.every((w) => w.kind === 'walk')).toBe(true)
    expect(describeLeg(legs[0], undefined)).toBe('in viaggio: Ryōgoku → Kamakura')
  })
  it('un trasporto lontano dalle tappe non le copre', () => {
    const t = dayTransportLines(day, [
      { id: 't1', from: 'A', to: 'B', mode: 'train', currency: 'JPY', scope: 'per_person', bought: false, dayId: 'd1', fromLat: 40, fromLng: 140, toLat: 41, toLng: 141 },
    ])
    expect(transportBetween({ lat: 35.7, lng: 139.8 }, { lat: 35.3, lng: 139.5 }, t)).toBeUndefined()
  })
  it('una sola tappa non ha tratti', () => expect(planLegs([{ id: 'x', n: 1, name: 'x', lat: 1, lng: 1 }])).toEqual([]))
  it('chiave stabile e arrotondata', () => {
    expect(legKey({ lat: 35.714800004, lng: 139.7967 }, { lat: 1, lng: 2 })).toBe('35.71480,139.79670;1.00000,2.00000')
  })
})

describe('trasporti del giorno', () => {
  const t = (over: Partial<Transport>): Transport => ({
    id: 't', from: 'Tokyo', to: 'Kyoto', mode: 'train', currency: 'JPY', scope: 'per_person', bought: false, dayId: 'd1', ...over,
  })
  it('solo quelli del giorno con partenza e arrivo posizionati', () => {
    const lines = dayTransportLines(day, [
      t({ id: '1', fromLat: 35.68, fromLng: 139.76, toLat: 34.98, toLng: 135.75 }),
      t({ id: '2' }), // senza posizione
      t({ id: '3', dayId: 'altro', fromLat: 1, fromLng: 1, toLat: 2, toLng: 2 }),
      t({ id: '4', fromLat: 1, fromLng: 1 }), // arrivo mancante
    ])
    expect(lines.map((l) => l.id)).toEqual(['1'])
    expect(lines[0]).toMatchObject({ fromName: 'Tokyo', toName: 'Kyoto', mode: 'train' })
  })
})

describe('risposta OSRM', () => {
  const ok = { routes: [{ distance: 812.4, duration: 590, geometry: { type: 'LineString', coordinates: [[139.7967, 35.7148], [139.797, 35.713], [139.7963, 35.7117]] } }] }
  it('legge geometria, distanza e durata', () => {
    expect(parseOsrm(ok)).toEqual({ coords: ok.routes[0].geometry.coordinates, meters: 812.4, seconds: 590 })
  })
  it('rifiuta risposte vuote o rotte', () => {
    expect(parseOsrm({ code: 'NoRoute', routes: [] })).toBeNull()
    expect(parseOsrm(null)).toBeNull()
    expect(parseOsrm({ routes: [{ geometry: { coordinates: [[1, 2]] } }] })).toBeNull()
  })
})

const A = { lat: 35.7148, lng: 139.7967 }
const B = { lat: 35.7117, lng: 139.7963 }
const jsonRes = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response
const route = { routes: [{ distance: 500, duration: 360, geometry: { coordinates: [[1, 2], [3, 4]] } }] }

describe('fetchWalkRoute', () => {
  it('prova il secondo indirizzo se il primo risponde con un errore', async () => {
    const f = vi.fn().mockResolvedValueOnce(jsonRes({}, 400)).mockResolvedValueOnce(jsonRes(route))
    const r = await fetchWalkRoute(A, B, f as unknown as typeof fetch)
    expect(r?.meters).toBe(500)
    expect(f).toHaveBeenCalledTimes(2)
    expect(String(f.mock.calls[0][0])).toContain('139.7967,35.7148;139.7963,35.7117')
  })
  it('senza rete restituisce null, senza lanciare', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await fetchWalkRoute(A, B, f as unknown as typeof fetch)).toBeNull()
  })
})

describe('cache dei percorsi', () => {
  const mem = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
  }
  const r = { coords: [[1, 2], [3, 4]] as [number, number][], meters: 1, seconds: 2 }
  it('si rilegge dopo il riavvio', () => {
    const storage = mem()
    localRouteStore(storage).set('k', r)
    expect(localRouteStore(storage).get('k')).toEqual(r)
  })
  it('scarta i più vecchi oltre il massimo', () => {
    const s = localRouteStore(mem(), 2)
    s.set('1', r); s.set('2', r); s.set('3', r)
    expect([s.get('1'), s.get('2') && 2, s.get('3') && 3]).toEqual([undefined, 2, 3])
  })
  it('regge una cache rovinata e un archivio che lancia', () => {
    const bad = { getItem: () => '{non json', setItem: () => { throw new Error('quota') } }
    const s = localRouteStore(bad)
    expect(s.get('x')).toBeUndefined()
    expect(() => s.set('x', r)).not.toThrow()
    expect(s.get('x')).toEqual(r)
  })
})

describe('resolveWalkLegs', () => {
  const { stops } = dayStops(day, places)
  const legs = planLegs(stops)
  it('usa la cache e non chiama la rete per i tratti già noti', async () => {
    const store = localRouteStore({ getItem: () => null, setItem: () => {} })
    const known = { coords: [[1, 2], [3, 4]] as [number, number][], meters: 10, seconds: 20 }
    store.set(legs[0].key, known)
    store.set(legs[1].key, known)
    const f = vi.fn()
    const got: Record<string, unknown> = {}
    await resolveWalkLegs(legs, { store, fetchFn: f as unknown as typeof fetch, onRoute: (k, v) => (got[k] = v), gapMs: 0 })
    expect(f).not.toHaveBeenCalled()
    expect(Object.keys(got)).toHaveLength(2)
  })
  it('scarica i mancanti, li salva, e segnala null se falliscono', async () => {
    const store = localRouteStore({ getItem: () => null, setItem: () => {} })
    const f = vi
      .fn()
      .mockResolvedValueOnce(jsonRes(route)) // tratto 1, primo indirizzo
      .mockResolvedValue(jsonRes({}, 500)) // tratto 2 fallisce su entrambi
    const got: Record<string, unknown> = {}
    await resolveWalkLegs(legs, { store, fetchFn: f as unknown as typeof fetch, onRoute: (k, v) => (got[k] = v), gapMs: 0 })
    expect(got[legs[0].key]).toMatchObject({ meters: 500 })
    expect(got[legs[1].key]).toBeNull()
    expect(store.get(legs[0].key)).toBeDefined()
    expect(store.get(legs[1].key)).toBeUndefined()
  })
  it('si ferma se viene annullato', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const f = vi.fn()
    await resolveWalkLegs(legs, { store: localRouteStore({ getItem: () => null, setItem: () => {} }), fetchFn: f as unknown as typeof fetch, signal: ctrl.signal, onRoute: () => {}, gapMs: 0 })
    expect(f).not.toHaveBeenCalled()
  })
  it('non calcola a piedi i tratti lunghi', async () => {
    const far = planLegs([{ id: 'x', n: 1, name: 'x', lat: 35.68, lng: 139.76 }, { id: 'y', n: 2, name: 'y', lat: 35, lng: 135.76 }])
    const f = vi.fn()
    await resolveWalkLegs(far, { store: localRouteStore({ getItem: () => null, setItem: () => {} }), fetchFn: f as unknown as typeof fetch, onRoute: () => {}, gapMs: 0 })
    expect(f).not.toHaveBeenCalled()
  })
})

describe('formati', () => {
  it('distanza', () => {
    expect(formatDistance(350)).toBe('350 m')
    expect(formatDistance(4)).toBe('10 m')
    expect(formatDistance(1340)).toBe('1,3 km')
    expect(formatDistance(12000)).toBe('12 km')
  })
  it('minuti', () => {
    expect(formatMinutes(590)).toBe('10 min')
    expect(formatMinutes(5)).toBe('1 min')
  })
})

describe('describeLeg', () => {
  const walk = { kind: 'walk' as const, straightM: 350 }
  it('a piedi con percorso', () => expect(describeLeg(walk, { coords: [], meters: 810, seconds: 590 })).toBe('10 min a piedi · 810 m'))
  it('in calcolo e non disponibile', () => {
    expect(describeLeg(walk, undefined)).toBe('Calcolo il percorso…')
    expect(describeLeg(walk, null)).toBe("350 m in linea d'aria a piedi (percorso non disponibile)")
  })
  it('tratto lungo', () => expect(describeLeg({ kind: 'line', straightM: 6200 }, undefined)).toBe("6,2 km in linea d'aria: serve un mezzo"))
})
