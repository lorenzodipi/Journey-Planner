import { describe, expect, it } from 'vitest'
import type { Trip } from '../types'
import { datiDopo, differenzaFusoOre, righeDopo, struttura } from './dopoViaggio'

const ids = (r: ReturnType<typeof struttura>) => r.map((x) => (x.tipo === 'larga' ? x.id : x.id.join('+')))

describe('struttura: sei posti sotto la card viola', () => {
  it('con tutto: larga, coppia, larga, larga, coppia, larga', () => {
    const r = struttura(['citta', 'visto', 'davedere', 'volo', 'dormito', 'mossi'], ['paesi', 'tappe', 'pieno', 'checklist'])
    expect(ids(r)).toEqual(['citta', 'paesi+tappe', 'visto', 'davedere', 'pieno+checklist', 'volo'])
  })
  it('senza la città la riga 2 è comunque una larga: la prima per priorità', () => {
    const r = struttura(['visto', 'davedere', 'volo'], ['paesi', 'tappe'])
    expect(r[0]).toEqual({ tipo: 'larga', id: 'visto' })
    expect(ids(r)).toEqual(['visto', 'paesi+tappe', 'davedere', 'volo'])
  })
  it('finite le larghe, il posto largo prende le due strette con priorità più alta', () => {
    const r = struttura(['visto'], ['paesi', 'tappe', 'pieno', 'checklist'])
    expect(ids(r)).toEqual(['visto', 'paesi+tappe', 'pieno+checklist'])
  })
  it('una stretta rimasta da sola non si mostra', () => {
    expect(ids(struttura(['visto'], ['paesi']))).toEqual(['visto'])
    expect(ids(struttura([], ['paesi', 'tappe', 'pieno']))).toEqual(['paesi+tappe'])
  })
  it('senza niente la pagina resta con la sola card viola', () => {
    expect(struttura([], [])).toEqual([])
  })
  it('un posto vuoto fa salire quelli sotto, senza buchi', () => {
    const r = struttura(['visto', 'davedere', 'volo', 'dormito'], [])
    expect(ids(r)).toEqual(['visto', 'davedere', 'volo', 'dormito'])
  })
  it('non usa mai la stessa card due volte', () => {
    const r = struttura(['citta', 'visto', 'davedere', 'volo', 'dormito', 'mossi'], ['paesi', 'tappe', 'pieno', 'checklist'])
    const tutte = r.flatMap((x) => (x.tipo === 'larga' ? [x.id] : x.id))
    expect(new Set(tutte).size).toBe(tutte.length)
  })
})

describe('differenzaFusoOre', () => {
  it('Tokyo è 8 ore avanti a Roma a novembre', () => {
    expect(differenzaFusoOre('Asia/Tokyo', 'Europe/Rome', '2026-11-22')).toBe(8)
  })
  it('lo stesso fuso dà zero e un fuso sbagliato non rompe', () => {
    expect(differenzaFusoOre('Europe/Rome', 'Europe/Rome', '2026-11-22')).toBe(0)
    expect(differenzaFusoOre('Boh/Boh', 'Europe/Rome', '2026-11-22')).not.toBeNaN()
  })
})

type Luogo = Trip['places'][number]
type Tappa = Trip['days'][number]['items'][number]
const luogo = (id: string, city: string, lat: number | null, lng: number | null, status = 'planned', category = 'Tempio') => ({ id, name: `Luogo ${id}`, city, category, status, lat, lng }) as unknown as Luogo
const tappa = (id: string, placeId: string | undefined, status = 'done', extra = {}) => ({ id, title: id, kind: 'visit', placeId, status, ...extra }) as unknown as Tappa

function viaggio(extra: Partial<Trip> = {}): Trip {
  return {
    id: 't', title: 'T', destination: 'Giappone', startDate: '2026-11-21', endDate: '2026-11-25', timezone: 'Asia/Tokyo', baseCurrency: 'EUR',
    days: [], places: [], categories: [], expenseCategories: [], stays: [], transports: [], flights: [], budget: [], expenses: [], checklist: [], travelers: [],
    center: { lat: 0, lng: 0 },
    ...extra,
  } as Trip
}

describe('datiDopo: ogni card ha la sua condizione', () => {
  it('un viaggio vuoto non ha nessuna card', () => {
    const d = datiDopo(viaggio())
    expect(Object.keys(d.larghe)).toEqual([])
    expect(Object.keys(d.strette)).toEqual([])
    expect(righeDopo(d)).toEqual([])
  })
  it('le città: almeno 2, con la posizione', () => {
    const una = viaggio({ days: [{ id: 'd1', date: '2026-11-21', city: 'Tokyo', items: [tappa('a', 'p1')] }] as never, places: [luogo('p1', 'Tokyo', 35.6, 139.7)] })
    expect(datiDopo(una).larghe.citta).toBeUndefined()
    const due = viaggio({
      days: [
        { id: 'd1', date: '2026-11-21', city: 'Tokyo', items: [tappa('a', 'p1')] },
        { id: 'd2', date: '2026-11-22', city: 'Nikko', items: [tappa('b', 'p2')] },
      ] as never,
      places: [luogo('p1', 'Chiyoda', 35.6, 139.7), luogo('p2', 'Nikko', 36.75, 139.6)],
    })
    const c = datiDopo(due).larghe.citta
    expect(c?.citta.map((x) => x.nome)).toEqual(['Tokyo', 'Nikko'])
    expect(c?.metri).toBeGreaterThan(100_000)
    const senzaPosizione = viaggio({ days: due.days, places: [luogo('p1', 'Tokyo', null, null), luogo('p2', 'Nikko', null, null)] })
    expect(datiDopo(senzaPosizione).larghe.citta).toBeUndefined()
  })
  it('cosa avete visto: almeno 5 tappe fatte con un tipo; le altre non contano', () => {
    const places = ['1', '2', '3', '4', '5', '6'].map((n) => luogo(n, 'X', 1, 1, 'planned', n === '6' ? '' : 'Tempio'))
    const day = (n: number) => ({ id: `d${n}`, date: '2026-11-21', city: 'X', items: places.slice(0, n).map((p) => tappa(`i${p.id}`, p.id)) })
    expect(datiDopo(viaggio({ days: [day(4)] as never, places })).larghe.visto).toBeUndefined()
    const v = datiDopo(viaggio({ days: [day(6)] as never, places })).larghe.visto
    expect(v?.totale).toBe(5)
    expect(v?.gruppi).toEqual([{ nome: 'Tempio', n: 5 }])
  })
  it('cosa avete visto: sopra le cinque voci le ultime si uniscono', () => {
    const tipi = ['A', 'B', 'C', 'D', 'E', 'F']
    const places = tipi.flatMap((t, k) => [luogo(`${t}1`, 'X', 1, 1, 'done', t), ...(k < 2 ? [luogo(`${t}2`, 'X', 1, 1, 'done', t)] : [])])
    const day = { id: 'd', date: '2026-11-21', city: 'X', items: places.map((p) => tappa(`i${p.id}`, p.id)) }
    const v = datiDopo(viaggio({ days: [day] as never, places })).larghe.visto
    expect(v?.gruppi).toHaveLength(5)
    expect(v?.gruppi[4]).toEqual({ nome: '', n: 2 })
  })
  it('da vedere: solo luoghi mai visitati, al massimo 5 e «altri»', () => {
    const places = Array.from({ length: 7 }, (_, k) => luogo(`p${k}`, 'X', 1, 1, k === 0 ? 'done' : 'planned'))
    const d = datiDopo(viaggio({ places })).larghe.davedere
    expect(d?.nomi).toHaveLength(5)
    expect(d?.altri).toBe(1)
    expect(datiDopo(viaggio({ places: [luogo('a', 'X', 1, 1, 'done'), luogo('b', 'X', 1, 1, 'skipped')] })).larghe.davedere).toBeUndefined()
  })
  it('dove avete dormito: almeno 2 alloggi', () => {
    const s = (id: string, a: string, b: string) => ({ id, name: id, city: 'X', checkIn: a, checkOut: b }) as never
    expect(datiDopo(viaggio({ stays: [s('a', '2026-11-21', '2026-11-24')] })).larghe.dormito).toBeUndefined()
    const d = datiDopo(viaggio({ stays: [s('a', '2026-11-21', '2026-11-24'), s('b', '2026-11-24', '2026-11-26')] })).larghe.dormito
    expect(d?.notti).toBe(5)
    expect(d?.alloggi.map((x) => x.notti)).toEqual([3, 2])
  })
  it('come vi siete mossi: i voli non contano, servono almeno 2 corse', () => {
    const tr = (mode: string) => ({ mode }) as never
    expect(datiDopo(viaggio({ transports: [tr('train'), tr('plane'), tr('plane')] })).larghe.mossi).toBeUndefined()
    const m = datiDopo(viaggio({ transports: [tr('train'), tr('train'), tr('metro')] })).larghe.mossi
    expect(m?.mezzi).toEqual([{ mezzo: 'train', n: 2 }, { mezzo: 'metro', n: 1 }])
  })
  it('in volo: durata in aria e fuso solo se diverso da casa', () => {
    const volo = (da: string, a: string, p: string, r: string, fromTz: string, toTz: string) => ({ legs: [{ from: da, to: a, departAt: p, arriveAt: r, fromTz, toTz }] }) as never
    const d = datiDopo(viaggio({ flights: [volo('FCO', 'HND', '2026-11-21T10:00:00Z', '2026-11-21T23:00:00Z', 'Europe/Rome', 'Asia/Tokyo'), volo('HND', 'FCO', '2026-11-25T10:00:00Z', '2026-11-25T22:00:00Z', 'Asia/Tokyo', 'Europe/Rome')] })).larghe.volo
    expect(d?.voli).toHaveLength(2)
    expect(d?.minuti).toBe(13 * 60 + 12 * 60)
    expect(d?.fusoOre).toBe(8)
    const stesso = datiDopo(viaggio({ timezone: 'Europe/Rome', flights: [volo('FCO', 'MXP', '2026-11-21T10:00:00Z', '2026-11-21T11:00:00Z', 'Europe/Rome', 'Europe/Rome')] })).larghe.volo
    expect(stesso?.fusoOre).toBe(0)
  })
  it('strette: tappe fatte, giorno più pieno, checklist e paesi hanno ognuna la sua soglia', () => {
    const d = (n: number, date: string, status = 'done') => ({ id: date, date, city: 'X', items: Array.from({ length: n }, (_, k) => tappa(`${date}${k}`, undefined, status)) })
    const t = datiDopo(viaggio({ days: [d(2, '2026-11-21'), d(3, '2026-11-22'), d(1, '2026-11-23', 'todo')] as never }))
    expect(t.strette.tappe).toEqual({ fatte: 5, pianificate: 6, pct: 83 })
    expect(t.strette.pieno).toEqual({ date: '2026-11-22', n: 3, citta: 'X' })
    expect(datiDopo(viaggio({ days: [d(2, '2026-11-21'), d(3, '2026-11-22')] as never })).strette.pieno).toBeUndefined()
    const voce = (done: boolean) => ({ done }) as never
    expect(datiDopo(viaggio({ checklist: [voce(true), voce(false), voce(true), voce(true)] })).strette.checklist).toBeUndefined()
    expect(datiDopo(viaggio({ checklist: [voce(true), voce(false), voce(true), voce(true), voce(true)] })).strette.checklist).toEqual({ fatte: 4, totale: 5 })
    expect(datiDopo(viaggio({ checklist: [voce(true), voce(false), voce(true), voce(true), voce(true)] }), { checklist: false }).strette.checklist).toBeUndefined()
    const due = datiDopo(viaggio({ countries: [{ id: 'a', country: 'jp', name: 'Giappone', currency: 'JPY' }, { id: 'b', country: 'KR', name: 'Corea', currency: 'KRW' }] as never }))
    expect(due.strette.paesi).toEqual({ codici: ['JP', 'KR'], valute: 2 })
  })
})
