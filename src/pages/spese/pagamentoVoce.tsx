// «Pagata da» (con la cifra di ciascun pagante) e «Come dividere» (uguali, in %, a importi) nei fogli di alloggi, voli,
// trasporti e prenotazioni: gli stessi pezzi del foglio spesa (PagantiEditor, DivisioneEditor). «Per chi» resta quello
// del foglio, più in alto. Si salvano sulla voce (0059): vedi `src/lib/divisioneVoce.ts`.
import { useState, type ReactNode } from 'react'
import { parseAmount } from '../../lib/money'
import { checkPayers, checkSplit, splitAmounts } from '../../lib/ripartizione'
import type { DivisioneVoce } from '../../lib/divisioneVoce'
import type { ExpensePayer, ExpenseShare, SplitMode, Trip } from '../../types'
import { DivisioneEditor, PagantiEditor, payersFromRows, sharesFrom, type PayRow } from './SpesaAvanzata'
import { t } from '../../i18n'

const txt = (n: number) => String(n).replace('.', ',')

export interface VocePagata extends DivisioneVoce {
  paidBy?: string
  payerIds?: string[]
}

export interface ValoriPagamento {
  /** un solo pagante; con più paganti vuoto */
  paidBy?: string
  /** tutti i paganti (anche uno solo) */
  payerIds: string[]
  payerAmounts?: ExpensePayer[]
  splitMode?: 'percent' | 'fixed'
  splitShares?: ExpenseShare[]
}

/**
 * Stato e vista di «Pagata da» + «Come dividere» per una voce. `people` = le persone a cui spetta il costo (il «Per chi»
 * del foglio), `totale` = il costo totale (già moltiplicato per le persone se è «a testa»).
 */
export function usePagamentoVoce({ trip, voce, meId, people, totale, currency }: { trip: Trip; voce?: VocePagata; meId?: string; people: string[]; totale: number | null; currency: string }) {
  const all = trip.travelers.map((p) => p.id)
  const [rows, setRows] = useState<PayRow[] | null>(() => {
    if (voce?.payerAmounts && voce.payerAmounts.length > 1) return voce.payerAmounts.map((p) => ({ id: p.travelerId, text: txt(p.amount) }))
    const ids = voce?.payerIds ?? []
    if (ids.length > 1) {
      const parti = totale ? splitAmounts(totale, 'equal', ids.map((travelerId) => ({ travelerId, weight: 1 }))) : []
      return ids.map((id, i) => ({ id, text: parti[i] !== undefined ? txt(parti[i]) : '' }))
    }
    return null
  })
  const [single, setSingle] = useState(voce?.paidBy ?? (voce?.payerIds?.length === 1 ? voce.payerIds[0] : voce ? '' : (meId ?? (all.length === 1 ? all[0] : ''))))
  const [mode, setMode] = useState<SplitMode>(voce?.splitMode ?? 'equal')
  const [vals, setVals] = useState<Record<string, string>>(() =>
    voce?.splitMode && voce.splitShares?.length ? Object.fromEntries(voce.splitShares.map((s) => [s.travelerId, txt(voce.splitMode === 'percent' ? (s.percent ?? 0) : (s.amount ?? 0))])) : {},
  )
  const divisa = mode !== 'equal' && people.length > 1

  /** Il problema da mostrare (chi ha pagato) o null; `false` se il problema è già scritto in rosso nella vista. */
  function controlla(): { paidBy?: string } | false | null {
    if (totale === null || totale === 0) return null
    if (rows) {
      if (rows.some((r) => !r.id) || !checkPayers(totale, payersFromRows(rows), currency).ok) return false
    } else if (!single) return { paidBy: t('Manca chi ha pagato. Scegli una persona.') }
    if (divisa && !checkSplit(mode, totale, sharesFrom(mode, people, vals), currency).ok) return false
    return null
  }

  function valori(): ValoriPagamento {
    const out: ValoriPagamento = { payerIds: [] }
    if (rows && rows.filter((r) => r.id).length > 1) {
      const p = payersFromRows(rows)
      out.payerIds = p.map((x) => x.travelerId)
      out.payerAmounts = p
    } else {
      const solo = rows ? (rows.find((r) => r.id)?.id ?? '') : single
      if (solo) {
        out.paidBy = solo
        out.payerIds = [solo]
      }
    }
    if (divisa) {
      out.splitMode = mode as 'percent' | 'fixed'
      out.splitShares = sharesFrom(mode, people, vals)
    }
    return out
  }

  function vista(errorePagante?: string): ReactNode {
    return (
      <>
        <PagantiEditor trip={trip} total={totale} currency={currency} rows={rows} onRows={setRows} single={single} onSingle={setSingle} error={errorePagante} titolo={t('Chi ha pagato')} />
        {trip.travelers.length > 1 ? (
          <DivisioneEditor trip={trip} meId={meId} mode={mode} onMode={setMode} who={people} onWho={() => undefined} vals={vals} onVals={setVals} total={totale} currency={currency} perChi={false} />
        ) : null}
      </>
    )
  }

  return { controlla, valori, vista, single, rows }
}

/** Il totale della voce: «a testa» per le persone, altrimenti il costo (null se manca). */
export function totaleVoce(cost: string, scope: 'per_person' | 'total', persone: number): number | null {
  const n = cost.trim() ? parseAmount(cost) : null
  if (n === null) return null
  return scope === 'per_person' ? Math.round(n * Math.max(1, persone) * 100) / 100 : n
}
