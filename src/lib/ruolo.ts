// Visualizzatore (0049): vede il viaggio in sola lettura e non ne fa parte. Niente Luoghi, Spese, Budget, Cambio,
// Prenotazioni, Documenti, Checklist, Registro; niente pulsanti per modificare. I dati che non deve vedere non gli
// arrivano proprio (RLS): qui si tolgono le pagine e i pulsanti.
import type { Trip } from '../types'

/** Vero per chi vede il viaggio senza farne parte. */
export function soloLettura(trip: Pick<Trip, 'myRole'> | null | undefined): boolean {
  return trip?.myRole === 'viewer'
}

/** Pagine che il visualizzatore non apre (prefissi delle rotte). */
const VIETATE = ['/luoghi', '/mappa', '/spese', '/altro/budget', '/altro/spese', '/altro/checklist', '/altro/prenotazioni', '/altro/documenti', '/altro/registro']

/** Se il visualizzatore può aprire questa pagina. */
export function paginaPermessa(path: string, trip: Pick<Trip, 'myRole'> | null | undefined): boolean {
  if (!soloLettura(trip)) return true
  const p = path.split('?')[0]
  return !VIETATE.some((v) => p === v || p.startsWith(`${v}/`))
}
