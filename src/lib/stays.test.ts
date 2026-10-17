import { describe, expect, it } from 'vitest'
import { nightsOf, overlappingStays, uncoveredNights } from './stays'

const stays = [
  { checkIn: '2026-11-22', checkOut: '2026-11-26' }, // Tokyo 4 notti
  { checkIn: '2026-11-26', checkOut: '2026-11-27' }, // Nikko 1
]

describe('stays', () => {
  it('conta le notti', () => {
    expect(nightsOf(stays[0])).toBe(4)
    expect(nightsOf({ checkIn: '2026-11-22', checkOut: '2026-11-22' })).toBe(0)
  })

  it('trova le notti scoperte', () => {
    // viaggio 21/11–28/11: notti 21..27, scoperta solo la prima (volo notturno)
    expect(uncoveredNights('2026-11-21', '2026-11-28', stays)).toEqual(['2026-11-21', '2026-11-27'])
  })

  it('nessuna notte scoperta se tutto è coperto', () => {
    expect(uncoveredNights('2026-11-22', '2026-11-27', stays)).toEqual([])
  })

  it('non segnala il giorno di partenza come notte', () => {
    expect(uncoveredNights('2026-11-22', '2026-11-22', [])).toEqual([])
  })

  it('check-out e check-in nello stesso giorno non sono sovrapposti', () => {
    expect(overlappingStays(stays)).toEqual([])
    expect(overlappingStays([stays[0], { checkIn: '2026-11-25', checkOut: '2026-11-28' }])).toEqual([[0, 1]])
  })
})
