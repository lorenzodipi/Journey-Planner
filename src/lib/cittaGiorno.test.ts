import { describe, expect, it } from 'vitest'
import { cittaDaAlloggi } from './cittaGiorno'

const stays = [
  { city: 'Flúðir', checkIn: '2026-11-09', checkOut: '2026-11-10' },
  { city: 'Vík', checkIn: '2026-11-10', checkOut: '2026-11-12' },
  { city: 'Reykjavík', checkIn: '2026-11-14', checkOut: '2026-11-16' },
]
describe('città del giorno dagli alloggi', () => {
  it('dove si dorme quella notte', () => {
    expect(cittaDaAlloggi(stays, '2026-11-09')).toBe('Flúðir')
    expect(cittaDaAlloggi(stays, '2026-11-10')).toBe('Vík')
    expect(cittaDaAlloggi(stays, '2026-11-11')).toBe('Vík')
  })
  it('il giorno di partenza finale usa l’ultimo alloggio; i giorni scoperti restano vuoti', () => {
    expect(cittaDaAlloggi(stays, '2026-11-16')).toBe('Reykjavík')
    expect(cittaDaAlloggi(stays, '2026-11-13')).toBe('')
    expect(cittaDaAlloggi(undefined, '2026-11-13')).toBe('')
  })
})
