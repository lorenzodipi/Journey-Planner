import { describe, expect, it } from 'vitest'
import { ordinaViaggi, rigaFinale, scenaDelViaggio, statoViaggio } from './viaggi'

const v = (id: string, startDate: string, endDate: string) => ({ id, startDate, endDate, timezone: 'Europe/Rome' })
const now = new Date('2026-11-10T12:00:00Z')

describe('viaggi', () => {
  it('stato dal giorno di oggi', () => {
    expect(statoViaggio(v('a', '2026-11-21', '2026-12-09'), now)).toBe('prossimo')
    expect(statoViaggio(v('a', '2026-11-01', '2026-11-12'), now)).toBe('incorso')
    expect(statoViaggio(v('a', '2026-10-01', '2026-10-09'), now)).toBe('concluso')
  })
  it('ordine: in corso, prossimi dal più vicino, conclusi dal più recente', () => {
    const l = [v('c1', '2026-01-01', '2026-01-09'), v('p2', '2027-03-01', '2027-03-09'), v('c2', '2026-06-01', '2026-06-09'), v('x', '2026-11-05', '2026-11-15'), v('p1', '2026-12-01', '2026-12-09')]
    expect(ordinaViaggi(l, now).map((t) => t.id)).toEqual(['x', 'p1', 'p2', 'c2', 'c1'])
  })
  it('scena dal paese', () => {
    expect(scenaDelViaggio({ destination: 'Tokyo', title: 'Giappone', countries: [{ country: 'jp' }] } as never)).toBe('tempio')
    expect(scenaDelViaggio({ destination: 'Maldive', title: 'Mare' } as never)).toBe('mare')
    expect(scenaDelViaggio({ destination: 'Boh', title: 'X' } as never)).toBe('panorama')
  })
  it('riga finale per stato', () => {
    const base = { timezone: 'Europe/Rome', days: [{ date: '2026-11-10', city: 'Kyoto' }], destination: 'Giappone', baseCurrency: 'EUR' } as never
    expect(rigaFinale({ ...(base as object), startDate: '2026-12-03', endDate: '2026-12-09', budgetLimit: 5000 } as never, 0, now)).toMatch(/^Tra 23 giorni · Budget 5\.?000,00/)
    expect(rigaFinale({ ...(base as object), startDate: '2026-11-08', endDate: '2026-11-12' } as never, 0, now)).toBe('In corso · oggi a Kyoto')
    expect(rigaFinale({ ...(base as object), startDate: '2026-10-01', endDate: '2026-10-09' } as never, 1240, now)).toMatch(/^Spesi 1\.?240,00/)
  })
})
