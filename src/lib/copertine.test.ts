import { describe, expect, it } from 'vitest'
import { copertinaDelPaese, copertinaDelViaggio, paeseDellaCopertina } from './copertine'

const base = { timezone: 'Asia/Tokyo', center: { lat: 0, lng: 0 }, startDate: '2026-11-21', endDate: '2026-12-09' }
const paese = (id: string, country: string, startDate: string, endDate: string) => ({ id, country, name: country, currency: '', timezone: '', startDate, endDate, position: 0 })

describe('copertine', () => {
  it('ogni paese con immagine ha il suo indirizzo', () => {
    expect(copertinaDelPaese('JP')).toMatch(/JP.*\.webp/)
    expect(copertinaDelPaese('it')).toMatch(/IT.*\.webp/)
    expect(copertinaDelPaese('XK')).toMatch(/XK.*\.webp/)
    expect(copertinaDelPaese('XX')).toBeUndefined()
    expect(copertinaDelPaese(undefined)).toBeUndefined()
  })
  it('vince il paese con più giorni', () => {
    const trip = { ...base, destination: 'Giappone', countries: [paese('a', 'AE', '2026-11-21', '2026-11-22'), paese('b', 'JP', '2026-11-22', '2026-12-08'), paese('c', 'CN', '2026-12-08', '2026-12-09')] }
    expect(paeseDellaCopertina(trip)).toBe('JP')
    expect(copertinaDelViaggio(trip)).toBe(copertinaDelPaese('JP'))
  })
  it('senza paesi salvati usa la destinazione', () => {
    expect(paeseDellaCopertina({ ...base, destination: 'Islanda' })).toBe('IS')
    expect(paeseDellaCopertina({ ...base, destination: 'Kosovo' })).toBe('XK')
    expect(copertinaDelViaggio({ ...base, destination: 'Un posto' })).toBeUndefined()
  })
})
