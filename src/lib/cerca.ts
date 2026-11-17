// Ricerca nei campi «scrivibili» (CampoCerca): aeroporti, paesi, valute, fusi orari.
// Senza accenti e maiuscole; prima il codice esatto, poi chi comincia con il testo, poi chi lo contiene.

export interface VoceCerca {
  id: string
  /** testo principale della riga (e del campo, una volta scelta) */
  label: string
  /** riga piccola sotto (es. «Roma, Italia») */
  detail?: string
  /** codice breve da cercare per primo (IATA, ISO, valuta) */
  codice?: string
  /** altri testi in cui cercare (nomi, città, parole chiave) */
  altro?: string
}

export const normalizza = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/** Punteggio di una voce per il testo cercato (più basso = più in alto); `null` se non corrisponde. */
function punteggio(v: VoceCerca, q: string, parole: string[]): number | null {
  const codice = v.codice ? normalizza(v.codice) : ''
  if (codice && codice === q) return 0
  const label = normalizza(v.label)
  const tutto = `${codice} ${label} ${normalizza(v.detail ?? '')} ${normalizza(v.altro ?? '')}`
  if (!parole.every((p) => tutto.includes(p))) return null
  if (codice.startsWith(q)) return 1
  if (label.startsWith(q)) return 2
  if (` ${tutto}`.includes(` ${q}`)) return 3
  if (parole.every((p) => ` ${tutto}`.includes(` ${p}`))) return 4
  return 5
}

/** Le prime `max` voci che corrispondono al testo, nell'ordine del punteggio (a parità, l'ordine dell'elenco). */
export function cercaVoci<T extends VoceCerca>(voci: readonly T[], testo: string, max = 8): T[] {
  const q = normalizza(testo)
  if (!q) return []
  const parole = q.split(' ')
  const trovate: { v: T; p: number; i: number }[] = []
  voci.forEach((v, i) => {
    const p = punteggio(v, q, parole)
    if (p !== null) trovate.push({ v, p, i })
  })
  return trovate
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .slice(0, max)
    .map((x) => x.v)
}
