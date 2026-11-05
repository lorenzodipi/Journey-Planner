import { describe, expect, it } from 'vitest'
import { statisticheDopo } from './oggi'
import type { Trip } from '../types'

const voce = (o: Partial<Trip['days'][number]['items'][number]>) => ({ id: Math.random().toString(), kind: 'visit', title: 'x', status: 'done', ...o }) as Trip['days'][number]['items'][number]
const giorno = (date: string, items: Trip['days'][number]['items'], city = 'Copenaghen') => ({ id: date, date, city, items }) as unknown as Trip['days'][number]
const viaggio = (days: Trip['days'][number][], places: Trip['places'] = []) => ({ days, places, startDate: days[0]?.date ?? '2026-06-04', endDate: days[days.length - 1]?.date ?? '2026-06-04', destination: 'Danimarca' })

describe('statisticheDopo', () => {
  it('mette prima il giorno più pieno e le ore in giro', () => {
    const s = statisticheDopo(viaggio([
      giorno('2026-06-04', [voce({ durationMinutes: 90 })]),
      giorno('2026-06-05', [voce({ durationMinutes: 90 }), voce({ kind: 'meal', durationMinutes: 60 }), voce({ status: 'skipped' }), voce({ durationMinutes: 150 })]),
    ]))
    expect(s[0]).toMatchObject({ id: 'pieno', v: 'Ven 5 giu', c: '3 tappe a Copenaghen' })
    expect(s[1]).toMatchObject({ id: 'ore', v: '6 h 30' })
    expect(s.map((x) => x.id)).toContain('pasti')
  })
  it('senza tappe non mostra zeri: restano durata e meta', () => {
    const s = statisticheDopo(viaggio([giorno('2026-06-04', []), giorno('2026-06-05', [])]))
    expect(s.map((x) => x.id)).toEqual(['durata', 'meta'])
    expect(s[0].v).toBe('2 giorni')
  })
  it('categoria più visitata solo con almeno due luoghi', () => {
    const places = [{ id: 'a', status: 'done', category: 'Museo' }, { id: 'b', status: 'done', category: 'Museo' }, { id: 'c', status: 'idea', category: 'Parco' }] as unknown as Trip['places']
    const s = statisticheDopo(viaggio([giorno('2026-06-04', [])], places))
    expect(s.find((x) => x.id === 'genere')).toMatchObject({ v: 'Museo', c: '2 luoghi su 2' })
  })
})
