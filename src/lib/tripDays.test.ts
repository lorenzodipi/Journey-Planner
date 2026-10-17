import { describe, expect, it } from 'vitest'
import { enumerateDates, planDays } from './tripDays'

describe('enumerateDates', () => {
  it('include inizio e fine', () => {
    expect(enumerateDates('2026-11-21', '2026-11-23')).toEqual(['2026-11-21', '2026-11-22', '2026-11-23'])
  })

  it('un solo giorno se inizio = fine', () => {
    expect(enumerateDates('2026-11-21', '2026-11-21')).toEqual(['2026-11-21'])
  })

  it('attraversa mesi e anni senza saltare giorni (ora legale compresa)', () => {
    const d = enumerateDates('2026-10-24', '2026-10-27') // cambio ora in Europa il 25/10
    expect(d).toEqual(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'])
    expect(enumerateDates('2026-12-30', '2027-01-02')).toHaveLength(4)
  })

  it('intervallo invalido o rovesciato → vuoto', () => {
    expect(enumerateDates('2026-11-23', '2026-11-21')).toEqual([])
    expect(enumerateDates('boh', '2026-11-21')).toEqual([])
  })

  it('il viaggio in Giappone dura 19 giorni', () => {
    expect(enumerateDates('2026-11-21', '2026-12-09')).toHaveLength(19)
  })

  it('rispetta il tetto massimo', () => {
    expect(enumerateDates('2026-01-01', '2030-01-01', 10)).toHaveLength(10)
  })
})

describe('planDays', () => {
  const existing = [
    { id: 'a', date: '2026-11-21', deleted: false },
    { id: 'b', date: '2026-11-22', deleted: false },
    { id: 'c', date: '2026-11-23', deleted: true },
  ]

  it('prima creazione: crea tutto', () => {
    expect(planDays([], '2026-11-21', '2026-11-22')).toEqual({
      create: ['2026-11-21', '2026-11-22'],
      restore: [],
      hide: [],
    })
  })

  it('invariato: nessuna operazione', () => {
    expect(planDays(existing, '2026-11-21', '2026-11-22')).toEqual({ create: [], restore: [], hide: [] })
  })

  it('allargare: crea i nuovi e riattiva i nascosti', () => {
    const plan = planDays(existing, '2026-11-21', '2026-11-25')
    expect(plan.create).toEqual(['2026-11-24', '2026-11-25'])
    expect(plan.restore).toEqual(['c'])
    expect(plan.hide).toEqual([])
  })

  it('restringere: nasconde, non cancella', () => {
    const plan = planDays(existing, '2026-11-21', '2026-11-21')
    expect(plan).toEqual({ create: [], restore: [], hide: ['b'] })
  })

  it('spostare le date: nasconde i vecchi e crea i nuovi', () => {
    const plan = planDays(existing, '2026-11-24', '2026-11-25')
    expect(plan.create).toEqual(['2026-11-24', '2026-11-25'])
    expect(plan.hide.sort()).toEqual(['a', 'b'])
  })
})
