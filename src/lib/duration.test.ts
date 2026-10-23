import { describe, expect, it } from 'vitest'
import { formatDuration, itemDuration, parseDuration, totalDuration } from './duration'

describe('formatDuration', () => {
  it('minuti, ore intere, ore e minuti', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(90)).toBe('1 h 30')
    expect(formatDuration(125)).toBe('2 h 5')
    expect(formatDuration(180)).toBe('3 h')
  })
})

describe('parseDuration', () => {
  it('capisce i modi in cui si scrive', () => {
    expect(parseDuration('90')).toBe(90)
    expect(parseDuration('45 min')).toBe(45)
    expect(parseDuration('1h')).toBe(60)
    expect(parseDuration('1 h 30')).toBe(90)
    expect(parseDuration('1h30')).toBe(90)
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('1,5 h')).toBe(90)
    expect(parseDuration('2 ore')).toBe(120)
    expect(parseDuration('1 ora e 30')).toBe(90)
  })
  it('vuoto = nessuna durata', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('   ')).toBeNull()
  })
  it('testo incomprensibile o fuori misura = NaN', () => {
    expect(parseDuration('abc')).toBeNaN()
    expect(parseDuration('0')).toBeNaN()
    expect(parseDuration('-5')).toBeNaN()
    expect(parseDuration('25 h')).toBeNaN()
  })
  it('formatDuration e parseDuration sono l\'uno l\'inverso dell\'altro', () => {
    for (const m of [15, 45, 60, 90, 125, 600]) expect(parseDuration(formatDuration(m))).toBe(m)
  })
})

describe('durata di una tappa', () => {
  const places = [{ id: 'p1', visitMinutes: 90 }, { id: 'p2' }]
  it('eredita dal luogo finché non è personalizzata', () => {
    expect(itemDuration({}, places[0])).toBe(90)
    expect(itemDuration({ durationMinutes: 30 }, places[0])).toBe(30)
    expect(itemDuration({}, places[1])).toBeUndefined()
    expect(itemDuration({}, undefined)).toBeUndefined()
  })
  it('il totale del giorno somma le durate effettive', () => {
    const items = [{ placeId: 'p1' }, { placeId: 'p1', durationMinutes: 30 }, { placeId: 'p2' }, {}]
    expect(totalDuration(items, places)).toBe(120)
    expect(totalDuration([{}], places)).toBe(0)
  })
})
