import type { TransportMode } from '../types'
import { t } from '../i18n'

/** Nome di ogni mezzo, come si legge nella mappa del giorno e nel percorso. */
export const MODE_LABEL: Record<TransportMode, string> = {
  train: t('Treno'),
  metro: t('Metro'),
  bus: t('Bus'),
  taxi: t('Taxi'),
  walk: t('A piedi'),
  car: t('Auto'),
  plane: t('Aereo'),
  ferry: t('Traghetto'),
  other: t('Altro'),
}
