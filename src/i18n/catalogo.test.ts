// Il catalogo inglese copre ogni testo dell'app: ogni t('…'), tt('…') e tc('…', '…') scritto nel codice ha la sua
// traduzione, nessuna traduzione resta senza testo, e i segnaposto ({nome}) della traduzione esistono nel testo italiano.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import en from './en.json'
import { CATEGORIE_DELL_APP, _impostaPerTest, formatta, nomeCategoria, risolviLingua, t, tc } from './index'

const SRC = join(__dirname, '..')

/** Testi che arrivano a tv() da una variabile: schede in basso, gruppi della ricerca, categorie dell'app. */
const DINAMICHE = ['Oggi', 'Giorni', 'Luoghi', 'Spese', 'Tappe', 'Prenotazioni', 'Alloggi', 'Trasporti', 'Voli', ...CATEGORIE_DELL_APP]

function chiaviNelCodice(): Set<string> {
  const out = new Set<string>()
  const giro = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) giro(p)
      else if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) {
        const s = readFileSync(p, 'utf8')
        const testo = String.raw`'((?:\\.|[^'\\])*)'`
        for (const m of s.matchAll(new RegExp(String.raw`\btt?\(\s*` + testo, 'g'))) out.add(m[1].replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c)))
        for (const m of s.matchAll(new RegExp(String.raw`\btc\(\s*` + testo + String.raw`\s*,\s*` + testo, 'g'))) out.add(`${m[1]}|${m[2]}`)
      }
    }
  }
  giro(SRC)
  return out
}

const segnaposto = (s: string) => new Set([...s.matchAll(/\{(\w+)/g)].map((m) => m[1]))

describe('catalogo inglese', () => {
  const usate = chiaviNelCodice()
  const cat = en as Record<string, string>
  it('ogni testo del codice è tradotto', () => {
    const mancanti = [...usate, ...DINAMICHE].filter((k) => !(k in cat))
    expect(mancanti).toEqual([])
  })
  it('nessuna traduzione senza testo nel codice', () => {
    const tutte = new Set([...usate, ...DINAMICHE])
    expect(Object.keys(cat).filter((k) => !tutte.has(k))).toEqual([])
  })
  it('i segnaposto della traduzione esistono nel testo italiano', () => {
    const sbagliate = Object.entries(cat).filter(([k, v]) => [...segnaposto(v)].some((x) => !segnaposto(k.split('|')[0]).has(x)))
    expect(sbagliate).toEqual([])
  })
})

describe('t() e i segnaposto', () => {
  it('in italiano restituisce il testo e riempie i segnaposto', () => {
    _impostaPerTest('it', 'it-IT', {})
    expect(t('Ciao')).toBe('Ciao')
    expect(t('Budget: {v}', { v: '10 €' })).toBe('Budget: 10 €')
  })
  it('plurali e scelte alla ICU', () => {
    _impostaPerTest('en', 'en-GB', {})
    const m = '{n, plural, =0 {no stops} one {# stop} other {# stops}}'
    expect(formatta(m, { n: 0 })).toBe('no stops')
    expect(formatta(m, { n: 1 })).toBe('1 stop')
    expect(formatta(m, { n: 1200 })).toBe('1,200 stops')
    expect(formatta('{g, select, a {A} other {B}}', { g: 'a' })).toBe('A')
    expect(formatta('Ciao {nome}, {manca}', { nome: 'Ada' })).toBe('Ciao Ada, {manca}')
  })
  it('con il catalogo traduce, anche con il contesto', () => {
    _impostaPerTest('en', 'en-GB', { Altro: 'Other', 'Altro|scheda': 'More', 'Budget: {v}': 'Budget: {v}' })
    expect(t('Altro')).toBe('Other')
    expect(tc('Altro', 'scheda')).toBe('More')
    expect(t('Non tradotto')).toBe('Non tradotto')
    _impostaPerTest('it', 'it-IT', {})
  })
  it('le categorie dell’app si traducono, quelle scritte da chi usa l’app no', () => {
    _impostaPerTest('en', 'en-GB', { Cibo: 'Food', Valigia: 'Luggage' })
    expect(nomeCategoria('Cibo')).toBe('Food')
    expect(nomeCategoria(' valigia ')).toBe('Luggage')
    expect(nomeCategoria('Souvenir')).toBe('Souvenir')
    _impostaPerTest('it', 'it-IT', {})
  })
})

describe('lingua del telefono', () => {
  it('italiano se il telefono è in italiano, inglese per ogni altra lingua', () => {
    expect(risolviLingua('auto', ['it-IT', 'en-US'])).toEqual({ lingua: 'it', locale: 'it-IT' })
    expect(risolviLingua('auto', ['en-US'])).toEqual({ lingua: 'en', locale: 'en-US' })
    expect(risolviLingua('auto', ['fr-FR'])).toEqual({ lingua: 'en', locale: 'en-GB' })
    expect(risolviLingua('auto', ['en_US@posix'])).toEqual({ lingua: 'en', locale: 'en-US' })
    expect(risolviLingua('auto', [])).toEqual({ lingua: 'it', locale: 'it-IT' })
  })
  it('la scelta in Impostazioni vince sul telefono', () => {
    expect(risolviLingua('it', ['en-US'])).toEqual({ lingua: 'it', locale: 'it-IT' })
    expect(risolviLingua('en', ['it-IT'])).toEqual({ lingua: 'en', locale: 'en-GB' })
  })
})
