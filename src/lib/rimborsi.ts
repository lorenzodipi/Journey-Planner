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
  contestato: 'Contestato',
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
/** Data in cifre (gg/mm/aaaa), come in tutta la sezione rimborsi. Accetta «aaaa-mm-gg» o un istante ISO. */
export const dataNumerica = (d: string) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d.length === 10 ? `${d}T12:00:00` : d))
const giorno = dataNumerica

/** «Giorgio dice di averti dato 604,72 € · 28 nov» (per il destinatario). */
/** La richiesta senza la data, per le viste che mettono la data sulla riga sotto (modale «Hai ricevuto il rimborso?»). */
export const chiRichiesta = (r: Pick<Rimborso, 'fromId' | 'amount' | 'currency'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[]) => `${nome(travelers, r.fromId)} dice di averti dato ${formatMoney(r.amount, r.currency)}`

export function testoRichiesta(r: Pick<Rimborso, 'fromId' | 'amount' | 'currency' | 'paidOn'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[]): string {
  return `${chiRichiesta(r, travelers)} · ${giorno(r.paidOn)}`
}

/** Riga della cronologia vista da `me`: «Hai dato 50,00 € a Giorgio · 28 nov». */
export function testoCronologia(r: Pick<Rimborso, 'fromId' | 'toId' | 'amount' | 'currency' | 'paidOn' | 'corrects'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[], me: string | undefined): string {
  const cifra = formatMoney(r.amount, r.currency)
  const base = r.fromId === me ? `Hai dato ${cifra} a ${nome(travelers, r.toId)}` : `${nome(travelers, r.fromId)} ti ha dato ${cifra}`
  return `${r.corrects ? 'Rettifica: ' : ''}${base} · ${giorno(r.paidOn)}`
}

/** La stessa riga della cronologia, divisa nei tre pezzi che la card mette su righe diverse: chi, quanto, quando (gg/mm/aaaa). */
export function partiCronologia(r: Pick<Rimborso, 'fromId' | 'toId' | 'amount' | 'currency' | 'paidOn' | 'corrects'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[], me: string | undefined) {
  const chi = r.fromId === me ? `Hai dato a ${nome(travelers, r.toId)}` : `${nome(travelers, r.fromId)} ti ha dato`
  return {
    chi: `${r.corrects ? 'Rettifica: ' : ''}${chi}`,
    importo: formatMoney(r.amount, r.currency),
    data: dataNumerica(r.paidOn),
  }
}

/** Richieste in attesa che aspettano la mia decisione. */
export const daDecidere = (list: readonly Rimborso[] | undefined, me: string | undefined): Rimborso[] =>
  me ? (list ?? []).filter((r) => r.status === 'in_attesa' && r.toId === me) : []

/** Richieste che ho dichiarato e non sono ancora state decise. */
export const inAttesaMie = (list: readonly Rimborso[] | undefined, me: string | undefined): Rimborso[] =>
  me ? (list ?? []).filter((r) => r.status === 'in_attesa' && r.fromId === me) : []

/** Più recenti in alto. */
export const cronologia = (list: readonly Rimborso[] | undefined): Rimborso[] => [...(list ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

/** Un pagamento che qualcun altro ha registrato e che riguarda me: da far vedere finché non lo segno come visto. */
export interface PagamentoNuovo {
  /** `groupId` della «Bilancia» o id del singolo pagamento: è ciò che si segna come visto */
  key: string
  testo: string
  dettaglio?: string
}

/**
 * Pagamenti registrati da altri negli ultimi `giorni` giorni, ancora da vedere. Sono già validi: l'avviso serve a saperlo e,
 * se non torna, a contestarli dal menu della voce in «Il mio bilancio».
 */
export function pagamentiNuovi(
  list: readonly Rimborso[] | undefined,
  travelers: readonly Pick<Traveler, 'id' | 'name'>[],
  me: string | undefined,
  meUser: string | undefined,
  visti: ReadonlySet<string>,
  adesso: Date,
  giorni = 7,
): PagamentoNuovo[] {
  if (!me) return []
  const da = adesso.getTime() - giorni * 86_400_000
  const gruppi = new Map<string, Rimborso[]>()
  for (const r of list ?? []) {
    if (r.status !== 'confermato' || r.corrects || (r.fromId !== me && r.toId !== me)) continue
    if (!r.createdBy || r.createdBy === meUser || new Date(r.createdAt).getTime() < da) continue
    const k = r.groupId ?? r.id
    if (visti.has(k)) continue
    gruppi.set(k, [...(gruppi.get(k) ?? []), r])
  }
  const out: (PagamentoNuovo & { quando: string })[] = []
  for (const [key, righe] of gruppi) {
    const altro = righe[0].fromId === me ? righe[0].toId : righe[0].fromId
    const chi = nome(travelers, altro)
    const cur = righe[0].currency
    const compensato = round2(righe.filter((r) => r.compensation).reduce((n, r) => n + r.amount, 0) / 2)
    const netto = round2(righe.filter((r) => !r.compensation).reduce((n, r) => n + (r.toId === me ? r.amount : -r.amount), 0))
    const quando = righe.map((r) => r.createdAt).sort().at(-1) as string
    if (compensato === 0 && righe.length === 1) {
      out.push({ key, quando, testo: netto > 0 ? `${chi} ti ha dato ${formatMoney(netto, cur)}` : `${chi} ha segnato che le hai dato ${formatMoney(-netto, cur)}` })
      continue
    }
    const parti = [
      compensato > 0 ? `Compensati ${formatMoney(compensato, cur)}` : '',
      netto > 0 ? `${chi} ti ha dato ${formatMoney(netto, cur)}` : netto < 0 ? `le hai dato ${formatMoney(-netto, cur)}` : '',
    ].filter(Boolean)
    out.push({ key, quando, testo: `${chi} ha bilanciato le spese con te`, ...(parti.length ? { dettaglio: parti.join(' · ') } : {}) })
  }
  return out.sort((a, b) => b.quando.localeCompare(a.quando)).map(({ quando: _q, ...x }) => x)
}
