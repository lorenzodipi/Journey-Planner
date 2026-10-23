// Ordine delle sezioni sotto le tappe nella pagina di un giorno: prima quelle che hanno qualcosa da mostrare,
// in fondo quelle vuote; dentro ciascun gruppo vale l'ordine di base.

export type DaySectionKey = 'luce' | 'meteo' | 'spostamenti' | 'alloggio' | 'spese' | 'prenotazioni'

/** Ordine di base (il meteo sta prima degli spostamenti). */
export const BASE_ORDER: DaySectionKey[] = ['luce', 'meteo', 'spostamenti', 'alloggio', 'spese', 'prenotazioni']

export function orderSections(hasData: Record<DaySectionKey, boolean>): DaySectionKey[] {
  return [...BASE_ORDER.filter((k) => hasData[k]), ...BASE_ORDER.filter((k) => !hasData[k])]
}
