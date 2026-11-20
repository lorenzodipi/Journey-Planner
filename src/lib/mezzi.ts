import type { TransportMode } from '../types'
import { t } from '../i18n'

/**
 * Taxi e auto sono un mezzo solo, «Auto»: i dati salvati prima come taxi (trasporti, spostamenti, file di ripristino)
 * si leggono come auto, senza riscriverli.
 */
export function senzaTaxi<T extends string>(m: T | 'taxi'): Exclude<T, 'taxi'> | 'car' {
  return (m === 'taxi' ? 'car' : m) as Exclude<T, 'taxi'> | 'car'
}

/** Nome di ogni mezzo, come si legge nella mappa del giorno e nel percorso. */
export const MODE_LABEL: Record<TransportMode, string> = {
  train: t('Treno'),
  metro: t('Metro'),
  bus: t('Bus'),
  walk: t('A piedi'),
  car: t('Auto'),
  plane: t('Aereo'),
  ferry: t('Traghetto'),
  other: t('Altro'),
}
