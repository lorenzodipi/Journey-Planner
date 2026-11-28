// L'ordine delle spese, «le più recenti in alto». Le spese scritte a mano hanno tutte come ora le 12:00 del loro giorno, quindi
// nello stesso giorno `spentAt` è uguale e decide quando sono state inserite (`createdAt`): l'ultima inserita sta sopra.

interface ConData {
  spentAt: string
  createdAt?: string
}

/** A parità di giorno, l'ultima inserita prima. */
export const poiInseritaPrima = (a: Pick<ConData, 'createdAt'>, b: Pick<ConData, 'createdAt'>): number => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

/** Le più recenti prima: per data della spesa, poi per momento in cui è stata inserita. */
export const piuRecentiPrima = (a: ConData, b: ConData): number => b.spentAt.localeCompare(a.spentAt) || poiInseritaPrima(a, b)
