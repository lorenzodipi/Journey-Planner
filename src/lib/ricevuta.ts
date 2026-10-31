// La ricevuta della pagina Spese (mock Fa-23…Fa-26, #34): per categoria lo speso, quante voci sono pagate e il
// previsto; i totali Previsto · Già pagato · Da pagare; il saldo di ogni persona e i trasferimenti per pareggiare.
// Categorie (decisione di Lorenzo): sempre Voli, Alloggi, Trasporti, Cibo, Attività (Altro se ha qualcosa),
// più quelle create nel viaggio. Il previsto è la cifra scritta per la categoria (0019) oppure, se manca,
// quanto è già pagato più le voci ancora da pagare (o le vecchie voci previste, se sono di più).
import type { BudgetItem, Category, Trip } from '../types'
import { budgetLines, expenseBase, settle, summarizeExpenses, summarizeLines, toBase, type FxContext, type Transfer } from './budget'
import { BOOKING_BUDGET_CATEGORY } from './bookingMeta'
import { categoryIcon } from './categoryIcon'
import { formatMoney, round2 } from './money'
import type { SpesaVista } from './spese'

export const CATEGORIE_BASE = [
  { label: 'Voli', icon: 'i-cat-airport' },
  { label: 'Alloggi', icon: 'i-cat-stay' },
  { label: 'Trasporti', icon: 'i-cat-transit' },
  { label: 'Cibo', icon: 'i-cat-food' },
  { label: 'Attività', icon: 'i-cat-fun' },
  { label: 'Altro', icon: 'i-cat-pin' },
] as const

const CAT_ICONS = new Set(['airport', 'cafe', 'castle', 'district', 'food', 'fuel', 'fun', 'grocery', 'museum', 'nature', 'night', 'shopping', 'spa', 'stay', 'temple', 'train', 'transit', 'viewpoint'])

export const catKey = (label: string) => label.trim().toLowerCase()
export const categoriaDi = (e: { category?: string }) => e.category?.trim() || 'Altro'

/** Disco della categoria: quello delle categorie base, altrimenti dedotto dal nome (es. «Shopping»). */
export function iconaCategoria(label: string): string {
  const base = CATEGORIE_BASE.find((c) => catKey(c.label) === catKey(label))
  if (base) return base.icon
  const i = categoryIcon(label)
  return CAT_ICONS.has(i) ? `i-cat-${i}` : 'i-cat-pin'
}

const SEZIONI: Record<string, string> = { voli: 'i-tra-plane', alloggi: 'i-sez-bed', trasporti: 'i-tra-train', cibo: 'i-sez-food', 'attività': 'i-sez-ticket', altro: 'i-sez-bag' }

/** Disco grande della categoria (pagina Budget e righe del Dettaglio, mock Fa-27/Fa-34). */
export function iconaSezione(label: string): string {
  return SEZIONI[catKey(label)] ?? iconaCategoria(label)
}

/** Disco di una spesa nel Dettaglio: dal nome se dice qualcosa («Caffè», «Treno»), se no dalla categoria. */
export function iconaSpesa(e: { label: string; category?: string }): string {
  const i = categoryIcon(e.label)
  return i !== 'pin' && CAT_ICONS.has(i) ? `i-cat-${i}` : iconaSezione(categoriaDi(e))
}

interface Voce {
  category: string
  /** importo totale nella valuta di casa (null = manca il cambio) */
  base: number | null
  paid: boolean
}

/** Voli, alloggi, trasporti e documenti con un costo: pagati o ancora da pagare. */
function vociConCosto(trip: Pick<Trip, 'stays' | 'flights' | 'transports' | 'bookings' | 'travelers'>, fx: FxContext): Voce[] {
  const people = (who?: string[]) => Math.max(1, who?.length || trip.travelers.length)
  const tot = (amount: number, scope: 'per_person' | 'total', who?: string[]) => (scope === 'per_person' ? round2(amount * people(who)) : amount)
  const out: Voce[] = []
  for (const s of trip.stays) if (s.totalCost != null) out.push({ category: 'Alloggi', base: toBase(s.totalCost, s.currency, fx), paid: s.paid })
  for (const f of trip.flights) if (f.cost != null) out.push({ category: 'Voli', base: toBase(tot(f.cost, f.scope, f.forTravelers), f.currency, fx), paid: f.paid })
  for (const t of trip.transports) if (t.cost != null) out.push({ category: 'Trasporti', base: toBase(tot(t.cost, t.scope, t.forTravelers), t.currency, fx), paid: t.bought })
  for (const b of trip.bookings) if (b.cost != null) out.push({ category: BOOKING_BUDGET_CATEGORY[b.type], base: toBase(tot(b.cost, b.scope ?? 'per_person', b.forTravelers), b.currency ?? 'EUR', fx), paid: true })
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
  /** voci con costo ancora da pagare */
  unpaid: number
  nSpese: number
  voci: { tot: number; paid: number }
  sub: string
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

const pagat = (n: number, masc: boolean) => (n === 1 ? (masc ? 'pagato' : 'pagata') : masc ? 'pagati' : 'pagate')

function sottotitolo(c: Omit<RigaCategoria, 'sub'>, currency: string): string {
  const prev = c.planned > 0 ? `previsto ${formatMoney(c.planned, currency)}` : ''
  if (c.spent === 0 && c.voci.tot === 0) return ['Ancora vuota', prev || 'registra una spesa'].join(' · ')
  const masc = c.key === 'alloggi' || c.key === 'trasporti'
  const parts: string[] = []
  if (c.key === 'alloggi' && c.voci.tot > 0) parts.push(`${c.voci.tot} ${c.voci.tot === 1 ? 'soggiorno' : 'soggiorni'}`)
  else if (c.nSpese > 0 && (c.voci.tot === 0 || c.key === 'voli')) parts.push(`${c.nSpese} ${c.nSpese === 1 ? 'spesa' : 'spese'}`)
  if (c.voci.tot > 0) parts.push(`${c.voci.paid} di ${c.voci.tot} ${pagat(c.voci.tot, masc)}`)
  if (prev) parts.push(prev)
  return parts.join(' · ')
}

export function ricevuta(
  trip: Pick<Trip, 'stays' | 'flights' | 'transports' | 'bookings' | 'travelers' | 'budget' | 'baseCurrency' | 'settled'> & { expenseCategories: Category[] },
  spese: SpesaVista[],
  fx: FxContext,
): Ricevuta {
  const map = new Map<string, Omit<RigaCategoria, 'sub'>>()
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
        c.planned = cat.planned
        c.plannedSet = true
      }
    }
    return c
  }
  for (const b of CATEGORIE_BASE) slot(b.label)
  for (const c of trip.expenseCategories) slot(c.label, c)

  const unconverted = new Set<string>()
  for (const e of spese) {
    const c = slot(categoriaDi(e))
    c.nSpese++
    const b = expenseBase(e, fx)
    if (b === null) unconverted.add(e.currency)
    else c.spent = round2(c.spent + b)
  }
  for (const v of vociConCosto(trip, fx)) {
    const c = slot(v.category)
    c.voci.tot++
    if (v.paid) c.voci.paid++
    else if (v.base !== null) c.unpaid = round2(c.unpaid + v.base)
  }
  // vecchie voci previste («Aggiungi costo previsto»): contano nel previsto calcolato
  const items = new Map<string, BudgetItem[]>()
  for (const i of trip.budget) {
    const k = catKey(i.category?.trim() || 'Altro')
    items.set(k, [...(items.get(k) ?? []), i])
  }
  for (const [k, list] of items) {
    const c = map.get(k) ?? slot(list[0].category?.trim() || 'Altro')
    if (!c.plannedSet) c.planned = summarizeLines(budgetLines(list), trip.travelers, fx).planned
  }
  for (const c of map.values()) if (!c.plannedSet) c.planned = round2(Math.max(c.spent + c.unpaid, c.planned))

  const order = (c: Omit<RigaCategoria, 'sub'>) => {
    const i = CATEGORIE_BASE.findIndex((b) => catKey(b.label) === c.key)
    return c.key === 'altro' ? 1000 : i >= 0 ? i : 100
  }
  const categorie = [...map.values()]
    .filter((c) => (c.key === 'altro' ? c.spent > 0 || c.voci.tot > 0 || c.plannedSet : true))
    .sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label, 'it'))
    .map((c) => ({ ...c, sub: sottotitolo(c, trip.baseCurrency) }))

  const summary = summarizeExpenses(spese, trip.travelers, fx, trip.settled)
  summary.unconverted.forEach((u) => unconverted.add(u))
  const persone = trip.travelers.map((t) => {
    const bal = summary.balances.find((b) => b.travelerId === t.id)
    const quota = summary.spentBy.find((s) => s.travelerId === t.id)?.amount ?? 0
    const net = bal?.net ?? 0
    return { travelerId: t.id, quota, net, paid: round2(net - (bal?.refunds ?? 0) + quota) }
  })
  const sum = (f: (c: RigaCategoria) => number) => round2(categorie.reduce((n, c) => n + f(c), 0))
  return {
    categorie,
    previsto: sum((c) => c.planned),
    pagato: summary.total,
    daPagare: sum((c) => c.unpaid),
    persone,
    transfers: settle(persone),
    unconverted: [...unconverted].sort(),
  }
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
