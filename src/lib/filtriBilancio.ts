// Filtri e ordinamenti di «Il mio bilancio»: persona, categoria, stato, date, importo; ordine per data, importo, categoria, persona.
import { categoriaDi } from './ricevuta'
import { parseAmount } from './money'
import type { DebitoSpesa } from './debitiSpese'

export type StatoFiltro = 'tutti' | 'aperti' | 'attesa' | 'pagati'
export type OrdinePer = 'predefinito' | 'data' | 'importo' | 'categoria' | 'persona'

export interface FiltriBilancio {
  persona: string
  categoria: string
  stato: StatoFiltro
  /** aaaa-mm-gg, estremi compresi; vuoto = nessun limite */
  dal: string
  al: string
  /** importi come li scrive chi usa l'app (es. «12,50»); vuoto = nessun limite */
  min: string
  max: string
}

export interface Ordine {
  per: OrdinePer
  /** al contrario rispetto al verso naturale (data: recenti prima; importo: alti prima; categoria e persona: A–Z) */
  inverso: boolean
}

export const FILTRI_VUOTI: FiltriBilancio = { persona: '', categoria: '', stato: 'tutti', dal: '', al: '', min: '', max: '' }
export const ORDINE_BASE: Ordine = { per: 'predefinito', inverso: false }

/** Quanti filtri sono attivi (non conta l'ordine). */
export function filtriAttivi(f: FiltriBilancio): number {
  return [f.persona, f.categoria, f.stato !== 'tutti', f.dal || f.al, f.min || f.max].filter(Boolean).length
}

/** Il giorno della spesa come aaaa-mm-gg, lo stesso che si legge sulla card. */
export const giornoDi = (d: DebitoSpesa) => new Intl.DateTimeFormat('sv-SE').format(new Date(d.expense.spentAt))

export function filtraBilancio(righe: readonly DebitoSpesa[], f: FiltriBilancio): DebitoSpesa[] {
  const min = f.min.trim() ? parseAmount(f.min) : null
  const max = f.max.trim() ? parseAmount(f.max) : null
  return righe.filter((d) => {
    if (f.persona && d.otherId !== f.persona) return false
    if (f.categoria && categoriaDi(d.expense).toLowerCase() !== f.categoria.toLowerCase()) return false
    if (f.stato === 'aperti' && !(d.stato === 'da_pagare' || d.stato === 'contestato')) return false
    if (f.stato === 'attesa' && d.stato !== 'in_attesa') return false
    if (f.stato === 'pagati' && d.stato !== 'pagato') return false
    const g = giornoDi(d)
    if (f.dal && g < f.dal) return false
    if (f.al && g > f.al) return false
    if (min !== null && d.importo < min) return false
    if (max !== null && d.importo > max) return false
    return true
  })
}

export function ordinaBilancio(righe: readonly DebitoSpesa[], o: Ordine, nome: (id: string) => string): DebitoSpesa[] {
  if (o.per === 'predefinito') return [...righe]
  const testo = (a: string, b: string) => a.localeCompare(b, 'it', { sensitivity: 'base' })
  const confronta = (a: DebitoSpesa, b: DebitoSpesa) => {
    switch (o.per) {
      case 'data':
        return b.expense.spentAt.localeCompare(a.expense.spentAt)
      case 'importo':
        return b.importo - a.importo
      case 'categoria':
        return testo(categoriaDi(a.expense), categoriaDi(b.expense))
      default:
        return testo(nome(a.otherId), nome(b.otherId))
    }
  }
  // a parità, sempre le più recenti prima
  return [...righe].sort((a, b) => (o.inverso ? -1 : 1) * confronta(a, b) || b.expense.spentAt.localeCompare(a.expense.spentAt))
}
