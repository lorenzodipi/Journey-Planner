// Rimborsi con doppia conferma (#51): dichiarazione del debitore, conferma o rifiuto del destinatario.
// I saldi cambiano solo alla conferma, una volta (BR-23). I rimborsi non sono spese.
import type { Rimborso, StatoRimborso, Traveler } from '../types'
import type { Transfer } from './budget'
import { formatMoney, round2 } from './money'

export const STATO_RIMBORSO: Record<StatoRimborso, string> = {
  in_attesa: 'In attesa di conferma',
  confermato: 'Confermato',
  rifiutato: 'Rifiutato',
  annullato: 'Annullato',
}

/** Quanto può ancora dichiarare `from` a `to`: il trasferimento del piano tra i due (zero se non devono niente). */
export function residuo(transfers: readonly Transfer[], from: string, to: string): number {
  return round2(transfers.filter((t) => t.from === from && t.to === to).reduce((n, t) => n + t.amount, 0))
}

/** Controllo dell'importo dichiarato: positivo e non oltre il dovuto. */
export function controllaRimborso(amount: number | null, dovuto: number, currency: string): string {
  if (amount === null || !(amount > 0)) return "L'importo non è chiaro: scrivi per esempio 25,00."
  if (Math.round(amount * 100) > Math.round(dovuto * 100)) return `Non puoi dichiarare più di quanto devi: ${formatMoney(dovuto, currency)}.`
  return ''
}

const nome = (travelers: readonly Pick<Traveler, 'id' | 'name'>[], id: string) => travelers.find((t) => t.id === id)?.name.split(/\s+/)[0] ?? '—'
const giorno = (ymd: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(`${ymd}T12:00:00`)).replace(/\./g, '')

/** «Giorgio dice di averti dato 604,72 € · 28 nov» (per il destinatario). */
export function testoRichiesta(r: Pick<Rimborso, 'fromId' | 'amount' | 'currency' | 'paidOn'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[]): string {
  return `${nome(travelers, r.fromId)} dice di averti dato ${formatMoney(r.amount, r.currency)} · ${giorno(r.paidOn)}`
}

/** Riga della cronologia vista da `me`: «Hai dato 50,00 € a Giorgio · 28 nov». */
export function testoCronologia(r: Pick<Rimborso, 'fromId' | 'toId' | 'amount' | 'currency' | 'paidOn' | 'corrects'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[], me: string | undefined): string {
  const cifra = formatMoney(r.amount, r.currency)
  const base = r.fromId === me ? `Hai dato ${cifra} a ${nome(travelers, r.toId)}` : `${nome(travelers, r.fromId)} ti ha dato ${cifra}`
  return `${r.corrects ? 'Rettifica: ' : ''}${base} · ${giorno(r.paidOn)}`
}

/** Richieste in attesa che aspettano la mia decisione. */
export const daDecidere = (list: readonly Rimborso[] | undefined, me: string | undefined): Rimborso[] =>
  me ? (list ?? []).filter((r) => r.status === 'in_attesa' && r.toId === me) : []

/** Richieste che ho dichiarato e non sono ancora state decise. */
export const inAttesaMie = (list: readonly Rimborso[] | undefined, me: string | undefined): Rimborso[] =>
  me ? (list ?? []).filter((r) => r.status === 'in_attesa' && r.fromId === me) : []

/** Più recenti in alto. */
export const cronologia = (list: readonly Rimborso[] | undefined): Rimborso[] => [...(list ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

/**
 * Una rettifica corregge un rimborso confermato con un movimento contrario (da chi aveva ricevuto a chi aveva dato),
 * che a sua volta va confermato. Non supera l'importo originale.
 */
export function bozzaRettifica(orig: Pick<Rimborso, 'id' | 'fromId' | 'toId' | 'amount' | 'currency'>) {
  return { fromId: orig.toId, toId: orig.fromId, amount: orig.amount, currency: orig.currency, corrects: orig.id }
}
