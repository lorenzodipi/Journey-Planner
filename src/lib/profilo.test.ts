import { describe, expect, it } from 'vitest'
import * as p from './profilo'

const trip = (o: object) => ({ destination: '', places: [], days: [], ...o }) as never
describe('profilo', () => {
  it('paesi distinti, con ripiego sulla destinazione', () => {
    expect(p.paesiVisitati([trip({ countries: [{ country: 'jp' }, { country: 'KR' }] }), trip({ countries: [{ country: 'JP' }] }), trip({ destination: 'Islanda' }), trip({ destination: 'islanda ' })])).toHaveLength(3)
  })
  it('numeri: luoghi fatti e cibo', () => {
    const t = trip({ places: [{ status: 'done', category: 'Ristorante' }, { status: 'idea', category: 'Ristorante' }, { status: 'done', category: 'Tempio' }], days: [{ items: [{ kind: 'meal', status: 'done' }, { kind: 'meal', status: 'todo' }] }] })
    expect(p.numeriProfilo([t])).toEqual({ viaggi: 1, luoghi: 2, paesi: 0, cibo: 2 })
  })
  it('distintivi con quanto manca', () => {
    const [e, c, b] = p.distintivi({ viaggi: 1, luoghi: 50, paesi: 1, cibo: 19 })
    expect(e.preso).toBe(false)
    expect(e.mancano).toBe('Ti mancano 2 paesi')
    expect(c.preso).toBe(true)
    expect(b.mancano).toBe('Ti manca 1 tappa')
  })
  it('sottotitolo', () => {
    expect(p.sottotitoloProfilo('2024-03-01T00:00:00Z', [{ originCountry: 'IT', startDate: '2026-01-01' }] as never)).toBe('Viaggiatore dal 2024 · Italia')
    expect(p.sottotitoloProfilo(undefined, [])).toBe('Viaggiatore')
  })
})
