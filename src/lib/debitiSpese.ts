// Debiti e crediti spesa per spesa (#51): per ogni spesa che mi riguarda, quanto devo dare o ricevere da ogni persona,
// e se è già stato pagato. Un rimborso dichiarato da una card è legato alla sua spesa (`expenseId`, migrazione 0042) e
// copre quella; i rimborsi senza spesa (quelli di prima) coprono le spese dalla più vecchia alla più recente.
// Una rettifica confermata toglie dal rimborso che corregge. Prima i confermati, poi quelli in attesa.
import { expenseOwed, expensePaid, expenseBase, settle, type FxContext } from './budget'
import { round2 } from './money'
import { expenseBalance } from './ripartizione'
import { rimborsiValidi } from './rimborsi'
import type { Expense, Rimborso, RimborsoConfermato, Traveler, Trip } from '../types'

export type StatoDebito = 'da_pagare' | 'in_attesa' | 'pagato' | 'contestato'

/** Un rimborso che copre (in tutto o in parte) una card. */
export interface Copertura {
  id: string
  amount: number
}

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
  /** rimborsi confermati che coprono la card (per «Rettifica») */
  confermati: Copertura[]
  /** dato in più di quanto dovuto, tra queste due persone in questo verso (si vede sulla card più recente) */
  eccedenza: number
  /** richieste in attesa che coprono la card (per «Rispondi» o «Annulla») */
  richieste: Copertura[]
  /** pagamenti contestati che coprivano la card: non contano, ma la card lo dice */
  contestato: number
  contestati: Copertura[]
}

const MIN = 0.005

interface Voce {
  id: string
  fromId: string
  toId: string
  amount: number
  expenseId?: string
  ordine: string
}

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
  const grezzi: Omit<DebitoSpesa, 'pagato' | 'inAttesa' | 'residuo' | 'stato' | 'confermati' | 'richieste' | 'eccedenza' | 'contestato' | 'contestati'>[] = []
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

  // rimborsi confermati: quelli completi (le due controparti li vedono) più quelli noti solo come importo
  const tutte = richieste ?? []
  const byId = new Map(tutte.map((r) => [r.id, r]))
  const rettificato = new Map<string, number>()
  for (const r of tutte) if (r.status === 'confermato' && r.corrects) rettificato.set(r.corrects, round2((rettificato.get(r.corrects) ?? 0) + r.amount))
  const voce = (r: Rimborso): Voce => ({ id: r.id, fromId: r.fromId, toId: r.toId, amount: r.amount, ...(r.expenseId ? { expenseId: r.expenseId } : {}), ordine: `${r.paidOn}|${r.createdAt}` })
  const conf: Voce[] = []
  for (const r of tutte) {
    if (r.status !== 'confermato' || r.corrects) continue
    const netto = round2(r.amount - (rettificato.get(r.id) ?? 0))
    if (netto > MIN) conf.push({ ...voce(r), amount: netto })
  }
  for (const c of confermati ?? []) {
    if (byId.has(c.id)) continue
    conf.push({ id: c.id, fromId: c.fromId, toId: c.toId, amount: c.amount, ordine: '' })
  }
  const att: Voce[] = tutte.filter((r) => r.status === 'in_attesa' && !r.corrects).map(voce)
  const contestate: Voce[] = tutte.filter((r) => r.status === 'contestato' && !r.corrects).map(voce)

  const out: DebitoSpesa[] = grezzi.map((g) => ({ ...g, pagato: 0, inAttesa: 0, residuo: g.importo, stato: 'da_pagare' as StatoDebito, confermati: [], richieste: [], eccedenza: 0, contestato: 0, contestati: [] }))
  const dir = (g: DebitoSpesa) => (g.verso === 'devo' ? { fromId: me, toId: g.otherId } : { fromId: g.otherId, toId: me })

  /** Distribuisce i rimborsi sulle card: prima quelle della sua spesa, poi dalla più vecchia. `campo` = dove si somma. */
  function distribuisci(voci: readonly Voce[], campo: 'pagato' | 'inAttesa' | 'contestato') {
    const resto = new Map(voci.map((v) => [v.id, v.amount]))
    const libero = (g: DebitoSpesa) => round2(g.residuo - (campo === 'inAttesa' ? g.inAttesa : campo === 'contestato' ? g.contestato : 0))
    const applica = (g: DebitoSpesa, v: Voce) => {
      const quanto = round2(Math.min(libero(g), resto.get(v.id) ?? 0))
      if (quanto < MIN) return
      resto.set(v.id, round2((resto.get(v.id) ?? 0) - quanto))
      if (campo === 'pagato') {
        g.pagato = round2(g.pagato + quanto)
        g.residuo = round2(g.residuo - quanto)
        g.confermati.push({ id: v.id, amount: quanto })
      } else if (campo === 'inAttesa') {
        g.inAttesa = round2(g.inAttesa + quanto)
        g.richieste.push({ id: v.id, amount: quanto })
      } else {
        g.contestato = round2(g.contestato + quanto)
        g.contestati.push({ id: v.id, amount: quanto })
      }
    }
    const stessa = (g: DebitoSpesa, v: Voce) => {
      const d = dir(g)
      return v.fromId === d.fromId && v.toId === d.toId
    }
    // 1) legati alla spesa
    for (const v of voci) if (v.expenseId) for (const g of out) if (g.expenseId === v.expenseId && stessa(g, v)) applica(g, v)
    // 2) il resto, dalla spesa più vecchia (e dal rimborso più vecchio)
    const ordinate = [...voci].sort((a, b) => a.ordine.localeCompare(b.ordine))
    for (const g of out) for (const v of ordinate) if (stessa(g, v)) applica(g, v)
    // 3) un rimborso confermato più alto del dovuto: l'eccedenza va sulla card più recente di quella coppia e verso,
    //    così si vede e si può rettificare
    if (campo === 'pagato')
      for (const v of voci) {
        const extra = resto.get(v.id) ?? 0
        if (extra < MIN) continue
        const ultima = [...out].reverse().find((g) => stessa(g, v))
        if (!ultima) continue
        ultima.eccedenza = round2(ultima.eccedenza + extra)
        const gia = ultima.confermati.find((c) => c.id === v.id)
        if (gia) gia.amount = round2(gia.amount + extra)
        else ultima.confermati.push({ id: v.id, amount: extra })
        resto.set(v.id, 0)
      }
  }
  distribuisci(conf, 'pagato')
  distribuisci(att, 'inAttesa')
  distribuisci(contestate, 'contestato')
  for (const g of out) g.stato = g.residuo < MIN ? 'pagato' : g.inAttesa >= g.residuo - MIN ? 'in_attesa' : g.contestato > MIN ? 'contestato' : 'da_pagare'

  const rank = (s: StatoDebito) => (s === 'da_pagare' || s === 'contestato' ? 0 : s === 'in_attesa' ? 1 : 2)
  return out.sort((a, b) => rank(a.stato) - rank(b.stato) || b.expense.spentAt.localeCompare(a.expense.spentAt))
}

/** Quanto devo dare e quanto devo ricevere in tutto, sommando le card ancora aperte: senza compensare niente. */
export interface TotaliAperti {
  daDare: number
  daRicevere: number
}

/** Il totale delle card «Da dare» e «Da ricevere» (anche quelle in attesa di conferma). Le voci non si compensano da sole. */
export function totaliAperti(righe: readonly DebitoSpesa[]): TotaliAperti {
  const somma = (verso: DebitoSpesa['verso']) => round2(righe.filter((d) => d.verso === verso).reduce((n, d) => n + d.residuo, 0))
  return { daDare: somma('devo'), daRicevere: somma('devono') }
}

/** I totali di chi usa l'app. `null` se non so chi è. */
export function totaliDelViaggio(
  trip: Pick<Trip, 'travelers' | 'expenses' | 'settled' | 'settlements'>,
  spese: readonly Expense[],
  fx: FxContext,
  me: string | undefined,
): TotaliAperti | null {
  if (!me) return null
  const v = rimborsiValidi(trip)
  return totaliAperti(debitiPerSpesa(spese, trip.travelers, fx, me, v.settled, v.settlements))
}

/** Un pagamento tra due persone; `compensation` = debito che si annulla con un credito, senza soldi che passano di mano. */
export interface RigaPagamento {
  fromId: string
  toId: string
  amount: number
  expenseId?: string
  compensation?: boolean
}

/** Cosa fa «Bilancia tutte le spese» con una persona. */
export interface PianoBilancia {
  otherId: string
  righe: RigaPagamento[]
  /** quanto si annulla tra crediti e debiti (conta una volta sola) */
  compensato: number
  /** soldi che passano di mano: il netto, da chi lo deve */
  daPagare: number
  /** chi versa il netto; `null` se non resta niente da versare */
  chiPaga: 'io' | 'altro' | null
  /** quante card si chiudono */
  voci: number
}

/**
 * «Bilancia tutte le spese» con una persona: chiude tutte le card aperte tra voi due. La parte di debiti e crediti che si
 * annulla diventa compensazione; ciò che resta dalla parte più grande è un pagamento vero (il netto). Le parti già dichiarate
 * e in attesa di conferma restano fuori. `null` se non c'è niente da chiudere.
 */
export function pianoBilancia(righe: readonly DebitoSpesa[], me: string, otherId: string): PianoBilancia | null {
  const libero = (d: DebitoSpesa) => round2(d.residuo - d.inAttesa)
  const aperte = (verso: DebitoSpesa['verso']) =>
    righe
      .filter((d) => d.otherId === otherId && d.verso === verso && libero(d) > MIN)
      .sort((a, b) => a.expense.spentAt.localeCompare(b.expense.spentAt))
  const devo = aperte('devo')
  const devono = aperte('devono')
  const somma = (l: DebitoSpesa[]) => round2(l.reduce((n, d) => n + libero(d), 0))
  const totDevo = somma(devo)
  const totDevono = somma(devono)
  if (totDevo + totDevono < MIN) return null
  const comp = round2(Math.min(totDevo, totDevono))
  const out: RigaPagamento[] = []
  const lato = (l: DebitoSpesa[]) => {
    let resto = comp
    for (const d of l) {
      const dir = d.verso === 'devo' ? { fromId: me, toId: otherId } : { fromId: otherId, toId: me }
      const c = round2(Math.min(libero(d), resto))
      resto = round2(resto - c)
      if (c > MIN) out.push({ ...dir, amount: c, expenseId: d.expenseId, compensation: true })
      const p = round2(libero(d) - c)
      if (p > MIN) out.push({ ...dir, amount: p, expenseId: d.expenseId })
    }
  }
  lato(devo)
  lato(devono)
  const daPagare = round2(Math.abs(totDevo - totDevono))
  return {
    otherId,
    righe: out,
    compensato: comp,
    daPagare,
    chiPaga: daPagare < MIN ? null : totDevo > totDevono ? 'io' : 'altro',
    voci: devo.length + devono.length,
  }
}
