// «Come dividere» in % o a importi: le quote che nessuno ha ancora scritto a mano si adattano da sole al resto.
// Due persone: Gaia scrive 400 su 1000 → io 600. Più persone: si adattano solo le quote non ancora toccate, in parti uguali;
// quelle già scritte a mano non si cambiano mai (sarebbe peggio ritrovarsi un numero giusto cambiato). Quando le hai scritte
// tutte, non si adatta più niente e il controllo sotto dice quanto manca o avanza.

import { splitAmounts } from './ripartizione'
import { parseAmount } from './money'
import type { SplitMode } from '../types'

const testo = (n: number) => String(n).replace('.', ',')

/**
 * Le quote dopo una modifica. `toccate`: le persone di cui l'utente ha scritto la quota (compresa quella appena cambiata).
 * Il resto (100 o l'importo, meno le quote toccate) va diviso in parti uguali tra le altre; se è negativo, le altre vanno a 0.
 */
export function adattaQuote(mode: SplitMode, who: readonly string[], vals: Readonly<Record<string, string>>, toccate: ReadonlySet<string>, total: number | null): Record<string, string> {
  if (mode === 'equal' || who.length < 2) return { ...vals }
  const obiettivo = mode === 'percent' ? 100 : total
  if (obiettivo === null || !(obiettivo > 0)) return { ...vals }
  const libere = who.filter((id) => !toccate.has(id))
  if (libere.length === 0) return { ...vals }
  const fissato = who.filter((id) => toccate.has(id)).reduce((s, id) => s + (parseAmount(vals[id] ?? '') ?? 0), 0)
  const resto = Math.max(0, Math.round((obiettivo - fissato) * 100) / 100)
  const parti = splitAmounts(resto, 'equal', libere.map((travelerId) => ({ travelerId, weight: 1 })))
  const out = { ...vals }
  libere.forEach((id, i) => (out[id] = testo(parti[i])))
  return out
}
