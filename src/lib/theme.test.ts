import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, readThemePref, resolveTheme, setThemePref } from './theme'

const store = new Map<string, string>()
const metas = [{ name: 'theme-color', content: '#000' }, { name: 'color-scheme', content: 'light' }]
const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } }

function meta(name: string) {
  const m = metas.find((x) => x.name === name)
  return m && { setAttribute: (_: string, v: string) => (m.content = v), getAttribute: () => m.content }
}

beforeEach(() => {
  store.clear()
  root.dataset = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
  vi.stubGlobal('document', {
    documentElement: root,
    querySelector: (sel: string) => meta(/"(.+)"/.exec(sel)?.[1] ?? ''),
    querySelectorAll: (sel: string) => [meta(/"(.+)"/.exec(sel)?.[1] ?? '')].filter(Boolean),
  })
})

describe('tema', () => {
  it('senza scelta segue il telefono', () => {
    expect(readThemePref()).toBe('system')
    expect(resolveTheme('system')).toBe('light')
  })

  it('una scelta esplicita vince sul telefono', () => {
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
  })

  it('applica attributo, color-scheme e colore della barra', () => {
    applyTheme('dark')
    expect(root.dataset.theme).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
    expect(metas[0].content).toBe('#10172B')
    applyTheme('light')
    expect(metas[0].content).toBe('#FAF6EE')
  })

  it('salva la scelta e «Sistema» la cancella', () => {
    setThemePref('dark')
    expect(readThemePref()).toBe('dark')
    setThemePref('system')
    expect(readThemePref()).toBe('system')
  })
})
