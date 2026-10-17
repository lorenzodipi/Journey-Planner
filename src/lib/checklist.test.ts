import { describe, expect, it } from 'vitest'
import type { ChecklistItem } from '../types'
import { progress, TEMPLATE, templateToAdd, visibleItems } from './checklist'

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
