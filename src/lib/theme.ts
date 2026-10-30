// Aspetto dell'app: chiaro, scuro o come il telefono. È una comodità del singolo utente: sta solo in questo telefono.
import { useEffect, useState } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

const KEY = 'jp.theme.v1'
/** Colore della barra di stato / del browser: lo stesso dello sfondo della pagina. */
const BAR: Record<Theme, string> = { light: '#FAF6EE', dark: '#10172B' }

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function resolveTheme(pref: ThemePref): Theme {
  return pref === 'system' ? systemTheme() : pref
}

/** Applica il tema al documento: attributo, color-scheme e colore della barra di stato. */
export function applyTheme(pref: ThemePref): Theme {
  const theme = resolveTheme(pref)
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', BAR[theme]))
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme)
  return theme
}

const listeners = new Set<(p: ThemePref) => void>()

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    /* la scelta vale solo finché la pagina resta aperta */
  }
  applyTheme(pref)
  listeners.forEach((l) => l(pref))
}

/** Da chiamare una volta all'avvio: applica la scelta e segue il telefono quando è su «Sistema». */
export function initTheme(): void {
  applyTheme(readThemePref())
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (readThemePref() === 'system') applyTheme('system')
    })
  } catch {
    /* browser senza matchMedia: resta il tema chiaro */
  }
}

export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(readThemePref)
  useEffect(() => {
    listeners.add(setPref)
    return () => void listeners.delete(setPref)
  }, [])
  return [pref, setThemePref]
}
