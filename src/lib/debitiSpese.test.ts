import { describe, expect, it } from 'vitest'
import { debitiPerSpesa, pianoBilancia, totaliAperti, totaliDelViaggio } from './debitiSpese'
import { rimborsiValidi } from './rimborsi'
import { summarizeExpenses } from './budget'
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
  it('«Ho pagato» su una card copre quella spesa, non la più vecchia (bug del giro senza fine)', () => {
    const r = { ...richiesta(20, 'confermato'), id: 'r1', expenseId: 'cena' }
    const g = debitiPerSpesa(s, T, fx, 'gaia', [{ id: 'r1', fromId: 'gaia', toId: 'lorenzo', amount: 20 }], [r])
    const by = Object.fromEntries(g.map((x) => [x.expenseId, x]))
    expect(by.cena).toMatchObject({ stato: 'pagato', residuo: 0, confermati: [{ id: 'r1', amount: 20 }] })
    expect(by.assicurazione).toMatchObject({ stato: 'da_pagare', residuo: 87.5 })
    // e lo stesso dal lato di Lorenzo
    const l = debitiPerSpesa(s, T, fx, 'lorenzo', [], [r])
    expect(l.find((x) => x.expenseId === 'cena')?.stato).toBe('pagato')
  })
  it('una rettifica confermata riapre la spesa del rimborso che corregge', () => {
    const orig = { ...richiesta(20, 'confermato'), id: 'r1', expenseId: 'cena' }
    const rett = { ...richiesta(20, 'confermato'), id: 'r2', fromId: 'lorenzo', toId: 'gaia', corrects: 'r1' }
    const g = debitiPerSpesa(s, T, fx, 'gaia', [], [orig, rett])
    expect(g.find((x) => x.expenseId === 'cena')).toMatchObject({ stato: 'da_pagare', residuo: 20, confermati: [] })
  })
  it('una richiesta in attesa legata alla spesa segna quella card', () => {
    const r = { ...richiesta(20, 'in_attesa'), id: 'r3', expenseId: 'cena' }
    const g = debitiPerSpesa(s, T, fx, 'gaia', [], [r])
    const by = Object.fromEntries(g.map((x) => [x.expenseId, x]))
    expect(by.cena).toMatchObject({ stato: 'in_attesa', richieste: [{ id: 'r3', amount: 20 }] })
    expect(by.assicurazione.stato).toBe('da_pagare')
  })
  it('un rimborso dato due volte: l\'eccedenza si vede sulla card ed è rettificabile (caso reale: «Prova»)', () => {
    const prova = [spesa('prova', 40, '05', 'gaia')]
    const a = { ...richiesta(20, 'confermato'), id: 'a', fromId: 'lorenzo', toId: 'gaia' }
    const b = { ...richiesta(20, 'confermato'), id: 'b', fromId: 'lorenzo', toId: 'gaia', createdAt: '2026-11-05T10:01:00Z' }
    const g = debitiPerSpesa(prova, T, fx, 'gaia', [], [a, b])
    expect(g[0]).toMatchObject({ verso: 'devono', stato: 'pagato', eccedenza: 20 })
    expect(g[0].confermati.map((c) => c.id)).toEqual(['a', 'b'])
  })
  it('i rimborsi nei due versi non si compensano (bug: 20 € di Lorenzo annullati dai 77,12 € di Gaia)', () => {
    const sp = [spesa('assicurazione', 154.24, '01'), spesa('prova', 40, '05', 'gaia')]
    const g77 = { ...richiesta(77.12, 'confermato'), id: 'g' }
    const l20 = { ...richiesta(20, 'confermato'), id: 'l', fromId: 'lorenzo', toId: 'gaia' }
    const l = debitiPerSpesa(sp, T, fx, 'lorenzo', [], [g77, l20])
    expect(l.find((x) => x.expenseId === 'prova')?.stato).toBe('pagato')
    expect(l.find((x) => x.expenseId === 'assicurazione')?.stato).toBe('pagato')
  })
  it('le spese pagate da me per me non creano debiti', () => {
    const solo = { ...spesa('mia', 30, '03'), shares: [{ travelerId: 'lorenzo', weight: 1 }] }
    expect(debitiPerSpesa([solo], T, fx, 'gaia', [], [])).toEqual([])
    expect(debitiPerSpesa([solo], T, fx, 'lorenzo', [], [])).toEqual([])
  })
})

describe('totali da dare e da ricevere', () => {
  const a = spesa('a', 60, '01') // Gaia mi deve 30
  const b = spesa('b', 20, '02') // Gaia mi deve 10
  const c = spesa('c', 80, '03', 'gaia') // io devo 40 a Gaia
  it('non compensa niente: 40 da ricevere e 40 da dare restano tutti e due', () => {
    expect(totaliAperti(debitiPerSpesa([a, b, c], T, fx, 'lorenzo', [], []))).toEqual({ daDare: 40, daRicevere: 40 })
  })
  it('i rimborsi confermati riducono il residuo', () => {
    expect(totaliAperti(debitiPerSpesa([a, b], T, fx, 'lorenzo', [{ id: 'x', fromId: 'gaia', toId: 'lorenzo', amount: 15 }], []))).toEqual({ daDare: 0, daRicevere: 25 })
  })
  it('senza spese condivise sono tutti e due a zero', () => {
    expect(totaliAperti([])).toEqual({ daDare: 0, daRicevere: 0 })
  })
})

describe('«Bilancia tutte le spese»', () => {
  const a = spesa('a', 60, '01') // Gaia mi deve 30
  const b = spesa('b', 20, '02') // Gaia mi deve 10
  const c = (tot: number) => spesa('c', tot, '03', 'gaia') // io devo la metà a Gaia
  const piano = (spese: Expense[], richieste: Rimborso[] = []) => pianoBilancia(debitiPerSpesa(spese, T, fx, 'lorenzo', [], richieste), 'lorenzo', 'gaia')
  it('30 + 10 contro 40: tutto compensato, niente da versare', () => {
    const p = piano([a, b, c(80)])
    expect(p).toMatchObject({ compensato: 40, daPagare: 0, chiPaga: null, voci: 3 })
    expect(p?.righe.every((x) => x.compensation)).toBe(true)
    expect(p?.righe.reduce((n, x) => n + (x.fromId === 'gaia' ? x.amount : -x.amount), 0)).toBe(0)
  })
  it('30 + 10 contro 50: compenso 40 e pago 10 sulla spesa che resta', () => {
    const p = piano([a, b, c(100)])
    expect(p).toMatchObject({ compensato: 40, daPagare: 10, chiPaga: 'io' })
    expect(p?.righe).toContainEqual({ fromId: 'lorenzo', toId: 'gaia', amount: 10, expenseId: 'c' })
    expect(p?.righe).toContainEqual({ fromId: 'lorenzo', toId: 'gaia', amount: 40, expenseId: 'c', compensation: true })
  })
  it('senza spese nell\'altro verso è un pagamento solo', () => {
    const p = piano([a, b])
    expect(p).toMatchObject({ compensato: 0, daPagare: 40, chiPaga: 'altro', voci: 2 })
    expect(p?.righe.map((x) => x.compensation)).toEqual([undefined, undefined])
  })
  it('lascia fuori quello già dichiarato in attesa e non propone nulla se non c\'è niente', () => {
    const attesa = { ...richiesta(30, 'in_attesa'), expenseId: 'a' } as Rimborso
    expect(piano([a, b], [attesa])?.daPagare).toBe(10)
    expect(piano([a], [{ ...richiesta(30, 'in_attesa'), expenseId: 'a' } as Rimborso])).toBeNull()
  })
  it('dopo la bilancia (righe confermate) tutto è pagato e totali a zero', () => {
    const p = piano([a, b, c(100)]) as NonNullable<ReturnType<typeof piano>>
    const fatte = p.righe.map((x, i) => ({ id: `x${i}`, fromId: x.fromId, toId: x.toId, amount: x.amount, currency: 'EUR', paidOn: '2026-11-13', status: 'confermato', createdAt: `2026-11-13T10:00:0${i}Z`, ...(x.expenseId ? { expenseId: x.expenseId } : {}) })) as Rimborso[]
    const dopo = debitiPerSpesa([a, b, c(100)], T, fx, 'lorenzo', [], fatte)
    expect(totaliAperti(dopo)).toEqual({ daDare: 0, daRicevere: 0 })
    expect(dopo.every((d) => d.stato === 'pagato')).toBe(true)
  })
  it('un pagamento contestato non conta e la card lo dice', () => {
    const contestato = { ...richiesta(30, 'contestato'), expenseId: 'a' } as Rimborso
    const righe = debitiPerSpesa([a, b], T, fx, 'lorenzo', [], [contestato])
    expect(totaliAperti(righe)).toEqual({ daDare: 0, daRicevere: 40 })
    expect(righe.find((d) => d.expenseId === 'a')).toMatchObject({ stato: 'contestato', contestato: 30 })
  })
})

describe('spesa cancellata dopo un pagamento (caso reale: «Test» da 58 €, Gaia aveva dato 29 €)', () => {
  const test = spesa('test', 58, '13')
  const pag = { ...richiesta(29, 'confermato'), id: 'p', expenseId: 'test' } as Rimborso
  const trip = (expenses: Expense[], settlements: Rimborso[]) => ({ travelers: T.map((x) => ({ ...x, name: x.id, color: '#000' })), expenses, settled: settlements.filter((r) => r.status === 'confermato').map((r) => ({ id: r.id, fromId: r.fromId, toId: r.toId, amount: r.amount })), settlements })
  it('con la spesa: tutto pagato', () => {
    expect(totaliDelViaggio(trip([test], [pag]), [test], fx, 'lorenzo')).toEqual({ daDare: 0, daRicevere: 0 })
  })
  it('cancellata la spesa, il pagamento non conta più: nessuno deve niente', () => {
    const t = trip([], [pag])
    expect(totaliDelViaggio(t, [], fx, 'lorenzo')).toEqual({ daDare: 0, daRicevere: 0 })
    expect(rimborsiValidi(t).settled).toEqual([])
    expect(summarizeExpenses([], T.map((x) => ({ ...x, name: x.id })), fx, rimborsiValidi(t).settled).transfers).toEqual([])
  })
  it('i rimborsi senza spesa (quelli di prima) restano', () => {
    const vecchio = { ...richiesta(77.12, 'confermato'), id: 'v' } as Rimborso
    expect(rimborsiValidi(trip([], [vecchio, pag])).settlements?.map((r) => r.id)).toEqual(['v'])
  })
  it('in una «Bilancia» se una spesa compensata sparisce saltano tutte le compensazioni, resta il pagamento vero', () => {
    const a = spesa('a', 60, '01')
    const c = spesa('c', 100, '03', 'gaia')
    const righe = [
      { ...richiesta(30, 'confermato'), id: 'c1', expenseId: 'a', compensation: true, groupId: 'g' },
      { ...richiesta(30, 'confermato'), id: 'c2', fromId: 'lorenzo', toId: 'gaia', expenseId: 'c', compensation: true, groupId: 'g' },
      { ...richiesta(20, 'confermato'), id: 'p2', fromId: 'lorenzo', toId: 'gaia', expenseId: 'c', groupId: 'g' },
    ] as Rimborso[]
    const t = trip([c], righe)
    expect(rimborsiValidi(t).settlements?.map((r) => r.id)).toEqual(['p2'])
    expect(totaliDelViaggio(t, [c], fx, 'lorenzo')).toEqual({ daDare: 30, daRicevere: 0 })
    expect(totaliDelViaggio(trip([a, c], righe), [a, c], fx, 'lorenzo')).toEqual({ daDare: 0, daRicevere: 0 })
  })
})
