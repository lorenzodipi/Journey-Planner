import { describe, expect, it } from 'vitest'
import { isJapanTrip } from './tripLocale'

describe('viaggio in Giappone', () => {
  it('si riconosce dal fuso orario', () => {
    expect(isJapanTrip({ timezone: 'Asia/Tokyo', destination: '' })).toBe(true)
  })

  it('o dal nome della destinazione', () => {
    expect(isJapanTrip({ timezone: 'Europe/Rome', destination: 'Giappone' })).toBe(true)
    expect(isJapanTrip({ timezone: 'Europe/Rome', destination: 'Kyoto e Osaka' })).toBe(true)
    expect(isJapanTrip({ timezone: 'Europe/Rome', destination: '日本' })).toBe(true)
  })

  it('altrove no: niente caratteri giapponesi', () => {
    expect(isJapanTrip({ timezone: 'Atlantic/Reykjavik', destination: 'Islanda' })).toBe(false)
    expect(isJapanTrip({ timezone: 'Europe/Lisbon', destination: '' })).toBe(false)
  })
})
