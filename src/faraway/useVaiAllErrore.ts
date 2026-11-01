// Quando in un modulo compare (o cambia) un errore, la pagina scorre da sola fino a lui: chi preme «Salva» non deve cercarlo.
import { useEffect, type RefObject } from 'react'

const ERRORI = '[aria-invalid="true"], .fa-help.bad'

export function useVaiAllErrore(ref: RefObject<HTMLElement | null>, attivo = true) {
  useEffect(() => {
    const root = ref.current
    if (!root || !attivo) return
    let ultima = ''
    let frame = 0
    const guarda = () => {
      frame = 0
      const trovati = Array.from(root.querySelectorAll<HTMLElement>(ERRORI))
      const firma = trovati.map((e) => `${e.tagName}${e.id}:${e.textContent ?? ''}`).join('|')
      if (firma === ultima) return
      ultima = firma
      if (trovati.length === 0) return
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      trovati[0].scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
    }
    const mo = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(guarda)
    })
    mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-invalid'], characterData: true })
    return () => {
      mo.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref, attivo])
}
