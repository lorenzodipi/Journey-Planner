import { describe, expect, it } from 'vitest'
import type { ChecklistItem } from '../types'
import { checklistColumns, mapChecklist } from './planningData'
import { parseQuantity, progress, TEMPLATE, templateToAdd, visibleItems } from './checklist'

const item = (over: Partial<ChecklistItem>): ChecklistItem => ({ id: 'x', kind: 'todo', text: 't', done: false, position: 1000, ...over })

describe('checklist', () => {
  it('conta le voci fatte', () => {
    expect(progress([item({ done: true }), item({}), item({ done: true })])).toEqual({ done: 2, total: 3 })
    expect(progress([])).toEqual({ done: 0, total: 0 })
  })

  it('mostra prima le da fare, poi le fatte, nell’ordine scelto', () => {
    const list = [
      item({ id: 'a', done: true, position: 1000 }),
      item({ id: 'b', position: 3000 }),
      item({ id: 'c', position: 2000 }),
      item({ id: 'd', kind: 'packing' }),
    ]
    expect(visibleItems(list, 'todo', 'all').map((i) => i.id)).toEqual(['c', 'b', 'a'])
  })

  it('per una persona: le sue voci e quelle per tutti', () => {
    const list = [
      item({ id: 'a' }),
      item({ id: 'b', travelerId: 't1' }),
      item({ id: 'c', travelerId: 't2' }),
    ]
    expect(visibleItems(list, 'todo', 't1').map((i) => i.id)).toEqual(['a', 'b'])
    expect(visibleItems(list, 'todo', 'all')).toHaveLength(3)
  })

  it('il modello non duplica ciò che c’è già e si accoda', () => {
    const first = TEMPLATE.todo[0]
    const add = templateToAdd([item({ text: first.toUpperCase(), position: 5000 })])
    expect(add.find((a) => a.kind === 'todo' && a.text === first)).toBeUndefined()
    expect(add.filter((a) => a.kind === 'todo')[0].position).toBe(6000)
    const all = Object.values(TEMPLATE).flat().length
    expect(templateToAdd([])).toHaveLength(all)
  })
})

describe('quantità', () => {
  it('legge la quantità scritta a mano', () => {
    expect(parseQuantity('3')).toBe(3)
    expect(parseQuantity(' 12 ')).toBe(12)
    expect(parseQuantity('')).toBe(1)
    expect(parseQuantity('0')).toBe(1)
    expect(parseQuantity('abc')).toBe(1)
    expect(parseQuantity('5000')).toBe(999)
    expect(parseQuantity(undefined)).toBe(1)
    expect(parseQuantity(2.7)).toBe(2)
  })

  it('salva la colonna solo quando serve', () => {
    const base = { text: ' Magliette ', kind: 'packing' as const, travelerId: null, dueDate: '' }
    expect(checklistColumns({ ...base, quantity: 3 })).toMatchObject({ text: 'Magliette', quantity: 3 })
    expect('quantity' in checklistColumns({ ...base, quantity: 1 })).toBe(false)
    expect('quantity' in checklistColumns(base)).toBe(false)
    // una voce che aveva una quantità e torna a 1 la azzera
    expect(checklistColumns({ ...base, quantity: 1 }, true)).toMatchObject({ quantity: null })
  })

  it('mostra la quantità solo se maggiore di 1', () => {
    const row = { trip_id: 't', traveler_id: null, kind: 'packing' as const, done: false, due_date: null, position: 1 }
    const list = mapChecklist([
      { ...row, id: 'a', text: 'A', quantity: 3 },
      { ...row, id: 'b', text: 'B', quantity: 1, position: 2 },
      { ...row, id: 'c', text: 'C', quantity: null, position: 3 },
      { ...row, id: 'd', text: 'D', position: 4 },
    ], 't')
    expect(list.map((x) => x.quantity)).toEqual([3, undefined, undefined, undefined])
  })
})
