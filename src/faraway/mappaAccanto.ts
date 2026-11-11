// Luoghi con la mappa accanto all'elenco: solo con una finestra «espansa» (da 840 px: pieghevole aperto in orizzontale,
// tablet, computer). Sul telefono e sul pieghevole a libro mezzo aperto (l'app sta in un segmento) restano Elenco | Mappa.
import { useEffect, useState } from 'react'

export const LARGHEZZA_MAPPA_ACCANTO = 840

/** Decide se elenco e mappa stanno insieme: serve la larghezza e l'app non deve stare in un solo segmento della piega. */
export function mappaAccanto(larghezza: number, inUnSegmento: boolean): boolean {
  return larghezza >= LARGHEZZA_MAPPA_ACCANTO && !inUnSegmento
}

function adesso(): boolean {
  if (typeof window === 'undefined') return false
  const html = document.documentElement
  // la classe la mette il polyfill di capacitor-foldable (nella WebView la Viewport Segments API è spenta)
  const segmento = html.classList.contains('horizontal-viewport-segments-2') || window.matchMedia('(horizontal-viewport-segments: 2)').matches
  return mappaAccanto(window.innerWidth, segmento)
}

export function useMappaAccanto(): boolean {
  const [si, setSi] = useState(adesso)
  useEffect(() => {
    const aggiorna = () => setSi(adesso())
    window.addEventListener('resize', aggiorna)
    const mo = new MutationObserver(aggiorna)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    aggiorna()
    return () => {
      window.removeEventListener('resize', aggiorna)
      mo.disconnect()
    }
  }, [])
  return si
}
