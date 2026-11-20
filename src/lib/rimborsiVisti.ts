// I pagamenti di altri che ho già visto (avviso in Oggi e in Spese), per viaggio: la copia di questo dispositivo. Con la
// migrazione 0057 si uniscono a quelli segnati dagli altri dispositivi (Trip.pagamentiVisti, useNovitaRimborsi).
const chiave = (tripId: string) => `jp.rimborsiVisti.${tripId}`
const ascoltatori = new Set<(tripId: string) => void>()

/** Avvisa quando questo dispositivo segna dei visti (l'avviso in Spese e il pallino sulla scheda si aggiornano insieme). */
export function ascoltaVisti(fn: (tripId: string) => void): () => void {
  ascoltatori.add(fn)
  return () => void ascoltatori.delete(fn)
}

export function leggiVisti(tripId: string): Set<string> {
  try {
    const raw = localStorage.getItem(chiave(tripId))
    const v: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

/** Segna come visti questi pagamenti; ne tiene al massimo 200 (i più recenti). */
export function segnaVisti(tripId: string, keys: readonly string[]): Set<string> {
  const tutti = [...leggiVisti(tripId), ...keys].slice(-200)
  try {
    localStorage.setItem(chiave(tripId), JSON.stringify(tutti))
  } catch {
    // senza memoria locale l'avviso torna alla prossima apertura: va bene
  }
  for (const fn of ascoltatori) fn(tripId)
  return new Set(tutti)
}
