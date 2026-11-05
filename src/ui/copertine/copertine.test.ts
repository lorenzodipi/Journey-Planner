import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../../lib/countries'
import { PALETTE } from './base'
import { copertinaPaese, copertinaSvg, haCopertina } from './index'
import * as M1 from './motivi1'
import * as M2 from './motivi2'
import * as M3 from './motivi3'
import { PAESI } from './paesi'

const MOTIVI = { ...M1, ...M2, ...M3 } as Record<string, unknown>

describe('copertine dei paesi', () => {
  it('ogni paese dell’elenco ha la sua copertina', () => {
    const senza = COUNTRIES.filter((c) => !haCopertina(c.code)).map((c) => c.code)
    expect(senza).toEqual([])
  })
  it('la tabella non ha voci senza paese, motivo o palette', () => {
    const codici = new Set(COUNTRIES.map((c) => c.code))
    for (const [codice, v] of Object.entries(PAESI)) {
      expect(codici.has(codice), `${codice} non è nell'elenco dei paesi`).toBe(true)
      expect(typeof MOTIVI[v.motivo], `${codice}: motivo ${v.motivo}`).toBe('function')
      expect(PALETTE[v.palette], `${codice}: palette ${v.palette}`).toBeDefined()
      expect(v.terreno, `${codice}: terreno`).toBeDefined()
    }
  })
  it('i disegni sono SVG validi, senza valori NaN o undefined', () => {
    for (const c of COUNTRIES) {
      const svg = copertinaSvg(c.code) as string
      expect(svg.startsWith('<svg'), c.code).toBe(true)
      expect(svg.endsWith('</svg>'), c.code).toBe(true)
      expect(svg, c.code).not.toMatch(/NaN|undefined|null/)
    }
  })
  it('le copertine sono tutte diverse tra loro', () => {
    const viste = new Set(COUNTRIES.map((c) => copertinaSvg(c.code)))
    expect(viste.size).toBe(COUNTRIES.length)
  })
  it('è la stessa per lo stesso paese, anche in minuscolo; ignora i codici sconosciuti', () => {
    expect(copertinaPaese('jp')).toBe(copertinaPaese('JP'))
    expect(copertinaPaese('JP')).toMatch(/^data:image\/svg\+xml/)
    expect(copertinaPaese('ZZ')).toBeNull()
    expect(copertinaPaese(undefined)).toBeNull()
    expect(copertinaPaese('')).toBeNull()
  })
})
