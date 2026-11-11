// Luoghi con la mappa accanto all'elenco: solo con una finestra «espansa» (da 840 px: pieghevole aperto in orizzontale,
// tablet, computer). Sul telefono e sul pieghevole a libro mezzo aperto (l'app sta in un segmento) restano Elenco | Mappa.
import { useEffect, useState, type RefObject } from 'react'

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

/** Stessa regola per Giorni con il dettaglio del giorno accanto. */
export const useVistaAccanto = useMappaAccanto

/** Un pannello fisso a destra (mappa, dettaglio del giorno) parte sotto quello che sta sopra l'app (il banner della demo)
 *  e sale con lo scorrimento della pagina fino al bordo in alto. */
export function useSottoIlBanner(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    const phone = el?.closest<HTMLElement>('.fa-phone')
    if (!el || !phone) return
    let raf = 0
    const aggiorna = () => {
      raf = 0
      el.style.top = `${Math.max(0, Math.round(phone.getBoundingClientRect().top))}px`
    }
    const presto = () => {
      if (!raf) raf = requestAnimationFrame(aggiorna)
    }
    aggiorna()
    window.addEventListener('scroll', presto, { passive: true })
    window.addEventListener('resize', presto)
    return () => {
      window.removeEventListener('scroll', presto)
      window.removeEventListener('resize', presto)
      cancelAnimationFrame(raf)
    }
  }, [ref])
}
