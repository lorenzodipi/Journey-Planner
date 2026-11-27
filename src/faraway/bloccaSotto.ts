// Con un foglio o un modale aperto la pagina sotto non deve scorrere. Su iOS (WebKit) un <dialog> modale non lo
// impedisce: se il foglio è corto e non ha niente da scorrere, il trascinamento passa alla pagina. Qui un
// trascinamento dentro il dialogo si ferma, salvo che parta da qualcosa che in quella direzione può scorrere
// (il corpo del foglio, una fila di chip) o da un cursore. Il CSS blocca anche lo scorrimento del documento
// (`html:has(dialog[open])`).
// Un trascinamento che parte da un campo di testo non si ferma mai: su iPhone la pressione lunga (lente, «Incolla»,
// «Seleziona tutto») e lo spostamento del cursore muovono sempre il dito di qualche pixel, e fermarlo li annullava.
import { useEffect } from 'react'
import type { RefObject } from 'react'

/** Vero se il dito è partito da un campo in cui si scrive (input di testo, textarea, testo modificabile). */
export function eCampoDiTesto(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false
  const c = el.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')
  if (!c) return false
  if (c instanceof HTMLInputElement) return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color'].includes(c.type)
  return true
}

function puoScorrere(el: HTMLElement, dx: number, dy: number): boolean {
  const s = getComputedStyle(el)
  if (Math.abs(dy) >= Math.abs(dx)) return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1
  return /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1
}

/** Ferma i trascinamenti dentro `ref` che farebbero scorrere la pagina sotto. */
export function useBloccaSotto(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    const root = ref.current
    if (!root || !open) return
    let x = 0
    let y = 0
    let daCampo = false
    const inizio = (e: TouchEvent) => {
      x = e.touches[0]?.clientX ?? 0
      y = e.touches[0]?.clientY ?? 0
      daCampo = eCampoDiTesto(e.target)
    }
    const muovi = (e: TouchEvent) => {
      if (daCampo || e.touches.length !== 1 || !e.cancelable) return
      const t = e.touches[0]
      const dx = t.clientX - x
      const dy = t.clientY - y
      for (let el = e.target as HTMLElement | null; el && el !== root; el = el.parentElement) {
        if (el instanceof HTMLInputElement && el.type === 'range') return
        if (puoScorrere(el, dx, dy)) return
      }
      e.preventDefault()
    }
    root.addEventListener('touchstart', inizio, { passive: true })
    root.addEventListener('touchmove', muovi, { passive: false })
    return () => {
      root.removeEventListener('touchstart', inizio)
      root.removeEventListener('touchmove', muovi)
    }
  }, [ref, open])
}
