// Debiti e crediti spesa per spesa (#51): per ogni spesa che mi riguarda, quanto devo dare o ricevere da ogni persona,
// e se è già stato pagato. I rimborsi del database sono importi tra due persone, non legati a una spesa: li assegno
// alle spese dalla più vecchia alla più recente (prima i confermati, poi quelli in attesa).
import { expenseOwed, expensePaid, expenseBase, settle, type FxContext } from './budget'
import { round2 } from './money'
import { expenseBalance } from './ripartizione'
import type { Expense, Rimborso, RimborsoConfermato, Traveler } from '../types'

export type StatoDebito = 'da_pagare' | 'in_attesa' | 'pagato'

export interface DebitoSpesa {
  expenseId: string
  expense: Expense
  /** l'altra persona */
  otherId: string
  /** devo: io devo dare a `otherId`; devono: `otherId` deve dare a me */
  verso: 'devo' | 'devono'
  /** importo della spesa tra noi due (valuta base) */
  importo: number
  /** già pagato e confermato */
  pagato: number
  /** dichiarato e in attesa di conferma */
  inAttesa: number
  /** ancora da pagare (importo − pagato) */
  residuo: number
  stato: StatoDebito
}

const MIN = 0.005

/** Spese (con un pagante) in cui io sono debitore o creditore con un'altra persona, dal più vecchio al più recente. */
export function debitiPerSpesa(
  spese: readonly Expense[],
  travelers: readonly Pick<Traveler, 'id'>[],
  fx: FxContext,
  me: string | undefined,
  confermati: readonly RimborsoConfermato[] | undefined,
  richieste: readonly Rimborso[] | undefined,
): DebitoSpesa[] {
  if (!me) return []
  const grezzi: Omit<DebitoSpesa, 'pagato' | 'inAttesa' | 'residuo' | 'stato'>[] = []
  for (const e of [...spese].sort((a, b) => a.spentAt.localeCompare(b.spentAt))) {
    if (expenseBase(e, fx) === null) continue
    const owed = expenseOwed(e, travelers, fx)
    const paid = expensePaid(e, fx)
    if (!owed || !paid || paid.length === 0) continue
    const bal = expenseBalance(
      paid.map((p) => ({ travelerId: p.travelerId, amount: p.amount })),
      owed,
    )
    for (const t of settle(bal)) {
      if (t.from === me) grezzi.push({ expenseId: e.id, expense: e, otherId: t.to, verso: 'devo', importo: t.amount })
      else if (t.to === me) grezzi.push({ expenseId: e.id, expense: e, otherId: t.from, verso: 'devono', importo: t.amount })
    }
  }
  const somma = (list: readonly { fromId: string; toId: string; amount: number }[], from: string, to: string) =>
    round2(list.filter((r) => r.fromId === from && r.toId === to).reduce((n, r) => n + r.amount, 0))
  const attesa = (richieste ?? []).filter((r) => r.status === 'in_attesa')
  const out: DebitoSpesa[] = []
  const altri = Array.from(new Set(grezzi.map((g) => g.otherId)))
  for (const other of altri) {
    // saldo dei rimborsi confermati tra noi due: positivo = ho dato io, negativo = ha dato l'altro
    const netto = round2(somma(confermati ?? [], me, other) - somma(confermati ?? [], other, me))
    const pool = { devo: Math.max(0, netto), devono: Math.max(0, -netto) }
    const sospesi = { devo: somma(attesa, me, other), devono: somma(attesa, other, me) }
    for (const g of grezzi.filter((x) => x.otherId === other)) {
      const dato = round2(Math.min(g.importo, pool[g.verso]))
      pool[g.verso] = round2(pool[g.verso] - dato)
      const residuo = round2(g.importo - dato)
      const inAtt = round2(Math.min(residuo, sospesi[g.verso]))
      sospesi[g.verso] = round2(sospesi[g.verso] - inAtt)
      const stato: StatoDebito = residuo < MIN ? 'pagato' : inAtt >= residuo - MIN ? 'in_attesa' : 'da_pagare'
      out.push({ ...g, pagato: dato, inAttesa: inAtt, residuo, stato })
    }
  }
  const rank = (s: StatoDebito) => (s === 'da_pagare' ? 0 : s === 'in_attesa' ? 1 : 2)
  return out.sort((a, b) => rank(a.stato) - rank(b.stato) || b.expense.spentAt.localeCompare(a.expense.spentAt))
}
