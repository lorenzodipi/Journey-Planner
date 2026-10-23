import { describe, expect, it } from 'vitest'
import { placeDayLine } from './placeDays'

const day = (date: string, ...placeIds: (string | undefined)[]) => ({ date, items: placeIds.map((placeId, i) => ({ id: `${date}-${i}`, title: 't', kind: 'visit' as const, placeId })) })

describe('placeDayLine', () => {
  const days = [day('2026-11-21'), day('2026-11-22', 'a'), day('2026-11-23', 'b', 'a'), day('2026-11-24', 'a')]
  it('nessun giorno: nessuna riga', () => expect(placeDayLine('zzz', days)).toBeNull())
  it('un solo giorno', () => expect(placeDayLine('b', days)).toMatch(/^Giorno 3 · .*23/))
  it('più giorni: il primo e «+N»', () => {
    const line = placeDayLine('a', days)
    expect(line).toMatch(/^Giorno 2 · .*22.* \+2$/)
  })
  it('lo stesso luogo due volte nello stesso giorno conta un giorno', () => {
    expect(placeDayLine('a', [day('2026-11-22', 'a', 'a')])).toMatch(/^Giorno 1 · [^+]*22[^+]*$/)
  })
})
