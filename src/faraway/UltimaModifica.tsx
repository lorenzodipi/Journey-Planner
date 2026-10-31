// «Modificato da Gaia · oggi 10:42» (#60, COL-003): autore e ora dell'ultima modifica di un contenuto condiviso.
import { ultimaModifica } from '../lib/registro'
import { useMe } from '../state/me'
import type { Trip } from '../types'

export function UltimaModifica({ trip, table, rowId }: { trip: Trip; table: string; rowId: string }) {
  const me = useMe(trip)
  const testo = ultimaModifica(trip, table, rowId, new Date(), trip.timezone, me?.userId)
  return testo ? <span className="fa-help">{testo}</span> : null
}
