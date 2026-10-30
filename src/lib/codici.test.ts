import { describe, expect, it } from 'vitest'
import type { TicketCode } from '../types'
import { codiciDi, codicePer, nBiglietti, senzaCodice } from './codici'

const trip = { travelers: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] } as never
const c = (id: string, travelerId?: string, refId = 'x'): TicketCode => ({ id, kind: 'transport', refId, travelerId, filePath: `p/${id}` })

describe('codici dei biglietti', () => {
  it('prende solo quelli della voce, nell\'ordine dei viaggiatori e «per tutti» in fondo', () => {
    const t = { ...(trip as object), ticketCodes: [c('3'), c('2', 'b'), c('1', 'a'), c('9', 'a', 'altro')] } as never
    expect(codiciDi(t, 'transport', 'x').map((k) => k.id)).toEqual(['1', '2', '3'])
    expect(codiciDi(t, 'flight', 'x')).toEqual([])
  })
  it('il codice di un passeggero ripiega su quello per tutti', () => {
    expect(codicePer([c('1', 'a'), c('2')], 'a')?.id).toBe('1')
    expect(codicePer([c('1', 'a'), c('2')], 'b')?.id).toBe('2')
    expect(codicePer([c('1', 'a')], 'b')).toBeUndefined()
  })
  it('elenca chi non ha ancora il codice', () => {
    expect(senzaCodice([c('1', 'a')], ['a', 'b', 'c'])).toEqual(['b', 'c'])
    expect(senzaCodice([c('1')], ['a', 'b'])).toEqual([])
  })
  it('scrive il numero dei biglietti', () => {
    expect(nBiglietti(1)).toBe('1 biglietto')
    expect(nBiglietti(4)).toBe('4 biglietti')
  })
})
