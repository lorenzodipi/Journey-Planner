import { describe, expect, it } from 'vitest'
import { isTap } from './mapTap'

const down = { x: 100, y: 100, t: 1000, pointers: 1 }

describe('isTap', () => {
  it('tocco breve e fermo', () => expect(isTap(down, { x: 102, y: 101, t: 1120 }, null)).toBe(true))
  it('troppo lontano dal punto di partenza', () => expect(isTap(down, { x: 110, y: 100, t: 1100 }, null)).toBe(false))
  it('appena sotto la soglia di spostamento', () => expect(isTap(down, { x: 107, y: 100, t: 1100 }, null)).toBe(true))
  it('pressione troppo lunga', () => expect(isTap(down, { x: 100, y: 100, t: 1400 }, null)).toBe(false))
  it('due dita (pinch)', () => expect(isTap({ ...down, pointers: 2 }, { x: 100, y: 100, t: 1100 }, null)).toBe(false))
  it('la mappa si muoveva un attimo prima (inerzia)', () => expect(isTap(down, { x: 100, y: 100, t: 1100 }, 800)).toBe(false))
  it('la mappa era ferma da un po\'', () => expect(isTap(down, { x: 100, y: 100, t: 1100 }, 600)).toBe(true))
  it('la mappa si è mossa durante il tocco', () => expect(isTap(down, { x: 100, y: 100, t: 1100 }, 1050)).toBe(false))
})
