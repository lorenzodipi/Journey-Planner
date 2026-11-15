// Lingua dell'app. I testi si scrivono in italiano nel codice e passano da t(): con l'italiano t() li restituisce
// così come sono, con un'altra lingua li cerca nel catalogo di quella lingua (src/i18n/<lingua>.json, chiave = testo
// italiano). Il catalogo si carica prima dell'app (main.tsx), quindi anche le costanti dei moduli escono già tradotte;
// cambiare lingua ricarica l'app. Regole in docs/linee-guida/06-lingue.md.

export type Lingua = 'it' | 'en'
export type SceltaLingua = 'auto' | Lingua

/** Lingue disponibili, ognuna con il nome scritto nella sua lingua (come nelle Impostazioni di iPhone e Android). */
export const LINGUE: { code: Lingua; nome: string }[] = [
  { code: 'it', nome: 'Italiano' },
  { code: 'en', nome: 'English' },
]

/** Chiave sul telefono: resta anche dopo il logout, come il tema (CHIAVI_DA_TENERE in src/lib/datiLocali.ts). */
export const CHIAVE_LINGUA = 'jp.lingua'

const CATALOGHI: Record<Exclude<Lingua, 'it'>, () => Promise<{ default: Record<string, string> }>> = {
  en: () => import('./en.json'),
}

/** Lingua attiva ('it' finché main.tsx non sceglie: nei test resta sempre l'italiano). */
export let LINGUA: Lingua = 'it'
/** Locale per Intl (date, ore, numeri, valute, ordinamenti). */
export let LOCALE = 'it-IT'

let catalogo: Record<string, string> = {}

export function sceltaLingua(): SceltaLingua {
  try {
    const v = localStorage.getItem(CHIAVE_LINGUA)
    return v === 'it' || v === 'en' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

/** Un tag di lingua usabile da Intl («en_US@posix» → «en-US»); undefined se non è valido. */
function tagValido(x: string): string | undefined {
  try {
    return Intl.getCanonicalLocales(x.replace(/@.*$/, '').replace(/_/g, '-'))[0]
  } catch {
    return undefined
  }
}

/** Lingua e locale per una scelta: «auto» segue il telefono (italiano se è italiano, inglese per ogni altra lingua). */
export function risolviLingua(scelta: SceltaLingua, lingueTelefono: readonly string[]): { lingua: Lingua; locale: string } {
  const tel = lingueTelefono.map(tagValido).filter((x): x is string => Boolean(x))
  const delTelefono = (l: Lingua) => tel.find((x) => x.toLowerCase().split('-')[0] === l)
  if (scelta === 'it') return { lingua: 'it', locale: 'it-IT' }
  if (scelta === 'en') {
    const en = delTelefono('en')
    return { lingua: 'en', locale: en && en.includes('-') ? en : 'en-GB' }
  }
  for (const x of tel) {
    const c = x.toLowerCase().split('-')[0]
    if (c === 'it') return { lingua: 'it', locale: 'it-IT' }
    if (c === 'en') return { lingua: 'en', locale: x.includes('-') ? x : 'en-GB' }
  }
  return tel.length ? { lingua: 'en', locale: 'en-GB' } : { lingua: 'it', locale: 'it-IT' }
}

/** Sceglie la lingua (dalla preferenza o dal telefono) e carica il suo catalogo. Da chiamare prima di montare l'app. */
export async function avviaLingua(): Promise<void> {
  const tel = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]
  const { lingua, locale } = risolviLingua(sceltaLingua(), tel)
  if (lingua !== 'it') {
    try {
      catalogo = (await CATALOGHI[lingua]()).default
    } catch {
      // catalogo non scaricabile (rete o cache vuota): meglio l'italiano che testi a metà
      return
    }
  }
  LINGUA = lingua
  LOCALE = locale
  if (typeof document !== 'undefined') document.documentElement.lang = lingua
}

/** Salva la scelta e ricarica l'app nella nuova lingua. */
export function cambiaLingua(scelta: SceltaLingua): void {
  try {
    if (scelta === 'auto') localStorage.removeItem(CHIAVE_LINGUA)
    else localStorage.setItem(CHIAVE_LINGUA, scelta)
  } catch {
    /* senza memoria resta la lingua del telefono */
  }
  window.location.reload()
}

/** Solo per i test: imposta lingua, locale e catalogo senza caricare nulla. */
export function _impostaPerTest(lingua: Lingua, locale: string, cat: Record<string, string>): void {
  LINGUA = lingua
  LOCALE = locale
  catalogo = cat
}

type Valori = Record<string, string | number | null | undefined>

/**
 * Testo nella lingua attiva. `testo` è la frase italiana, sempre scritta per intero (letterale): il test del catalogo
 * la trova nel codice. Segnaposto alla ICU: «Budget: {importo}», «{n, plural, one {# giorno} other {# giorni}}»,
 * «{x, select, a {…} other {…}}».
 */
export function t(testo: string, valori?: Valori): string {
  const m = catalogo[testo] ?? testo
  return valori ? formatta(m, valori) : m
}

/**
 * Come t(), per una parola che in italiano vale per due cose diverse: «Altro» scheda (More) e «Altro» categoria
 * (Other). Nel catalogo la chiave è «testo|contesto»; senza traduzione resta il testo italiano.
 */
export function tc(testo: string, contesto: string): string {
  return catalogo[`${testo}|${contesto}`] ?? testo
}

/** Il testo di una variabile che può essere una frase dell'app (es. un'etichetta scelta da un elenco fisso). */
export const tv = (testo: string): string => catalogo[testo] ?? testo

/**
 * Categorie che l'app propone da sola (spese, documenti, checklist, l'alloggio tra i luoghi): sono salvate in
 * italiano e si traducono solo quando si mostrano. Quelle scritte da chi usa l'app restano esattamente come sono.
 */
export const CATEGORIE_DELL_APP = ['Voli', 'Alloggi', 'Trasporti', 'Cibo', 'Attività', 'Altro', 'Assicurazione', 'eSIM / SIM', 'Documenti', 'Valigia', 'Salute', 'Tecnologia', 'Alloggio'] as const

export function nomeCategoria(label: string): string {
  const k = label.trim().toLowerCase()
  const c = CATEGORIE_DELL_APP.find((x) => x.toLowerCase() === k)
  return c ? tv(c) : label
}

/** «A e B», «A, B e C» nella lingua dell'app («A and B» in inglese). */
export function elenco(voci: readonly string[]): string {
  if (voci.length <= 1) return voci.join('')
  try {
    return new Intl.ListFormat(LOCALE, { style: 'long', type: 'conjunction' }).format(voci)
  } catch {
    return `${voci.slice(0, -1).join(', ')} ${LINGUA === 'it' ? 'e' : 'and'} ${voci[voci.length - 1]}`
  }
}

/* ------------------------------------------------------------------ segnaposto (sottoinsieme di ICU MessageFormat) */

export function formatta(m: string, v: Valori): string {
  let out = ''
  let i = 0
  while (i < m.length) {
    const c = m[i]
    if (c !== '{') {
      out += c
      i++
      continue
    }
    const fine = chiusa(m, i)
    if (fine < 0) return out + m.slice(i)
    out += argomento(m.slice(i + 1, fine), v)
    i = fine + 1
  }
  return out
}

/** Indice della graffa che chiude quella in `da` (con graffe annidate). */
function chiusa(m: string, da: number): number {
  let liv = 0
  for (let i = da; i < m.length; i++) {
    if (m[i] === '{') liv++
    else if (m[i] === '}' && --liv === 0) return i
  }
  return -1
}

function argomento(corpo: string, v: Valori): string {
  const virgola = corpo.indexOf(',')
  if (virgola < 0) {
    const nome = corpo.trim()
    return nome in v ? String(v[nome]) : `{${corpo}}`
  }
  const nome = corpo.slice(0, virgola).trim()
  const resto = corpo.slice(virgola + 1)
  const v2 = resto.indexOf(',')
  const tipo = (v2 < 0 ? resto : resto.slice(0, v2)).trim()
  const casi = scelte(v2 < 0 ? '' : resto.slice(v2 + 1))
  const valore = v[nome]
  if (tipo === 'plural') {
    const n = Number(valore)
    const scelto = casi[`=${n}`] ?? casi[new Intl.PluralRules(LOCALE).select(n)] ?? casi.other ?? ''
    return formatta(scelto.replace(/#/g, n.toLocaleString(LOCALE)), v)
  }
  if (tipo === 'select') return formatta(casi[String(valore)] ?? casi.other ?? '', v)
  return valore === undefined ? `{${corpo}}` : String(valore)
}

/** «one {# giorno} other {# giorni}» → { one: '# giorno', other: '# giorni' } */
function scelte(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  let i = 0
  while (i < s.length) {
    const a = s.indexOf('{', i)
    if (a < 0) break
    const chiave = s.slice(i, a).trim()
    const b = chiusa(s, a)
    if (b < 0) break
    out[chiave] = s.slice(a + 1, b)
    i = b + 1
  }
  return out
}
