import { describe, expect, it } from 'vitest'
import type { Booking } from '../types'
import { inPersone, nelFiltro, oraPrenotazione, perGiorno, sottotitolo } from './prenotazioni'

const TZ = 'Asia/Tokyo'
const b = (id: string, type: Booking['type'], validFrom?: string, extra: Partial<Booking> = {}): Booking => ({ id, type, title: id, keepOffline: false, validFrom, ...extra })

describe('prenotazioni', () => {
  it('mappa le pillole sui tipi', () => {
    expect(nelFiltro(b('a', 'esim'), 'rental')).toBe(true)
    expect(nelFiltro(b('a', 'ticket'), 'activity')).toBe(true)
    expect(nelFiltro(b('a', 'insurance'), 'activity')).toBe(false)
    expect(nelFiltro(b('a', 'insurance'), 'all')).toBe(true)
    expect(nelFiltro(b('a', 'train'), 'train')).toBe(true)
  })
  it('raggruppa per giorno nel fuso del viaggio, per orario, e mette in fondo quelle senza data', () => {
    // 2026-11-26 19:30 a Tokyo = 10:30Z; 2026-11-26 12:00 a Tokyo = 03:00Z
    const g = perGiorno([b('cena', 'restaurant', '2026-11-26T10:30:00Z'), b('senza', 'other'), b('pranzo', 'restaurant', '2026-11-26T03:00:00Z'), b('prima', 'train', '2026-11-25T23:30:00Z')], TZ)
    expect(g.map((x) => [x.ymd, x.items.map((i) => i.id)])).toEqual([['2026-11-26', ['prima', 'pranzo', 'cena']], ['', ['senza']]])
  })
  it('mostra l\'ora solo se c\'è', () => {
    expect(oraPrenotazione(b('a', 'restaurant', '2026-11-26T10:30:00Z'), TZ)).toBe('19:30')
    expect(oraPrenotazione(b('a', 'restaurant', '2026-11-25T15:00:00Z'), TZ)).toBe('')
    expect(oraPrenotazione(b('a', 'restaurant'), TZ)).toBe('')
  })
  it('scrive il sottotitolo', () => {
    expect(sottotitolo(b('a', 'restaurant', undefined, { place: 'Gion', partySize: 4 }), TZ)).toBe('Gion · in quattro')
    expect(sottotitolo(b('a', 'rental', '2026-11-25T15:00:00Z', { place: 'Stazione di Kyoto', validTo: '2026-11-29T14:59:00Z' }), TZ)).toBe('Stazione di Kyoto · 4 giorni')
    expect(inPersone(9)).toBe('9 persone')
  })
})
