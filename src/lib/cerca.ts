// Ricerca nei campi «scrivibili» (CampoCerca): aeroporti, paesi, valute, fusi orari.
// Senza accenti e maiuscole; prima il codice esatto, poi chi comincia con il testo, poi chi lo contiene.
// `corrisponde` è la regola di tutte le altre ricerche dell'app (luoghi, tappe, ricerca generale, elenchi).

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

/**
 * La regola di ricerca dell'app: senza accenti e maiuscole, ogni parola scritta deve comparire in uno dei campi, in
 * qualsiasi ordine e in qualsiasi punto («head» trova «Godzilla Head», «valigia» trova un luogo con «valigia» nelle note,
 * «tokyo sushi» trova un sushi a Tokyo). Testo vuoto: tutto corrisponde.
 */
export function corrisponde(testo: string, ...campi: (string | null | undefined)[]): boolean {
  const q = normalizza(testo)
  if (!q) return true
  const tutto = normalizza(campi.filter(Boolean).join(' '))
  return q.split(' ').every((p) => tutto.includes(p))
}

/**
 * Quanto un nome risponde a ciò che si è scritto (più basso = più in alto nell'elenco). La scaletta:
 * 0 nome uguale · 1 il nome comincia con il testo · 2 la prima parola del nome comincia con la prima parola scritta e
 * le altre parole scritte sono inizi di parole del nome · 3 tutte le parole scritte sono inizi di parole del nome ·
 * 4 tutte le parole sono nel nome (anche a metà parola) · 5 trovato solo negli altri campi (città, categoria, note…).
 */
export function gradino(testo: string, nome: string): number {
  const q = normalizza(testo)
  const n = normalizza(nome)
  if (!q) return 5
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  const parole = q.split(' ')
  const pn = n.split(/[\s\-/·,.()]+/).filter(Boolean)
  const inizio = (p: string) => pn.some((w) => w.startsWith(p))
  if (parole.every(inizio)) return pn[0]?.startsWith(parole[0]) ? 2 : 3
  if (parole.every((p) => n.includes(p))) return 4
  return 5
}

/**
 * Filtra con `corrisponde` (nome e altri campi) e ordina per rilevanza: prima il gradino, poi dove compare la prima parola
 * nel nome (prima è meglio), poi il nome più corto, poi l'ordine alfabetico. «tokyo» → «Tokyo Tower», «Tokyo casa»,
 * «Casa Tokyo», e solo dopo i posti che sono a Tokyo ma non lo hanno nel nome.
 */
export function cercaPerRilevanza<T>(voci: readonly T[], testo: string, nome: (v: T) => string, altri: (v: T) => (string | null | undefined)[] = () => []): T[] {
  const q = normalizza(testo)
  if (!q) return [...voci]
  const prima = q.split(' ')[0]
  return voci
    .filter((v) => corrisponde(testo, nome(v), ...altri(v)))
    .map((v) => {
      const n = normalizza(nome(v))
      const pos = n.indexOf(prima)
      return { v, g: gradino(testo, nome(v)), pos: pos < 0 ? 1e6 : pos, len: n.length, n }
    })
    .sort((a, b) => a.g - b.g || a.pos - b.pos || a.len - b.len || a.n.localeCompare(b.n))
    .map((x) => x.v)
}
