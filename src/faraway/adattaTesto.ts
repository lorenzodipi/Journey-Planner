// Testo grande su una riga (es. «MXP ✈ HND» in Oggi): se non ci sta, si rimpicciolisce quanto basta. Serve sui telefoni
// stretti o con il testo di sistema ingrandito (Android lo applica anche ai px). Se ci sta già, non cambia niente.
import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

export function useTestoCheCi(ref: RefObject<HTMLElement | null>, chiave: unknown) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const adatta = () => {
      el.style.fontSize = ''
      // icone e spazi non si rimpiccioliscono con il testo: qualche giro per arrivare alla misura giusta
      for (let i = 0; i < 4; i++) {
        const largo = el.scrollWidth
        const posto = el.clientWidth
        if (largo <= posto || posto === 0) return
        const px = parseFloat(getComputedStyle(el).fontSize)
        el.style.fontSize = `${Math.floor(px * (posto / largo) * 10) / 10 - (i ? 1 : 0)}px`
      }
    }
    adatta()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(adatta)
    ro.observe(el.parentElement ?? el)
    void document.fonts?.ready.then(adatta)
    return () => ro.disconnect()
  }, [ref, chiave])
}
