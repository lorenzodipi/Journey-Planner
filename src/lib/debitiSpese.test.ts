import { describe, expect, it } from 'vitest'
import { debitiPerSpesa } from './debitiSpese'
import type { Expense, Rimborso } from '../types'

const fx = { base: 'EUR' }
const T = [{ id: 'lorenzo' }, { id: 'gaia' }]
const spesa = (id: string, amount: number, day: string, paidBy = 'lorenzo'): Expense => ({ id, label: id, amount, currency: 'EUR', paidBy, spentAt: `2026-11-${day}T12:00:00Z`, shares: [{ travelerId: 'lorenzo', weight: 1 }, { travelerId: 'gaia', weight: 1 }] })
const richiesta = (amount: number, status: Rimborso['status']): Rimborso => ({ id: 'r', fromId: 'gaia', toId: 'lorenzo', amount, currency: 'EUR', paidOn: '2026-11-05', status, createdAt: '2026-11-05T10:00:00Z' }) as Rimborso

describe('debiti per spesa', () => {
  const s = [spesa('assicurazione', 175, '01'), spesa('cena', 40, '02')]
  it('Gaia vede una card per ogni spesa che deve; Lorenzo la stessa al contrario', () => {
    const g = debitiPerSpesa(s, T, fx, 'gaia', [], [])
    expect(g.map((x) => [x.expenseId, x.verso, x.otherId, x.residuo])).toEqual([['cena', 'devo', 'lorenzo', 20], ['assicurazione', 'devo', 'lorenzo', 87.5]])
    const l = debitiPerSpesa(s, T, fx, 'lorenzo', [], [])
    expect(l.every((x) => x.verso === 'devono' && x.otherId === 'gaia' && x.stato === 'da_pagare')).toBe(true)
  })
  it('i rimborsi confermati coprono le spese dalla più vecchia; il resto resta da pagare', () => {
    const g = debitiPerSpesa(s, T, fx, 'gaia', [{ id: 'x', fromId: 'gaia', toId: 'lorenzo', amount: 90 }], [])
    const by = Object.fromEntries(g.map((x) => [x.expenseId, x]))
    expect(by.assicurazione.stato).toBe('pagato')
    expect(by.cena.residuo).toBe(17.5)
    expect(by.cena.stato).toBe('da_pagare')
  })
  it('una richiesta in attesa segna la spesa «in attesa» senza cambiare il residuo', () => {
    const g = debitiPerSpesa([spesa('assicurazione', 175, '01')], T, fx, 'gaia', [], [richiesta(87.5, 'in_attesa')])
    expect(g[0]).toMatchObject({ stato: 'in_attesa', residuo: 87.5, inAttesa: 87.5 })
  })
  it('le spese pagate da me per me non creano debiti', () => {
    const solo = { ...spesa('mia', 30, '03'), shares: [{ travelerId: 'lorenzo', weight: 1 }] }
    expect(debitiPerSpesa([solo], T, fx, 'gaia', [], [])).toEqual([])
    expect(debitiPerSpesa([solo], T, fx, 'lorenzo', [], [])).toEqual([])
  })
})
