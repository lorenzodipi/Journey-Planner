// La ricevuta della pagina Spese (mock Fa-23…Fa-26, #34): per categoria lo speso, quante voci sono pagate e il
// previsto; i totali Previsto · Già pagato · Da pagare; il saldo di ogni persona e i trasferimenti per pareggiare.
// Categorie (decisione di Lorenzo): sempre Voli, Alloggi, Trasporti, Cibo, Attività (Altro se ha qualcosa),
// più quelle create nel viaggio. Il previsto è la cifra scritta per la categoria (0019) oppure, se manca,
// quanto è già pagato più le voci ancora da pagare (o le vecchie voci previste, se sono di più).
import type { BudgetItem, Category, Trip } from '../types'
import { rimborsiValidi } from './rimborsi'
import { budgetLines, expenseBase, expenseOwed, settle, summarizeExpenses, summarizeLines, toBase, type FxContext, type Transfer } from './budget'
import { BOOKING_BUDGET_CATEGORY } from './bookingMeta'
import { categoryIcon } from './categoryIcon'
import { formatMoney, round2 } from './money'
import type { SpesaVista } from './spese'
import { LINGUA, t as tt } from '../i18n'

export const CATEGORIE_BASE = [
  { label: 'Voli', icon: 'i-cat-airport' },
  { label: 'Alloggi', icon: 'i-cat-stay' },
  { label: 'Trasporti', icon: 'i-cat-transit' },
  { label: 'Cibo', icon: 'i-cat-food' },
  { label: 'Attività', icon: 'i-cat-fun' },
  { label: 'Altro', icon: 'i-cat-pin' },
] as const

const CAT_ICONS = new Set(['shield', 'connection', 'airport', 'cafe', 'castle', 'district', 'food', 'fuel', 'fun', 'grocery', 'museum', 'nature', 'night', 'shopping', 'spa', 'stay', 'temple', 'train', 'transit', 'viewpoint'])

export const catKey = (label: string) => label.trim().toLowerCase()
export const categoriaDi = (e: { category?: string }) => e.category?.trim() || 'Altro'

/** Disco della categoria: quello delle categorie base, altrimenti dedotto dal nome (es. «Shopping»). */
export function iconaCategoria(label: string): string {
  const base = CATEGORIE_BASE.find((c) => catKey(c.label) === catKey(label))
  if (base) return base.icon
  const i = categoryIcon(label)
  return CAT_ICONS.has(i) ? `i-cat-${i}` : 'i-cat-pin'
}

/** Disco grande della categoria (pagina Budget, righe del Dettaglio e dei debiti): lo stesso disegno del foglio della spesa e della ricevuta. */
export function iconaSezione(label: string): string {
  return iconaCategoria(label)
}

/** Disco di una spesa nel Dettaglio: **solo** dalla categoria scelta (il nome non conta: scegli la categoria, vedi la sua icona). */
export function iconaSpesa(e: { label: string; category?: string }): string {
  return iconaSezione(categoriaDi(e))
}

interface Voce {
  category: string
  /** importo totale nella valuta di casa (null = manca il cambio) */
  base: number | null
  paid: boolean
  /** chi divide la voce (vuoto = tutti) */
  who: string[]
}

/** Voli, alloggi, trasporti e documenti con un costo: pagati o ancora da pagare. */
function vociConCosto(trip: Pick<Trip, 'stays' | 'flights' | 'transports' | 'bookings' | 'travelers'>, fx: FxContext): Voce[] {
  const people = (who?: string[]) => Math.max(1, who?.length || trip.travelers.length)
  const tot = (amount: number, scope: 'per_person' | 'total', who?: string[]) => (scope === 'per_person' ? round2(amount * people(who)) : amount)
  const out: Voce[] = []
  const chi = (who?: string[]) => (who?.length ? who : trip.travelers.map((t) => t.id))
  for (const s of trip.stays) if (s.totalCost != null) out.push({ category: 'Alloggi', base: toBase(s.totalCost, s.currency, fx), paid: s.paid, who: chi(s.forTravelers) })
  for (const f of trip.flights) if (f.cost != null) out.push({ category: 'Voli', base: toBase(tot(f.cost, f.scope, f.forTravelers), f.currency, fx), paid: f.paid, who: chi(f.forTravelers) })
  for (const t of trip.transports) if (t.cost != null) out.push({ category: 'Trasporti', base: toBase(tot(t.cost, t.scope, t.forTravelers), t.currency, fx), paid: t.bought, who: chi(t.forTravelers) })
  for (const b of trip.bookings) if (b.cost != null) out.push({ category: BOOKING_BUDGET_CATEGORY[b.type], base: toBase(tot(b.cost, b.scope ?? 'per_person', b.forTravelers), b.currency ?? 'EUR', fx), paid: true, who: chi(b.forTravelers) })
  return out
}

export interface RigaCategoria {
  key: string
  label: string
  icon: string
  /** categoria del viaggio (per il previsto e per rinominarla), se esiste già */
  id?: string
  personale: boolean
  spent: number
  planned: number
  /** il previsto è scritto a mano */
  plannedSet: boolean
  /**
   * Previsto a persona (0056), per chi lo modifica: il suo previsto scritto a mano (se c'è) e la sua quota stimata,
   * quella che conta senza una cifra. Solo con il previsto a persona e chi usa l'app.
   */
  mio?: PrevistoPersona
  /** lo stesso per chi non ha l'account, se posso scriverlo (solo quelli che il database mi fa vedere) */
  altri?: PrevistoPersona[]
  /** voci con costo ancora da pagare */
  unpaid: number
  nSpese: number
  voci: { tot: number; paid: number }
  sub: string
  /** «previsto 1.200,00 €» sulla riga sotto (vuota se non c'è un previsto) */
  previstoTesto: string
}

export interface PrevistoPersona {
  travelerId: string
  valore?: number
  stima: number
}

export interface PersonaSaldo {
  travelerId: string
  /** quanto ha pagato (comprese le sue parti delle voci senza pagante) */
  paid: number
  /** la sua parte di tutte le spese */
  quota: number
  /** > 0 da ricevere, < 0 da dare */
  net: number
}

export interface Ricevuta {
  categorie: RigaCategoria[]
  previsto: number
  pagato: number
  daPagare: number
  persone: PersonaSaldo[]
  transfers: Transfer[]
  unconverted: string[]
}

export type StatoBudget = 'over' | 'paid' | 'ok'

/**
 * Stato di una categoria nel budget: `over` solo se lo speso supera il previsto (oltre il limite); `paid` quando il previsto
 * è raggiunto e non resta nulla da pagare (voci con costo comprese); altrimenti `ok`, senza avvisi. Niente «quasi al limite».
 */
export function statoBudget(c: Pick<RigaCategoria, 'spent' | 'planned' | 'unpaid' | 'voci'>): StatoBudget {
  if (c.planned <= 0) return 'ok'
  const oltre = round2(c.spent - c.planned)
  if (oltre > 0) return 'over'
  return c.spent > 0 && oltre === 0 && c.unpaid === 0 && c.voci.paid === c.voci.tot ? 'paid' : 'ok'
}

const pagat = (n: number, masc: boolean) => (n === 1 ? (masc ? tt('pagato') : tt('pagata')) : masc ? tt('pagati') : tt('pagate'))

/** Prima riga sotto il nome: quante spese e quante pagate. Il previsto sta sulla riga sotto (`previstoTesto`). */
function sottotitolo(c: Omit<RigaCategoria, 'sub' | 'previstoTesto'>): string {
  if (c.spent === 0 && c.voci.tot === 0) return c.planned > 0 ? tt('Ancora vuota') : tt('Ancora vuota · registra una spesa')
  const masc = c.key === 'alloggi' || c.key === 'trasporti'
  const parts: string[] = []
  if (c.key === 'alloggi' && c.voci.tot > 0) parts.push(`${c.voci.tot} ${c.voci.tot === 1 ? tt('soggiorno') : tt('soggiorni')}`)
  else if (c.nSpese > 0 && (c.voci.tot === 0 || c.key === 'voli')) parts.push(`${c.nSpese} ${c.nSpese === 1 ? tt('spesa') : tt('spese')}`)
  if (c.voci.tot > 0) parts.push(tt('{paid} di {tot} {v2}', { paid: c.voci.paid, tot: c.voci.tot, v2: pagat(c.voci.tot, masc) }))
  return parts.join(' · ')
}

/**
 * La ricevuta tra tutti oppure, con `io`, solo la parte di una persona: per categoria la sua quota delle spese e delle voci
 * che divide (pagate e da pagare), il suo previsto (quello che ha scritto o la sua quota stimata), i totali suoi e solo il
 * suo saldo con i trasferimenti che lo riguardano. Tra tutti il previsto è la somma di quelli di ognuno.
 */
export function ricevuta(
  trip: Pick<Trip, 'stays' | 'flights' | 'transports' | 'bookings' | 'travelers' | 'budget' | 'baseCurrency' | 'expenses' | 'settled' | 'settlements' | 'previsti'> & { expenseCategories: Category[] },
  spese: SpesaVista[],
  fx: FxContext,
  io?: string,
  /** chi usa l'app, per modificare il suo previsto anche nella ricevuta di tutti (previsto a persona, 0056) */
  me: string | undefined = io,
): Ricevuta {
  const n = Math.max(1, trip.travelers.length)
  const map = categorieDi(trip, spese, fx, io)
  const unconverted = map.unconverted
  const P = trip.previsti
  if (P) {
    // previsto a persona: per ognuno il suo previsto scritto, altrimenti la quota di quello di prima (diviso tra tutti)
    // o la sua quota stimata dai costi. Tra tutti è la somma; senza nessun previsto scritto resta il calcolo di sempre.
    const per = new Map<string, Map<string, Riga>>()
    const stimaDi = (tid: string, k: string, cat?: Category): number => {
      if (cat?.planned != null) return round2(cat.planned / n)
      if (!per.has(tid)) per.set(tid, categorieDi(trip, spese, fx, tid).righe)
      return per.get(tid)?.get(k)?.planned ?? 0
    }
    const scrivibili = trip.travelers.filter((t) => t.id !== me && !t.userId)
    for (const c of map.righe.values()) {
      const cat = trip.expenseCategories.find((x) => x.id === c.id)
      const righe = (c.id && P.righe[c.id]) || {}
      const tot = c.id ? P.totali[c.id] : undefined
      if (io) {
        const v = righe[io]
        if (v !== undefined) {
          c.planned = v
          c.plannedSet = true
        }
      } else if (tot && tot.chi.length > 0) {
        c.planned = round2(tot.totale + trip.travelers.filter((t) => !tot.chi.includes(t.id)).reduce((a, t) => a + stimaDi(t.id, c.key, cat), 0))
        c.plannedSet = true
      }
      if (me && trip.travelers.some((t) => t.id === me)) {
        c.mio = { travelerId: me, valore: righe[me], stima: stimaDi(me, c.key, cat) }
        c.altri = scrivibili.map((t) => ({ travelerId: t.id, valore: righe[t.id], stima: stimaDi(t.id, c.key, cat) }))
      }
    }
  }

  const order = (c: Omit<RigaCategoria, 'sub' | 'previstoTesto'>) => {
    const i = CATEGORIE_BASE.findIndex((b) => catKey(b.label) === c.key)
    return c.key === 'altro' ? 1000 : i >= 0 ? i : 100
  }
  const categorie = [...map.righe.values()]
    .filter((c) => (c.key === 'altro' ? c.spent > 0 || c.voci.tot > 0 || c.plannedSet : true))
    .sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label, LINGUA))
    .map((c) => ({ ...c, sub: sottotitolo(c), previstoTesto: c.planned > 0 ? tt('Previsto {v0}', { v0: formatMoney(c.planned, trip.baseCurrency) }) : '' }))

  const summary = summarizeExpenses(spese, trip.travelers, fx, rimborsiValidi(trip).settled)
  summary.unconverted.forEach((u) => unconverted.add(u))
  const persone = trip.travelers.map((t) => {
    const bal = summary.balances.find((b) => b.travelerId === t.id)
    const quota = summary.spentBy.find((s) => s.travelerId === t.id)?.amount ?? 0
    const net = bal?.net ?? 0
    return { travelerId: t.id, quota, net, paid: round2(net - (bal?.refunds ?? 0) + quota) }
  })
  const sum = (f: (c: RigaCategoria) => number) => round2(categorie.reduce((tot, c) => tot + f(c), 0))
  const transfers = settle(persone)
  return {
    categorie,
    previsto: sum((c) => c.planned),
    pagato: io ? sum((c) => c.spent) : summary.total,
    daPagare: sum((c) => c.unpaid),
    persone: io ? persone.filter((p) => p.travelerId === io) : persone,
    transfers: io ? transfers.filter((x) => x.from === io || x.to === io) : transfers,
    unconverted: [...unconverted].sort(),
  }
}

type Riga = Omit<RigaCategoria, 'sub' | 'previstoTesto'>

/**
 * Categorie con speso, voci e previsto (scritto per la categoria o calcolato) di tutti oppure, con `io`, di una persona.
 * È il calcolo di sempre; il previsto a persona (0056) si aggiunge sopra, in `ricevuta`.
 */
function categorieDi(
  trip: Pick<Trip, 'stays' | 'flights' | 'transports' | 'bookings' | 'travelers' | 'budget'> & { expenseCategories: Category[] },
  spese: SpesaVista[],
  fx: FxContext,
  io?: string,
): { righe: Map<string, Riga>; unconverted: Set<string> } {
  const n = Math.max(1, trip.travelers.length)
  const map = new Map<string, Riga>()
  const slot = (label: string, cat?: Category) => {
    const key = catKey(label)
    let c = map.get(key)
    if (!c) {
      const base = CATEGORIE_BASE.some((b) => catKey(b.label) === key)
      c = { key, label: label.trim(), icon: iconaCategoria(label), personale: !base, spent: 0, planned: 0, plannedSet: false, unpaid: 0, nSpese: 0, voci: { tot: 0, paid: 0 } }
      map.set(key, c)
    }
    if (cat) {
      c.id = cat.id
      if (cat.planned != null) {
        c.planned = io ? round2(cat.planned / n) : cat.planned
        c.plannedSet = true
      }
    }
    return c
  }
  for (const b of CATEGORIE_BASE) slot(b.label)
  for (const c of trip.expenseCategories) slot(c.label, c)

  const unconverted = new Set<string>()
  for (const e of spese) {
    const b = io ? quotaMia(e, trip.travelers, fx, io) : expenseBase(e, fx)
    if (io && b === 0) continue
    const c = slot(categoriaDi(e))
    c.nSpese++
    if (b === null) unconverted.add(e.currency)
    else c.spent = round2(c.spent + b)
  }
  for (const v of vociConCosto(trip, fx)) {
    if (io && !v.who.includes(io)) continue
    const c = slot(v.category)
    c.voci.tot++
    const base = io && v.base !== null ? round2(v.base / Math.max(1, v.who.length)) : v.base
    if (v.paid) c.voci.paid++
    else if (base !== null) c.unpaid = round2(c.unpaid + base)
  }
  // vecchie voci previste («Aggiungi costo previsto»): contano nel previsto calcolato
  const items = new Map<string, BudgetItem[]>()
  for (const i of trip.budget) {
    const k = catKey(i.category?.trim() || 'Altro')
    items.set(k, [...(items.get(k) ?? []), i])
  }
  for (const [k, list] of items) {
    const c = map.get(k) ?? slot(list[0].category?.trim() || 'Altro')
    const sl = summarizeLines(budgetLines(list), trip.travelers, fx)
    if (!c.plannedSet) c.planned = io ? (sl.perTraveler.find((p) => p.travelerId === io)?.planned ?? 0) : sl.planned
  }
  for (const c of map.values()) if (!c.plannedSet) c.planned = round2(Math.max(c.spent + c.unpaid, c.planned))
  return { righe: map, unconverted }
}

/** Quota di una persona in una spesa, nella valuta di casa (null = manca il cambio). */
function quotaMia(e: SpesaVista, travelers: Trip['travelers'], fx: FxContext, io: string): number | null {
  const owed = expenseOwed(e, travelers, fx)
  return owed ? round2(owed.filter((o) => o.travelerId === io).reduce((tot, o) => tot + o.amount, 0)) : null
}

/** Categoria di spesa per il costo di una tappa, dalla categoria del luogo (Ristorante → Cibo, Tempio → Attività…). */
export function categoriaDaTappa(label: string): string {
  switch (categoryIcon(label)) {
    case 'food':
    case 'cafe':
    case 'grocery':
      return 'Cibo'
    case 'stay':
      return 'Alloggi'
    case 'train':
    case 'transit':
    case 'airport':
      return 'Trasporti'
    default:
      return 'Attività'
  }
}
