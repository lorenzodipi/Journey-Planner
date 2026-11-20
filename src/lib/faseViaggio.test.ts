import { describe, expect, it } from 'vitest'
import { faseViaggio, inizioViaggio } from './oggi'
import type { Trip } from '../types'

// La sera prima della partenza, a casa, resta la Home di prima anche se in Giappone è già il giorno dopo.
const volo = (departAt: string) => ({ id: 'f', legs: [{ departAt, arriveAt: departAt, from: 'MXP', to: 'HND', fromTz: 'Europe/Rome', toTz: 'Asia/Tokyo' }] })
const viaggio = (flights: unknown[] = []) => ({ startDate: '2026-11-21', endDate: '2026-12-06', flights }) as unknown as Pick<Trip, 'startDate' | 'endDate' | 'flights'>
const roma = 'Europe/Rome'
const fase = (t: ReturnType<typeof viaggio>, iso: string, today = '2026-11-21') => faseViaggio(t, today, new Date(iso), roma)

describe('fase del viaggio contata da casa', () => {
  it('volo al mattino: venerdì pomeriggio a Roma è ancora «prima», anche se a Tokyo è sabato', () => {
    const t = viaggio([volo('2026-11-21T08:00:00Z')]) // 09:00 a Roma
    expect(fase(t, '2026-11-20T15:14:00Z')).toBe('pre')
    expect(fase(t, '2026-11-20T23:30:00Z')).toBe('during') // 00:30 di sabato a Roma
  })

  it('volo all\'una di notte: le 6 ore prima valgono già come viaggio', () => {
    const t = viaggio([volo('2026-11-21T00:00:00Z')]) // 01:00 a Roma
    expect(inizioViaggio(t, roma)).toBe(Date.parse('2026-11-20T18:00:00Z')) // 19:00 di venerdì a Roma
    expect(fase(t, '2026-11-20T17:00:00Z', '2026-11-21')).toBe('pre')
    expect(fase(t, '2026-11-20T19:00:00Z', '2026-11-21')).toBe('during')
  })

  it('senza voli si parte alla mezzanotte del primo giorno a casa', () => {
    expect(inizioViaggio(viaggio(), roma)).toBe(Date.parse('2026-11-20T23:00:00Z'))
    expect(fase(viaggio(), '2026-11-20T22:59:00Z')).toBe('pre')
  })

  it('un volo vecchio (di un altro momento) non anticipa il viaggio', () => {
    expect(inizioViaggio(viaggio([volo('2026-10-01T08:00:00Z')]), roma)).toBe(Date.parse('2026-11-20T23:00:00Z'))
  })

  it('dopo l\'ultimo giorno è «dopo»; senza fuso di casa vale la regola di prima', () => {
    expect(fase(viaggio(), '2026-12-08T10:00:00Z', '2026-12-07')).toBe('post')
    expect(faseViaggio(viaggio(), '2026-11-21')).toBe('during')
    expect(faseViaggio(viaggio(), '2026-11-20')).toBe('pre')
  })
})
