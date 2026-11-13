import { describe, expect, it } from 'vitest'
import type { DebitoSpesa } from './debitiSpese'
import { FILTRI_VUOTI, filtraBilancio, filtriAttivi, ORDINE_BASE, ordinaBilancio } from './filtriBilancio'

const d = (id: string, o: Partial<DebitoSpesa> & { categoria?: string; giorno?: string; importo?: number }): DebitoSpesa =>
  ({
    expenseId: id,
    expense: { id, label: id, category: o.categoria, spentAt: `2026-11-${o.giorno ?? '10'}T12:00:00` },
    otherId: 'gaia',
    verso: 'devo',
    importo: o.importo ?? 10,
    pagato: 0,
    inAttesa: 0,
    residuo: o.importo ?? 10,
    stato: 'da_pagare',
    confermati: [],
    eccedenza: 0,
    richieste: [],
    contestato: 0,
    contestati: [],
    ...o,
  }) as unknown as DebitoSpesa
const nome = (id: string) => ({ gaia: 'Gaia', marco: 'Marco' })[id] ?? id
const lista = [
  d('cena', { categoria: 'Cibo', giorno: '12', importo: 30 }),
  d('treno', { categoria: 'Trasporti', giorno: '05', importo: 90, otherId: 'marco', stato: 'pagato' }),
  d('hotel', { categoria: 'Alloggio', giorno: '20', importo: 200, stato: 'in_attesa' }),
  d('caffe', { categoria: 'cibo', giorno: '12', importo: 5, otherId: 'marco', stato: 'contestato' }),
]
const ids = (l: DebitoSpesa[]) => l.map((x) => x.expenseId)

describe('filtri di Il mio bilancio', () => {
  it('senza filtri non cambia niente', () => {
    expect(filtraBilancio(lista, FILTRI_VUOTI)).toHaveLength(4)
    expect(filtriAttivi(FILTRI_VUOTI)).toBe(0)
  })
  it('persona, categoria (senza badare alle maiuscole) e stato', () => {
    expect(ids(filtraBilancio(lista, { ...FILTRI_VUOTI, persona: 'marco' }))).toEqual(['treno', 'caffe'])
    expect(ids(filtraBilancio(lista, { ...FILTRI_VUOTI, categoria: 'Cibo' }))).toEqual(['cena', 'caffe'])
    expect(ids(filtraBilancio(lista, { ...FILTRI_VUOTI, stato: 'aperti' }))).toEqual(['cena', 'caffe'])
    expect(ids(filtraBilancio(lista, { ...FILTRI_VUOTI, stato: 'attesa' }))).toEqual(['hotel'])
    expect(ids(filtraBilancio(lista, { ...FILTRI_VUOTI, stato: 'pagati' }))).toEqual(['treno'])
  })
  it('date e importi con gli estremi compresi', () => {
    expect(ids(filtraBilancio(lista, { ...FILTRI_VUOTI, dal: '2026-11-12', al: '2026-11-12' }))).toEqual(['cena', 'caffe'])
    expect(ids(filtraBilancio(lista, { ...FILTRI_VUOTI, min: '30', max: '90' }))).toEqual(['cena', 'treno'])
    expect(ids(filtraBilancio(lista, { ...FILTRI_VUOTI, min: '5,00', max: '' }))).toHaveLength(4)
  })
  it('i filtri si sommano e si contano', () => {
    const f = { ...FILTRI_VUOTI, persona: 'marco', min: '10' }
    expect(ids(filtraBilancio(lista, f))).toEqual(['treno'])
    expect(filtriAttivi(f)).toBe(2)
  })
})

describe('ordinamenti di Il mio bilancio', () => {
  it('predefinito lascia l\'ordine, data e importo partono dai più recenti e dai più alti', () => {
    expect(ids(ordinaBilancio(lista, ORDINE_BASE, nome))).toEqual(['cena', 'treno', 'hotel', 'caffe'])
    expect(ids(ordinaBilancio(lista, { per: 'data', inverso: false }, nome))).toEqual(['hotel', 'cena', 'caffe', 'treno'])
    expect(ids(ordinaBilancio(lista, { per: 'importo', inverso: false }, nome))).toEqual(['hotel', 'treno', 'cena', 'caffe'])
  })
  it('inverso, categoria e persona', () => {
    expect(ids(ordinaBilancio(lista, { per: 'data', inverso: true }, nome))).toEqual(['treno', 'cena', 'caffe', 'hotel'])
    expect(ids(ordinaBilancio(lista, { per: 'categoria', inverso: false }, nome))).toEqual(['hotel', 'cena', 'caffe', 'treno'])
    expect(ids(ordinaBilancio(lista, { per: 'persona', inverso: false }, nome))).toEqual(['hotel', 'cena', 'caffe', 'treno'])
  })
})
