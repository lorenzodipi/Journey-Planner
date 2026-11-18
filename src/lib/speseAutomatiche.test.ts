// Bug della «Bilancia» con le spese automatiche (alloggi, voli… pagati senza una spesa registrata): l'id della card
// è «stay:uuid» e finiva nel campo uuid del pagamento. Qui il giro completo: card → piano → righe da salvare → pagamenti
// letti dal database → card chiuse.
import { describe, expect, it } from 'vitest'
import { debitiPerSpesa, pianoBilancia } from './debitiSpese'
import { riferimentoSpesa } from './moneyApi'
import { mapSettlements, type SettlementRow } from './moneyData'
import { rimborsiValidi } from './rimborsi'
import { tutteLeSpese } from './spese'
import type { Expense, Stay } from '../types'

const STAY = '06c24448-e114-40ba-97fb-1749fb272259'
const EXP = '2b8f5f3e-0d4a-4c7e-9a51-1d2a3b4c5d6e'
const T = [{ id: 'lorenzo', name: 'Lorenzo' }, { id: 'gaia', name: 'Gaia' }]
const stay: Stay = { id: STAY, name: 'Casa', city: 'Tokyo', checkIn: '2026-11-22', checkOut: '2026-11-26', totalCost: 400, currency: 'EUR', breakfast: false, dinner: false, kitchen: false, booked: true, paid: true, paidBy: 'lorenzo' }
const cena: Expense = { id: EXP, label: 'Cena', amount: 60, currency: 'EUR', paidBy: 'gaia', spentAt: '2026-11-23T12:00:00Z', shares: [{ travelerId: 'lorenzo', weight: 1 }, { travelerId: 'gaia', weight: 1 }] }
const trip = { expenses: [cena], stays: [stay], flights: [], transports: [], bookings: [], travelers: T, timezone: 'Asia/Tokyo', startDate: '2026-11-22' }
const fx = { base: 'EUR' }

describe('pagamenti delle spese automatiche', () => {
  const spese = tutteLeSpese(trip as never)
  it('la card dell\'alloggio ha l\'id della voce', () => {
    expect(spese.map((e) => e.id).sort()).toEqual([EXP, `stay:${STAY}`].sort())
  })
  it('il legame con la card va nel campo giusto: uuid in expense_id, la voce in source, altro da nessuna parte', () => {
    expect(riferimentoSpesa(EXP)).toEqual({ expense_id: EXP })
    expect(riferimentoSpesa(`stay:${STAY}`)).toEqual({ expense_id: null, source: `stay:${STAY}` })
    expect(riferimentoSpesa('stay:non-un-uuid')).toEqual({ expense_id: null })
    expect(riferimentoSpesa(undefined)).toEqual({ expense_id: null })
  })
  it('«Bilancia» chiude la card dell\'alloggio e quella della spesa, e nessuna riga ha un id non valido', () => {
    const prima = debitiPerSpesa(spese, T, fx, 'lorenzo', [], [])
    const piano = pianoBilancia(prima, 'lorenzo', 'gaia')
    expect(piano).not.toBeNull()
    const righe = piano!.righe.map((r) => riferimentoSpesa(r.expenseId))
    const uuid = /^[0-9a-f-]{36}$/
    expect(righe.every((r) => r.expense_id === null || uuid.test(r.expense_id))).toBe(true)
    expect(righe.some((r) => r.source === `stay:${STAY}`)).toBe(true)
    // come tornano dal database dopo la 0053
    const rows: SettlementRow[] = piano!.righe.map((r, i) => {
      const ref = riferimentoSpesa(r.expenseId)
      const [kind, id] = ref.source?.split(':') ?? []
      return { id: `s${i}`, trip_id: 't', from_traveler: r.fromId, to_traveler: r.toId, amount: r.amount, currency: 'EUR', paid_on: '2026-11-28', status: 'confermato', created_by: null, created_at: '2026-11-28T10:00:00Z', decided_by: null, decided_at: null, corrects: null, expense_id: ref.expense_id, source_kind: kind ?? null, source_id: id ?? null, compensation: r.compensation ?? false, group_id: 'g' }
    })
    const settlements = mapSettlements(rows, 't')
    const v = rimborsiValidi({ ...trip, settled: undefined, settlements } as never)
    expect(v.settlements).toHaveLength(settlements.length) // la voce esiste: i pagamenti valgono
    const dopo = debitiPerSpesa(spese, T, fx, 'lorenzo', v.settled, v.settlements)
    expect(dopo.every((d) => d.stato === 'pagato')).toBe(true)
  })
  it('cancellato l\'alloggio, i pagamenti legati non contano più', () => {
    const settlements = mapSettlements([{ id: 'p', trip_id: 't', from_traveler: 'gaia', to_traveler: 'lorenzo', amount: 200, currency: 'EUR', paid_on: '2026-11-28', status: 'confermato', created_by: null, created_at: '2026-11-28T10:00:00Z', decided_by: null, decided_at: null, corrects: null, expense_id: null, source_kind: 'stay', source_id: STAY }], 't')
    expect(settlements[0].expenseId).toBe(`stay:${STAY}`)
    expect(rimborsiValidi({ ...trip, stays: [], settled: undefined, settlements } as never).settlements).toHaveLength(0)
  })
})
