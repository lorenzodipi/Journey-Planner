import { useEffect } from 'react'

/**
 * Nasconde la barra di navigazione in basso finché `hide` è vero (es. in selezione multipla,
 * dove al suo posto c'è il pulsante «Elimina»). Si ripristina da sola quando la pagina si chiude.
 */
export function useHideNav(hide: boolean) {
  useEffect(() => {
    if (!hide) return
    const root = document.documentElement
    root.setAttribute('data-hide-nav', '')
    return () => root.removeAttribute('data-hide-nav')
  }, [hide])
}
