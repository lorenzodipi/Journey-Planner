import { describe, expect, it } from 'vitest'
import type { ChecklistItem } from '../types'
import { checklistEntry } from './outboxLocal'
import { checklistColumns, mapChecklist } from './planningData'
import { countChange, doneCount, parseQuantity, progress, TEMPLATE, templateToAdd, visibleItems } from './checklist'

const item = (over: Partial<ChecklistItem>): ChecklistItem => ({ id: 'x', kind: 'todo', text: 't', done: false, position: 1000, ...over })

describe('checklist', () => {
  it('conta le voci fatte', () => {
    expect(progress([item({ done: true }), item({}), item({ done: true })])).toEqual({ done: 2, total: 3 })
    expect(progress([])).toEqual({ done: 0, total: 0 })
  })

  it('tiene l’ordine scelto: le voci fatte restano al loro posto', () => {
    const list = [
      item({ id: 'a', done: true, position: 1000 }),
      item({ id: 'b', position: 3000 }),
      item({ id: 'c', position: 2000 }),
      item({ id: 'd', kind: 'packing' }),
    ]
    expect(visibleItems(list, 'todo', 'all').map((i) => i.id)).toEqual(['a', 'c', 'b'])
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

describe('pezzi a posto', () => {
  const multi = (over: Partial<ChecklistItem> = {}) => item({ quantity: 10, ...over })

  it('conta i pezzi: tutti se fatta, i parziali altrimenti, 1 pezzo se senza quantità', () => {
    expect(doneCount(item({ done: true }))).toBe(1)
    expect(doneCount(item({}))).toBe(0)
    expect(doneCount(multi({ done: true }))).toBe(10)
    expect(doneCount(multi({ quantityDone: 8 }))).toBe(8)
    expect(doneCount(multi({}))).toBe(0)
    expect(doneCount(multi({ quantityDone: 99 }))).toBe(9) // mai "tutti" se non è segnata fatta
  })

  it('imposta i pezzi e deduce se la voce è fatta', () => {
    expect(countChange({ quantity: 10 }, 8)).toMatchObject({ count: 8, done: false, patch: { quantity_done: 8, done: false } })
    expect(countChange({ quantity: 10 }, 10)).toMatchObject({ count: 10, done: true })
    expect(countChange({ quantity: 10 }, 15).count).toBe(10)
    expect(countChange({ quantity: 10 }, -3)).toMatchObject({ count: 0, done: false })
    expect(countChange({}, 1)).toMatchObject({ count: 1, done: true })
  })

  it('mappa dal database solo i pezzi parziali', () => {
    const row = { trip_id: 't', traveler_id: null, kind: 'packing' as const, text: 'x', due_date: null, position: 1 }
    const r = (id: string, done: boolean, quantity: number | null, quantity_done: number | null) => ({ ...row, id, done, quantity, quantity_done })
    const list = mapChecklist([r('a', false, 10, 8), r('b', true, 10, 10), r('c', false, 10, 0), r('d', false, 10, null), r('e', false, null, 3)], 't')
    expect(list.map((x) => x.quantityDone)).toEqual([8, undefined, undefined, undefined, undefined])
  })
})

describe('salvataggio di una voce con quantità', () => {
  const input = { text: 'Magliette', kind: 'packing' as const, travelerId: null, dueDate: '' }
  const patchOf = (e: ReturnType<typeof checklistEntry>) => {
    const op = e.ops[0]
    return op.k === 'update' ? op.patch : op.k === 'upsert' ? op.row : {}
  }

  it('una voce nuova con quantità parte da zero pezzi', () => {
    const e = checklistEntry('t', { ...input, quantity: 10 }, 1000)
    expect(patchOf(e)).toMatchObject({ quantity: 10, quantity_done: 0, done: false })
  })

  it('una voce senza quantità non scrive le colonne nuove', () => {
    const e = checklistEntry('t', { ...input, quantity: 1 }, 1000)
    expect('quantity' in patchOf(e)).toBe(false)
    expect('quantity_done' in patchOf(e)).toBe(false)
  })

  it('abbassando la quantità sotto i pezzi già presi la voce risulta fatta', () => {
    const old = item({ id: 'a', quantity: 10, quantityDone: 8 })
    const e = checklistEntry('t', { ...input, quantity: 5 }, 1000, old)
    expect(patchOf(e)).toMatchObject({ quantity: 5, quantity_done: 5, done: true })
  })

  it('alzando la quantità di una voce fatta, quella non è più completa', () => {
    const old = item({ id: 'a', quantity: 3, done: true })
    const e = checklistEntry('t', { ...input, quantity: 5 }, 1000, old)
    expect(patchOf(e)).toMatchObject({ quantity: 5, quantity_done: 3, done: false })
  })

  it('tornando a quantità 1 si azzerano le colonne', () => {
    const old = item({ id: 'a', quantity: 10, quantityDone: 4 })
    const e = checklistEntry('t', { ...input, quantity: 1 }, 1000, old)
    expect(patchOf(e)).toMatchObject({ quantity: null, quantity_done: null, done: true })
  })
})

import { cleanUrl } from './planningData'
describe('link delle voci', () => {
  it('aggiunge https e scarta ciò che non è web', () => {
    expect(cleanUrl('amazon.it/dp/B0')).toBe('https://amazon.it/dp/B0')
    expect(cleanUrl(' https://a.b/c ')).toBe('https://a.b/c')
    expect(cleanUrl('javascript:alert(1)')).toBe('')
    expect(cleanUrl('')).toBe('')
  })
  it('scrive la colonna solo se serve', () => {
    const base = { text: 'x', kind: 'todo' as const, travelerId: null, dueDate: '' }
    expect('url' in checklistColumns(base)).toBe(false)
    expect(checklistColumns({ ...base, url: 'a.it' }).url).toBe('https://a.it/')
    expect(checklistColumns(base, false, true).url).toBeNull()
  })
})
