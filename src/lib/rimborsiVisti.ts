// I pagamenti di altri che ho già visto (avviso in Oggi e in Spese): solo su questo telefono, per viaggio.
const chiave = (tripId: string) => `jp.rimborsiVisti.${tripId}`

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
  return new Set(tutti)
}
