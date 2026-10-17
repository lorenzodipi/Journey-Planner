import { describe, expect, it } from 'vitest'
import { dayOffset, formatDuration, formatInZone, layover, legDuration, totalTravelTime } from './flights'

// Esempio FITTIZIO: Roma -> Dubai -> Bangkok, con scalo.
const leg1 = { depart: '2026-03-01T10:00:00+01:00', arrive: '2026-03-01T18:30:00+04:00' } // 5h30
const leg2 = { depart: '2026-03-01T21:05:00+04:00', arrive: '2026-03-02T07:40:00+07:00' }

describe('voli', () => {
  it('durata di una tratta tra fusi diversi', () => {
    expect(legDuration(leg1)).toBe(5 * 60 + 30)
  })

  it('durata dello scalo', () => {
    expect(layover(leg1, leg2)).toBe(2 * 60 + 35)
  })

  it('tempo totale di viaggio', () => {
    // 10:00+01 = 09:00Z ; 07:40+07 = 00:40Z del giorno dopo -> 15h40
    expect(totalTravelTime([leg1, leg2])).toBe(15 * 60 + 40)
  })

  it('formatta le durate', () => {
    expect(formatDuration(605)).toBe('10h 05m')
    expect(formatDuration(45)).toBe('45m')
  })

  it('mostra l’orario nel fuso dell’aeroporto', () => {
    expect(formatInZone(leg1.arrive, 'Asia/Dubai')).toBe('18:30')
    expect(formatInZone(leg1.arrive, 'Europe/Rome')).toBe('15:30')
  })

  it('riconosce l’arrivo il giorno dopo', () => {
    expect(dayOffset(leg2, 'Asia/Dubai', 'Asia/Bangkok')).toBe(1)
    expect(dayOffset(leg1, 'Europe/Rome', 'Asia/Dubai')).toBe(0)
  })
})
