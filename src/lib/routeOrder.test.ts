import { describe, expect, it } from 'vitest'
import { optimizeOrder, pathLength, planRoute, type RouteItem } from './routeOrder'

// punti lungo una linea (longitudine crescente): il percorso più corto da 0 è in ordine
const at = (id: string, k: number) => ({ id, lat: 35, lng: 139 + k * 0.01 })

describe('optimizeOrder', () => {
  it('mette in fila i punti lungo una linea', () => {
    const pts = [at('c', 3), at('a', 1), at('d', 4), at('b', 2)]
    expect(optimizeOrder({ lat: 35, lng: 139 }, pts).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd'])
  })
  it('senza partenza prova ogni punto come inizio', () => {
    const pts = [at('b', 2), at('a', 1), at('c', 3)]
    const ids = optimizeOrder(null, pts).map((p) => p.id).join()
    expect(['a,b,c', 'c,b,a']).toContain(ids)
    expect(pathLength(null, optimizeOrder(null, pts))).toBeLessThanOrEqual(pathLength(null, pts))
  })
  it('non peggiora un ordine già buono', () => {
    const pts = [at('a', 1), at('b', 2), at('c', 3)]
    expect(optimizeOrder({ lat: 35, lng: 139 }, pts).map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })
  it('un solo punto', () => expect(optimizeOrder(null, [at('a', 1)]).map((p) => p.id)).toEqual(['a']))
})

describe('planRoute', () => {
  const items: RouteItem[] = [
    { position: 1000, time: '09:00', ...at('t1', 0) },
    { position: 2000, ...at('x', 5) },
    { position: 3000, time: '12:00', ...at('t2', 2) },
    { position: 4000, ...at('y', 3) },
    { id: 'note', position: 5000 },
    { position: 6000, ...at('z', 4) },
  ]
  it('le tappe con orario restano in testa, le altre seguono dal percorso più breve', () => {
    const plan = planRoute(items, null)
    expect(plan?.order).toEqual(['t1', 't2', 'y', 'z', 'x', 'note'])
    expect(plan!.afterM).toBeLessThan(plan!.beforeM)
  })
  it('le tappe senza posizione vanno in coda, senza perdere nulla', () => {
    const plan = planRoute(items, null)!
    expect([...plan.order].sort()).toEqual(items.map((i) => i.id).sort())
    expect(plan.order[plan.order.length - 1]).toBe('note')
  })
  it('parte dall\'ultima tappa con orario', () => {
    const plan = planRoute(items, { lat: 35, lng: 139 + 0.5 })!
    expect(plan.order.slice(2, 3)).toEqual(['y'])
  })
  it('senza tappe con orario parte dall\'alloggio', () => {
    const free = [{ position: 1, ...at('a', 9) }, { position: 2, ...at('b', 1) }, { position: 3, ...at('c', 5) }]
    expect(planRoute(free, at('home', 0))?.order).toEqual(['b', 'c', 'a'])
  })
  it('meno di due tappe libere con posizione: nessun piano', () => {
    expect(planRoute([{ ...at('a', 1) }, { id: 'n' }], null)).toBeNull()
    expect(planRoute(items.filter((i) => i.time), null)).toBeNull()
  })
  it('già ottimale: nessuna posizione da scrivere', () => {
    const ok = [{ position: 1000, ...at('a', 1) }, { position: 2000, ...at('b', 2) }]
    expect(planRoute(ok, at('home', 0))?.changed).toEqual([])
  })
})
