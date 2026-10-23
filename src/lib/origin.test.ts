import { describe, expect, it } from 'vitest'
import { defaultDepartureTz, originOf } from './origin'
import { destinationClock, formatDiffHours } from './today'

describe('origine del viaggio', () => {
  it('senza origine non c\'è nulla', () => {
    expect(originOf({})).toBeNull()
    expect(defaultDepartureTz({})).toBe('')
  })
  it('dal paese si ricavano nome e fuso principale', () => {
    expect(originOf({ originCountry: 'IT' })).toEqual({ name: 'Italia', timezone: 'Europe/Rome' })
    expect(defaultDepartureTz({ originCountry: 'IT' })).toBe('Europe/Rome')
  })
  it('vale il fuso scelto, se valido', () => {
    expect(originOf({ originCountry: 'US', originTimezone: 'America/Los_Angeles' })?.timezone).toBe('America/Los_Angeles')
    expect(originOf({ originCountry: 'US', originTimezone: 'Marte/Olympus' })?.timezone).toBe('America/New_York')
  })
  it('un codice sconosciuto vale come nessuna origine', () => expect(originOf({ originCountry: 'ZZ' })).toBeNull())
})

describe('ora di casa e differenza', () => {
  it('Tokyo da Roma: +8 h in inverno, +7 h con l\'ora legale', () => {
    expect(destinationClock('Asia/Tokyo', 'Europe/Rome', new Date('2026-11-25T12:00:00Z')).diffHours).toBe(8)
    expect(destinationClock('Asia/Tokyo', 'Europe/Rome', new Date('2026-07-15T12:00:00Z')).diffHours).toBe(7)
  })
  it('da New York a Tokyo: 14 h in inverno, 13 h in estate', () => {
    expect(destinationClock('Asia/Tokyo', 'America/New_York', new Date('2026-12-01T12:00:00Z')).diffHours).toBe(14)
    expect(destinationClock('Asia/Tokyo', 'America/New_York', new Date('2026-07-01T12:00:00Z')).diffHours).toBe(13)
  })
  it('stesso fuso: zero', () => expect(destinationClock('Europe/Rome', 'Europe/Paris', new Date('2026-07-01T12:00:00Z')).diffHours).toBe(0))
  it('a casa la differenza è col segno opposto', () => {
    const d = destinationClock('Asia/Tokyo', 'Europe/Rome', new Date('2026-11-25T12:00:00Z')).diffHours
    expect(formatDiffHours(d)).toBe('+8 h')
    expect(formatDiffHours(-d)).toBe('−8 h')
  })
})
