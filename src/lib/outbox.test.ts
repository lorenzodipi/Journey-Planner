import { describe, expect, it, vi } from 'vitest'
import { demoTrip } from '../demo/demoTrip'
import { flushQueue, isTransient, type Entry, type Op } from './outbox'
import { applyQueue, checklistEntry, expenseEntry } from './outboxLocal'
import type { ExpenseInput } from './moneyData'
import type { Trip } from '../types'

const trip: Trip = { ...demoTrip, expenses: [], checklist: [] }

const input: ExpenseInput = {
  label: 'Ramen', category: 'Cibo', amount: 1200, currency: 'JPY', fxRate: 0.0056,
  paidBy: trip.travelers[0]?.id ?? null, spentDate: trip.startDate, notes: '', travelerIds: trip.travelers.map((t) => t.id),
}

const entry = (id: string, ops: Op[], local: Entry['local']): Entry => ({ id, at: 0, label: id, ops, local })

describe('coda offline: invio', () => {
  const op = (n: string): Op => ({ k: 'update', table: 't', id: n, patch: {} })

  it('invia tutto in ordine', async () => {
    const seen: string[] = []
    const r = await flushQueue(
      [entry('a', [op('1'), op('2')], { t: 'item.done', id: 'x', done: true }), entry('b', [op('3')], { t: 'item.done', id: 'y', done: true })],
      async (o) => void seen.push((o as { id: string }).id),
    )
    expect(seen).toEqual(['1', '2', '3'])
    expect(r).toEqual({ sent: ['a', 'b'], failed: [], stopped: false })
  })

  it('un errore di rete ferma tutto e lascia le voci in coda', async () => {
    const exec = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('TypeError: Failed to fetch'))
    const r = await flushQueue(
      [entry('a', [op('1')], { t: 'item.done', id: 'x', done: true }), entry('b', [op('2')], { t: 'item.done', id: 'y', done: true }), entry('c', [op('3')], { t: 'item.done', id: 'z', done: true })],
      exec,
    )
    expect(r.sent).toEqual(['a'])
    expect(r.stopped).toBe(true)
    expect(exec).toHaveBeenCalledTimes(2) // 'c' non è nemmeno tentata: l'ordine conta
  })

  it('un rifiuto definitivo segna solo quella voce', async () => {
    const exec = vi.fn().mockRejectedValueOnce(Object.assign(new Error('new row violates row-level security policy'), { status: 403 })).mockResolvedValue(undefined)
    const r = await flushQueue(
      [entry('a', [op('1')], { t: 'item.done', id: 'x', done: true }), entry('b', [op('2')], { t: 'item.done', id: 'y', done: true })],
      exec,
    )
    expect(r.failed).toEqual([{ id: 'a', error: 'new row violates row-level security policy' }])
    expect(r.sent).toEqual(['b'])
  })

  it('classifica gli errori', () => {
    expect(isTransient(new Error('Failed to fetch'))).toBe(true)
    expect(isTransient(Object.assign(new Error('x'), { status: 503 }))).toBe(true)
    expect(isTransient(Object.assign(new Error('JWT expired'), { status: 401 }))).toBe(true)
    expect(isTransient(Object.assign(new Error('permission denied'), { status: 403 }))).toBe(false)
    expect(isTransient(Object.assign(new Error('duplicate key'), { status: 409 }))).toBe(false)
  })
})

describe('coda offline: vista locale', () => {
  it('una nuova spesa compare subito, con quote e giorno', () => {
    const e = expenseEntry(trip, input)
    expect(e.ops).toHaveLength(2)
    expect(e.ops[0]).toMatchObject({ k: 'upsert', table: 'expenses' })
    const shown = applyQueue([trip], [entry('1', e.ops, e.local)])
    expect(shown[0].expenses).toHaveLength(1)
    expect(shown[0].expenses[0]).toMatchObject({ label: 'Ramen', amount: 1200, currency: 'JPY' })
    expect(shown[0].expenses[0].shares).toHaveLength(trip.travelers.length)
  })

  it('applicare due volte la stessa voce non duplica', () => {
    const e = expenseEntry(trip, input)
    const q = [entry('1', e.ops, e.local)]
    const once = applyQueue([trip], q)
    const twice = applyQueue(once, q)
    expect(twice[0].expenses).toHaveLength(1)
  })

  it('modifica ed eliminazione in coda', () => {
    const created = expenseEntry(trip, input)
    const base = applyQueue([trip], [entry('1', created.ops, created.local)])
    const existing = base[0].expenses[0]
    const edit = expenseEntry(base[0], { ...input, label: 'Ramen speciale' }, existing)
    expect(edit.ops[0]).toMatchObject({ k: 'update', id: existing.id })
    const edited = applyQueue(base, [entry('2', edit.ops, edit.local)])
    expect(edited[0].expenses[0].label).toBe('Ramen speciale')
    const gone = applyQueue(edited, [entry('3', [], { t: 'expense.deleted', id: existing.id, deleted: true })])
    expect(gone[0].expenses).toHaveLength(0)
  })

  it('checklist: nuova voce, spunta, eliminazione', () => {
    const c = checklistEntry(trip.id, { text: 'Passaporto', kind: 'docs', travelerId: null, dueDate: '' }, 1000)
    let shown = applyQueue([trip], [entry('1', c.ops, c.local)])
    const id = shown[0].checklist[0].id
    expect(shown[0].checklist[0]).toMatchObject({ text: 'Passaporto', done: false })
    shown = applyQueue(shown, [entry('2', [], { t: 'checklist.done', id, done: true })])
    expect(shown[0].checklist[0].done).toBe(true)
    shown = applyQueue(shown, [entry('3', [], { t: 'checklist.deleted', id, deleted: true })])
    expect(shown[0].checklist).toHaveLength(0)
  })

  it('le voci rifiutate non si vedono', () => {
    const e = expenseEntry(trip, input)
    const rejected: Entry = { ...entry('1', e.ops, e.local), error: 'no' }
    expect(applyQueue([trip], [rejected])[0].expenses).toHaveLength(0)
  })
})
