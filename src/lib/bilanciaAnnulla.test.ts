// «Bilancia» e «Annulla» con pagamenti fatti uno a uno, spese registrate e spese automatiche (alloggi e prenotazioni),
// visti da tutte e due le persone. Lo schema ricalca un caso vero (novembre 2026): pagamenti di un alloggio alla volta,
// un pagamento vecchio senza legame con la card, poi «Bilancia tutte» per i ristoranti rimasti e «Annulla».
// Le due persone devono vedere sempre le stesse card, ognuna dal suo lato.
import { describe, expect, it } from 'vitest'
import { debitiPerSpesa, pianoBilancia, type DebitoSpesa } from './debitiSpese'
import { riferimentoSpesa } from './moneyApi'
import { mapSettlements, type SettlementRow } from './moneyData'
import { rimborsiValidi } from './rimborsi'
import { tutteLeSpese } from './spese'
import type { Booking, Expense, Rimborso, Stay } from '../types'

const L = 'aaaaaaaa-0000-4000-8000-000000000001'
const G = 'aaaaaaaa-0000-4000-8000-000000000002'
const T = [{ id: L, name: 'Persona A' }, { id: G, name: 'Persona B' }]
const fx = { base: 'EUR', local: 'JPY', rate: 0.005692 }
const id = (n: number) => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, '0')}`

const alloggio = (n: number, checkIn: string, totalCost: number, paidBy: string): Stay => ({
  id: id(n), name: `Alloggio ${n}`, city: 'Città', checkIn, checkOut: checkIn, totalCost, currency: 'EUR', breakfast: false, dinner: false, kitchen: false, booked: true, paid: true, paidBy, createdAt: '2026-10-17T12:12:17Z',
})
const ristorante = (n: number, validFrom: string, cost: number): Booking => ({
  id: id(n), type: 'restaurant', title: `Ristorante ${n}`, validFrom, cost, currency: 'JPY', scope: 'per_person', paidBy: L, payerIds: [L], keepOffline: true, createdAt: '2026-11-16T16:12:00Z',
})
const ALLOGGI = [alloggio(1, '2026-11-22', 352.67, L), alloggio(2, '2026-11-26', 304.97, G), alloggio(3, '2026-11-27', 259.78, L), alloggio(4, '2026-11-29', 438.2, L), alloggio(5, '2026-12-04', 162.28, L)]
const RISTORANTI = [ristorante(11, '2026-11-24T03:00:00Z', 7000), ristorante(12, '2026-11-30T10:45:00Z', 9800), ristorante(13, '2026-12-04T10:00:00Z', 11000)]
const assicurazione: Expense = { id: id(21), label: 'Assicurazione', amount: 154.24, currency: 'EUR', paidBy: L, spentAt: '2026-11-01T03:00:00Z', shares: [{ travelerId: L, weight: 1 }, { travelerId: G, weight: 1 }] }
const trip = { expenses: [assicurazione], stays: ALLOGGI, flights: [], transports: [], bookings: RISTORANTI, travelers: T, timezone: 'Asia/Tokyo', startDate: '2026-11-21' }
const spese = tutteLeSpese(trip as never)

let n = 0
/** Una riga di `settlements` come la salva il server: legata alla card con expense_id (spesa) o source (voce). */
function riga(from: string, to: string, amount: number, card: string | undefined, extra: Partial<SettlementRow> = {}): SettlementRow {
  const ref = riferimentoSpesa(card)
  const [kind, src] = ref.source?.split(':') ?? []
  n += 1
  return {
    id: `cccccccc-0000-4000-8000-${String(n).padStart(12, '0')}`, trip_id: 't', from_traveler: from, to_traveler: to, amount, currency: 'EUR', paid_on: '2026-11-19',
    status: 'confermato', created_by: null, created_at: `2026-11-18T21:${String(10 + n).padStart(2, '0')}:00Z`, decided_by: null, decided_at: null, corrects: null,
    expense_id: ref.expense_id, source_kind: kind ?? null, source_id: src ?? null, compensation: false, group_id: null, ...extra,
  }
}

// pagamenti fatti uno a uno (come «Ho pagato» da ogni card), più uno vecchio senza legame con la card
const vecchio = riga(G, L, 77.12, undefined, { created_at: '2026-11-03T10:26:58Z', paid_on: '2026-11-03' })
const unoAUno = [
  vecchio,
  riga(G, L, 81.14, `stay:${id(5)}`),
  riga(G, L, 219.1, `stay:${id(4)}`),
  riga(L, G, 152.49, `stay:${id(2)}`),
  riga(G, L, 129.89, `stay:${id(3)}`),
  riga(G, L, 176.33, `stay:${id(1)}`),
]

function card(rows: SettlementRow[], me: string): DebitoSpesa[] {
  const settlements = mapSettlements(rows, 't')
  const v = rimborsiValidi({ ...trip, settled: undefined, settlements } as never)
  return debitiPerSpesa(spese, T, fx, me, v.settled, v.settlements)
}
const aperte = (c: DebitoSpesa[]) => c.filter((d) => d.stato !== 'pagato').map((d) => `${d.expense.label} ${d.residuo.toFixed(2)}`).sort()
const RISTORANTI_APERTI = ['Ristorante 11 39.84', 'Ristorante 12 55.78', 'Ristorante 13 62.61']

describe('«Bilancia» e «Annulla» visti da tutte e due le persone', () => {
  it('dopo i pagamenti uno a uno restano aperti solo i tre ristoranti, per tutte e due', () => {
    expect(aperte(card(unoAUno, L))).toEqual(RISTORANTI_APERTI)
    expect(aperte(card(unoAUno, G))).toEqual(RISTORANTI_APERTI)
  })

  it('ogni pagamento uno a uno chiude la sua card, non un\'altra', () => {
    const mie = card(unoAUno, L)
    for (const s of ALLOGGI) expect(mie.find((d) => d.expenseId === `stay:${s.id}`)?.stato).toBe('pagato')
    // il pagamento vecchio senza legame va sulla card aperta più vecchia: l'assicurazione
    expect(mie.find((d) => d.expenseId === assicurazione.id)?.stato).toBe('pagato')
  })

  it('«Bilancia tutte» chiude esattamente i tre ristoranti, con i loro importi', () => {
    const piano = pianoBilancia(card(unoAUno, L), L, G)
    expect(piano?.righe.map((r) => `${r.expenseId} ${r.amount}`).sort()).toEqual([`booking:${id(11)} 39.84`, `booking:${id(12)} 55.78`, `booking:${id(13)} 62.61`].sort())
    expect(piano?.compensato).toBe(0)
    expect(piano?.daPagare).toBe(158.23)
  })

  it('dopo «Bilancia» è tutto pagato; «Annulla» torna esattamente a prima, per tutte e due', () => {
    const piano = pianoBilancia(card(unoAUno, L), L, G)!
    const gruppo = piano.righe.map((r) => riga(r.fromId, r.toId, r.amount, r.expenseId, { group_id: 'dddddddd-0000-4000-8000-000000000001', compensation: r.compensation ?? false }))
    const dopo = [...unoAUno, ...gruppo]
    expect(aperte(card(dopo, L))).toEqual([])
    expect(aperte(card(dopo, G))).toEqual([])
    const annullato = [...unoAUno, ...gruppo.map((r) => ({ ...r, status: 'annullato' as const }))]
    expect(aperte(card(annullato, L))).toEqual(RISTORANTI_APERTI)
    expect(aperte(card(annullato, G))).toEqual(RISTORANTI_APERTI)
  })

  it('«Bilancia» con compensazione (debiti in tutte e due le direzioni) e poi «Annulla»: si torna a prima', () => {
    // senza il pagamento dell'alloggio 2 (pagato da B): A deve 152,49 a B e B deve a A i ristoranti
    const senza2 = unoAUno.filter((r) => r.source_id !== id(2))
    const prima = card(senza2, L)
    const piano = pianoBilancia(prima, L, G)!
    expect(piano.compensato).toBe(152.49)
    expect(piano.daPagare).toBe(5.74)
    const gruppo = piano.righe.map((r) => riga(r.fromId, r.toId, r.amount, r.expenseId, { group_id: 'dddddddd-0000-4000-8000-000000000002', compensation: r.compensation ?? false }))
    expect(aperte(card([...senza2, ...gruppo], L))).toEqual([])
    expect(aperte(card([...senza2, ...gruppo], G))).toEqual([])
    const annullato = [...senza2, ...gruppo.map((r) => ({ ...r, status: 'annullato' as const }))]
    expect(aperte(card(annullato, L))).toEqual(aperte(prima))
    expect(aperte(card(annullato, G))).toEqual(aperte(card(senza2, G)))
  })

  it('se i pagamenti si leggono senza il legame con la voce (app di prima del 18/11), le card sbagliano come nel caso vero', () => {
    // le versioni dell'app prima della correzione delle spese automatiche non leggevano source_kind/source_id:
    // i soldi andavano alle card più vecchie e restava aperto l'ultimo alloggio
    const senzaLegame = mapSettlements(unoAUno, 't').map(({ expenseId: _x, ...r }) => r as Rimborso)
    const v = rimborsiValidi({ ...trip, settled: undefined, settlements: senzaLegame } as never)
    const vista = debitiPerSpesa(spese, T, fx, L, v.settled, v.settlements)
    expect(aperte(vista)).toEqual(['Alloggio 5 81.14', 'Ristorante 12 14.48', 'Ristorante 13 62.61'])
    // e la «Bilancia» fatta da lì chiude l'alloggio (già pagato) invece del ristorante 11
    expect(pianoBilancia(vista, L, G)?.righe.map((r) => `${r.expenseId} ${r.amount}`).sort()).toEqual([`booking:${id(12)} 14.48`, `booking:${id(13)} 62.61`, `stay:${id(5)} 81.14`].sort())
  })
})
