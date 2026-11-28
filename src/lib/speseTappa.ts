// Spese collegate a una tappa (`source` = { kind: 'day_item', id }). Una tappa può averne più d'una (0061): il costo scritto
// in «Modifica tappa» e le spese collegate dal foglio della spesa (campo «Tappa»). Con una sola spesa la tappa la mostra e la
// modifica come sempre; con più spese mostra il totale e l'elenco, che si modificano in Spese.
import type { Day, Expense, Trip } from '../types'
import { expenseBase, type FxContext } from './budget'
import { round2 } from './money'
import { piuRecentiPrima } from './ordineSpese'
import { LOCALE, t as tt } from '../i18n'

/** Le spese collegate alla tappa, le più recenti in alto. */
export function speseDellaTappa(trip: Pick<Trip, 'expenses'>, itemId: string): Expense[] {
  return trip.expenses.filter((e) => e.source?.kind === 'day_item' && e.source.id === itemId).sort(piuRecentiPrima)
}

/** Somma delle spese: nella loro valuta se è la stessa per tutte, altrimenti nella valuta base (`null` se manca un cambio). */
export function totaleSpese(spese: readonly Expense[], fx: FxContext): { amount: number; currency: string } | null {
  if (spese.length === 0) return null
  const cur = spese[0].currency
  if (spese.every((e) => e.currency === cur)) return { amount: round2(spese.reduce((n, e) => n + e.amount, 0)), currency: cur }
  let tot = 0
  for (const e of spese) {
    const b = expenseBase(e, fx)
    if (b === null) return null
    tot += b
  }
  return { amount: round2(tot), currency: fx.base }
}

/** Chi divide almeno una delle spese (vuoto nella spesa = tutti). */
export function personeDelleSpese(spese: readonly Expense[], tutti: readonly string[]): string[] {
  const out = new Set<string>()
  for (const e of spese) for (const id of e.shares.length > 0 ? e.shares.map((s) => s.travelerId) : tutti) out.add(id)
  return tutti.filter((id) => out.has(id))
}

const giorno = (ymd: string) => {
  const s = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export interface SceltaTappa {
  value: string
  label: string
  group?: string
}

/** Voci del campo «Tappa» del foglio spesa: «Nessuna tappa», poi le tappe raggruppate per giorno («Giorno 2 · Lun 23 nov»). */
export function scelteTappa(trip: Pick<Trip, 'days'>): SceltaTappa[] {
  const out: SceltaTappa[] = [{ value: '', label: tt('Nessuna tappa') }]
  trip.days.forEach((d: Day, i) => {
    const group = tt('Giorno {n} · {data}', { n: i + 1, data: giorno(d.date) })
    for (const it of d.items) out.push({ value: it.id, label: it.time ? `${it.time.slice(0, 5)} · ${it.title}` : it.title, group })
  })
  return out
}

/** Il giorno della tappa (per portare lì la data di una spesa nuova). */
export function giornoDellaTappa(trip: Pick<Trip, 'days'>, itemId: string): Day | undefined {
  return trip.days.find((d) => d.items.some((i) => i.id === itemId))
}
