// Rimborsi con doppia conferma (#51): dichiarazione del debitore, conferma o rifiuto del destinatario.
// I saldi cambiano solo alla conferma, una volta (BR-23). I rimborsi non sono spese.
import type { Rimborso, StatoRimborso, Traveler, Trip } from '../types'
import type { Transfer } from './budget'
import { formatMoney, round2 } from './money'
import { LOCALE, t as tt } from '../i18n'

export const STATO_RIMBORSO: Record<StatoRimborso, string> = {
  in_attesa: tt('In attesa di conferma'),
  confermato: tt('Confermato'),
  rifiutato: tt('Rifiutato'),
  annullato: tt('Annullato'),
  contestato: tt('Contestato'),
}

type ConRimborsi = Pick<Trip, 'expenses' | 'settled' | 'settlements'> & Partial<Pick<Trip, 'stays' | 'flights' | 'transports' | 'bookings'>>
const cacheValidi = new WeakMap<object, { expenses: Trip['expenses']; settled: Trip['settled']; voci: readonly unknown[]; out: Pick<Trip, 'settled' | 'settlements'> }>()
const SENZA = {}

/**
 * I pagamenti che contano ancora. Un pagamento legato a una spesa cancellata non vale più (la spesa «non c'è più»:
 * altrimenti chi aveva pagato risulterebbe in credito). In una «Bilancia» le compensazioni vanno a coppie: se una
 * spesa compensata è cancellata, non vale nessuna compensazione di quel gruppo e le altre spese tornano aperte.
 * Se la spesa torna (ripristino), tornano anche i suoi pagamenti: non si cancella niente.
 * I confermati di tutti (`settled`) li filtra anche il server (0048); qui si tolgono quelli che conosco.
 */
export function rimborsiValidi(trip: ConRimborsi): Pick<Trip, 'settled' | 'settlements'> {
  const chiave = trip.settlements ?? trip.settled ?? SENZA
  const c = cacheValidi.get(chiave)
  const voci = [trip.stays, trip.flights, trip.transports, trip.bookings]
  if (c && c.expenses === trip.expenses && c.settled === trip.settled && c.voci.every((v, i) => v === voci[i])) return c.out
  // le spese registrate e le voci da cui nascono le spese automatiche («stay:uuid»…), come le conosce l'app (0053)
  const vive = new Set([
    ...trip.expenses.map((e) => e.id),
    ...trip.expenses.flatMap((e) => (e.source ? [`${e.source.kind}:${e.source.id}`] : [])),
    ...(trip.stays ?? []).map((x) => `stay:${x.id}`),
    ...(trip.flights ?? []).map((x) => `flight:${x.id}`),
    ...(trip.transports ?? []).map((x) => `transport:${x.id}`),
    ...(trip.bookings ?? []).map((x) => `booking:${x.id}`),
  ])
  const morto = (r: Rimborso) => !!r.expenseId && !vive.has(r.expenseId)
  const rotti = new Set((trip.settlements ?? []).filter((r) => r.compensation && r.groupId && morto(r)).map((r) => r.groupId as string))
  const fuori = new Set((trip.settlements ?? []).filter((r) => morto(r) || (r.compensation && r.groupId && rotti.has(r.groupId))).map((r) => r.id))
  const out: Pick<Trip, 'settled' | 'settlements'> =
    fuori.size === 0
      ? { settled: trip.settled, settlements: trip.settlements }
      : { settled: trip.settled?.filter((r) => !fuori.has(r.id)), settlements: trip.settlements?.filter((r) => !fuori.has(r.id)) }
  cacheValidi.set(chiave, { expenses: trip.expenses, settled: trip.settled, voci, out })
  return out
}

/** Quanto può ancora dichiarare `from` a `to`: il trasferimento del piano tra i due (zero se non devono niente). */
export function residuo(transfers: readonly Transfer[], from: string, to: string): number {
  return round2(transfers.filter((t) => t.from === from && t.to === to).reduce((n, t) => n + t.amount, 0))
}

/** Controllo dell'importo dichiarato: positivo e non oltre il dovuto. */
export function controllaRimborso(amount: number | null, dovuto: number, currency: string): string {
  if (amount === null || !(amount > 0)) return tt('L\'importo non è chiaro: scrivi per esempio 25,00.')
  if (Math.round(amount * 100) > Math.round(dovuto * 100)) return tt('Non puoi dichiarare più di quanto devi: {v0}.', { v0: formatMoney(dovuto, currency) })
  return ''
}

const nome = (travelers: readonly Pick<Traveler, 'id' | 'name'>[], id: string) => travelers.find((t) => t.id === id)?.name.split(/\s+/)[0] ?? '—'
/** Data in cifre (gg/mm/aaaa), come in tutta la sezione rimborsi. Accetta «aaaa-mm-gg» o un istante ISO. */
export const dataNumerica = (d: string) => new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d.length === 10 ? `${d}T12:00:00` : d))
const giorno = dataNumerica

/** «Giorgio dice di averti dato 604,72 € · 28 nov» (per il destinatario). */
/** La richiesta senza la data, per le viste che mettono la data sulla riga sotto (modale «Hai ricevuto il rimborso?»). */
export const chiRichiesta = (r: Pick<Rimborso, 'fromId' | 'amount' | 'currency'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[]) => tt('{v0} dice di averti dato {v1}', { v0: nome(travelers, r.fromId), v1: formatMoney(r.amount, r.currency) })

export function testoRichiesta(r: Pick<Rimborso, 'fromId' | 'amount' | 'currency' | 'paidOn'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[]): string {
  return `${chiRichiesta(r, travelers)} · ${giorno(r.paidOn)}`
}

/** Riga della cronologia vista da `me`: «Hai dato 50,00 € a Giorgio · 28 nov». */
export function testoCronologia(r: Pick<Rimborso, 'fromId' | 'toId' | 'amount' | 'currency' | 'paidOn' | 'corrects'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[], me: string | undefined): string {
  const cifra = formatMoney(r.amount, r.currency)
  const base = r.fromId === me ? tt('Hai dato {cifra} a {v1}', { cifra, v1: nome(travelers, r.toId) }) : tt('{v0} ti ha dato {cifra}', { v0: nome(travelers, r.fromId), cifra })
  return `${r.corrects ? tt('Rettifica: ') : ''}${base} · ${giorno(r.paidOn)}`
}

/** La stessa riga della cronologia, divisa nei tre pezzi che la card mette su righe diverse: chi, quanto, quando (gg/mm/aaaa). */
export function partiCronologia(r: Pick<Rimborso, 'fromId' | 'toId' | 'amount' | 'currency' | 'paidOn' | 'corrects'>, travelers: readonly Pick<Traveler, 'id' | 'name'>[], me: string | undefined) {
  const chi = r.fromId === me ? tt('Hai dato a {v0}', { v0: nome(travelers, r.toId) }) : tt('{v0} ti ha dato', { v0: nome(travelers, r.fromId) })
  return {
    chi: `${r.corrects ? tt('Rettifica: ') : ''}${chi}`,
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
  /** l'altra persona del pagamento */
  altroId: string
  /** quanto mi è arrivato (positivo) o quanto risulta che ho dato io (negativo), compensazioni escluse */
  netto: number
  currency: string
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
      out.push({ key, quando, altroId: altro, netto, currency: cur, testo: netto > 0 ? tt('{chi} ti ha dato {v1}', { chi, v1: formatMoney(netto, cur) }) : tt('{chi} ha segnato che le hai dato {v1}', { chi, v1: formatMoney(-netto, cur) }) })
      continue
    }
    const parti = [
      compensato > 0 ? tt('Compensati {v0}', { v0: formatMoney(compensato, cur) }) : '',
      netto > 0 ? tt('{chi} ti ha dato {v1}', { chi, v1: formatMoney(netto, cur) }) : netto < 0 ? tt('le hai dato {v0}', { v0: formatMoney(-netto, cur) }) : '',
    ].filter(Boolean)
    out.push({ key, quando, altroId: altro, netto, currency: cur, testo: tt('{chi} ha bilanciato le spese con te', { chi }), ...(parti.length ? { dettaglio: parti.join(' · ') } : {}) })
  }
  return out.sort((a, b) => b.quando.localeCompare(a.quando)).map(({ quando: _q, ...x }) => x)
}

/**
 * Riga di riepilogo quando i pagamenti nuovi sono più di uno: quanti sono, con chi e, se sono tutti soldi ricevuti nella
 * stessa valuta, quanto in tutto.
 */
export function riepilogoNovita(nuovi: readonly PagamentoNuovo[], travelers: readonly Pick<Traveler, 'id' | 'name'>[]): { titolo: string; sub?: string } {
  const n = nuovi.length
  const persone = [...new Set(nuovi.map((x) => x.altroId))]
  const chi = persone.length === 1 ? nome(travelers, persone[0]) : undefined
  const valute = new Set(nuovi.map((x) => x.currency))
  const ricevuti = valute.size === 1 && nuovi.every((x) => x.netto > 0)
  const titolo = chi ? (ricevuti ? tt('{n} pagamenti nuovi da {chi}', { n, chi }) : tt('{n} pagamenti nuovi con {chi}', { n, chi })) : tt('{n} pagamenti nuovi', { n })
  if (!ricevuti) return { titolo }
  return { titolo, sub: tt('{v0} in tutto', { v0: formatMoney(round2(nuovi.reduce((t, x) => t + x.netto, 0)), nuovi[0].currency) }) }
}
