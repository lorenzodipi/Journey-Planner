import type { TransportMode } from '../types'

/** Nome di ogni mezzo, come si legge nella mappa del giorno e nel percorso. */
export const MODE_LABEL: Record<TransportMode, string> = {
  train: 'Treno',
  metro: 'Metro',
  bus: 'Bus',
  taxi: 'Taxi',
  walk: 'A piedi',
  car: 'Auto',
  plane: 'Aereo',
  ferry: 'Traghetto',
  other: 'Altro',
}
