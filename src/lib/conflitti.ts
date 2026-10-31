// Conflitti (#64, OP-TEC-05): vince l'ultimo che salva, ma se qualcun altro ha modificato lo stesso elemento
// mentre il foglio era aperto, prima di sovrascrivere si avvisa.
import type { Attivita } from '../types'

export function modificaAltrui(activity: Attivita[] | undefined, table: string, rowId: string | undefined, since: string, meUserId: string | undefined): Attivita | undefined {
  if (!activity || !rowId) return undefined
  return activity
    .filter((a) => a.table === table && a.rowId === rowId && a.at > since && a.actor !== meUserId && a.action !== 'insert')
    .sort((a, b) => b.at.localeCompare(a.at))[0]
}
