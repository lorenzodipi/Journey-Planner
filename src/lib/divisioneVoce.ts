// Versamenti e divisione del costo di alloggi, voli, trasporti e prenotazioni (migrazione 0059), come nella spesa:
// «Pagata da» con la cifra di ciascun pagante e «Come dividere» in parti uguali, in % o a importi.
// Si salvano sulla voce (non in una spesa a parte): la spesa automatica in Spese li usa. Senza la 0059 (o con le scelte di
// sempre: un pagante, parti uguali) le colonne non si scrivono e tutto resta come prima.

import { round2 } from './money'
import type { ExpensePayer, ExpenseShare, SplitMode } from '../types'

export interface DivisioneVoce {
  /** «In %» o «A importi»; assente = parti uguali */
  splitMode?: Exclude<SplitMode, 'equal'>
  /** la quota di ciascuno: `percent` o `amount` (nella valuta della voce, sul totale) */
  splitShares?: ExpenseShare[]
  /** quanto ha versato ciascun pagante (più paganti); assente = parti uguali tra `payerIds`, o tutto `paidBy` */
  payerAmounts?: ExpensePayer[]
}

export interface DivisioneRow {
  split_mode?: string | null
  split_shares?: unknown
  payer_amounts?: unknown
}

const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined)

/** Le colonne della riga → la divisione (valori sbagliati o mancanti si ignorano: vale la divisione di sempre). */
export function leggiDivisione(r: DivisioneRow): DivisioneVoce {
  const out: DivisioneVoce = {}
  const mode = r.split_mode === 'percent' || r.split_mode === 'fixed' ? r.split_mode : undefined
  if (mode && Array.isArray(r.split_shares)) {
    const shares = r.split_shares
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>
        const id = typeof o.travelerId === 'string' ? o.travelerId : undefined
        const v = numero(mode === 'percent' ? o.percent : o.amount)
        return id && v !== undefined ? ({ travelerId: id, weight: 1, ...(mode === 'percent' ? { percent: v } : { amount: v }) } as ExpenseShare) : null
      })
      .filter((x): x is ExpenseShare => x !== null)
    if (shares.length > 0) {
      out.splitMode = mode
      out.splitShares = shares
    }
  }
  if (Array.isArray(r.payer_amounts)) {
    const payers = r.payer_amounts
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>
        const id = typeof o.travelerId === 'string' ? o.travelerId : undefined
        const v = numero(o.amount)
        return id && v !== undefined ? { travelerId: id, amount: v } : null
      })
      .filter((x): x is ExpensePayer => x !== null)
    if (payers.length > 1) out.payerAmounts = payers
  }
  return out
}

/**
 * Le colonne da scrivere: solo se servono, o per svuotare quelle che c'erano (tornando a parti uguali o a un pagante).
 * Così senza la 0059 il salvataggio con le scelte di sempre funziona come prima.
 */
export function colonneDivisione(i: DivisioneVoce, old?: DivisioneVoce): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (i.splitMode && i.splitShares?.length) {
    out.split_mode = i.splitMode
    out.split_shares = i.splitShares.map((s) => ({ travelerId: s.travelerId, ...(i.splitMode === 'percent' ? { percent: s.percent ?? 0 } : { amount: s.amount ?? 0 }) }))
  } else if (old?.splitMode) {
    out.split_mode = null
    out.split_shares = null
  }
  if (i.payerAmounts && i.payerAmounts.length > 1) out.payer_amounts = i.payerAmounts.map((p) => ({ travelerId: p.travelerId, amount: p.amount }))
  else if (old?.payerAmounts?.length) out.payer_amounts = null
  return out
}

/**
 * La spesa automatica di una voce: chi paga quanto e come si divide `totale` tra `who`.
 * - versamenti: `payerAmounts` se tornano col totale, se no parti uguali tra `payerIds` (l'ultimo prende i centesimi), se no `paidBy`;
 * - divisione: `splitShares` per le persone di `who` (chi non c'è nella divisione salvata ha 0), se no parti uguali.
 */
export function spesaDivisa(
  v: DivisioneVoce & { payerIds?: string[]; paidBy?: string },
  who: readonly string[],
  totale: number,
  everyone: readonly string[],
): { paidBy?: string; payers?: ExpensePayer[]; shares: ExpenseShare[]; splitMode?: SplitMode } {
  const out: { paidBy?: string; payers?: ExpensePayer[]; shares: ExpenseShare[]; splitMode?: SplitMode } = { paidBy: v.paidBy, shares: who.map((travelerId) => ({ travelerId, weight: 1 })) }
  const versati = (v.payerAmounts ?? []).filter((p) => everyone.includes(p.travelerId))
  if (versati.length > 1 && Math.abs(versati.reduce((s, p) => s + p.amount, 0) - totale) < 0.011) {
    out.payers = versati
    out.paidBy = v.paidBy ?? versati[0].travelerId
  } else {
    const list = Array.from(new Set(v.payerIds ?? [])).filter((id) => everyone.includes(id))
    if (list.length >= 2) {
      const part = Math.floor((totale * 100) / list.length) / 100
      out.payers = list.map((travelerId, i) => ({ travelerId, amount: i === list.length - 1 ? round2(totale - part * (list.length - 1)) : part }))
    }
  }
  if (v.splitMode && v.splitShares?.length && who.length > 1) {
    const per = new Map(v.splitShares.map((s) => [s.travelerId, s]))
    out.splitMode = v.splitMode
    out.shares = who.map((travelerId) => {
      const s = per.get(travelerId)
      return { travelerId, weight: 1, ...(v.splitMode === 'percent' ? { percent: s?.percent ?? 0 } : { amount: s?.amount ?? 0 }) }
    })
  }
  return out
}
