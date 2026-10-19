// Torna indietro trascinando dal bordo sinistro verso il centro: il gesto di iOS, che nella WebView dell'app
// non esiste da solo (Android ha già il suo tasto/gesto, vedi nativeBack.ts). Si importa SOLO nell'app iOS.
import { goBack } from './nativeBack'

const EDGE = 24 // il dito deve partire da questa fascia a sinistra (px)
const TRIGGER = 80 // quanto va trascinato per tornare indietro (px)
const MAX_PULL = 72 // fin dove segue il dito l'indicatore (px)

/** Decide se un trascinamento è un «indietro»: parte dal bordo, va a destra, è più orizzontale che verticale. */
export function isBackSwipe(start: { x: number; y: number }, end: { x: number; y: number }): boolean {
  const dx = end.x - start.x
  const dy = Math.abs(end.y - start.y)
  return start.x <= EDGE && dx >= TRIGGER && dx > dy * 1.5
}

function makeIndicator(): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = [
    'position:fixed', 'left:0', 'top:50%', 'z-index:2147483647', 'width:40px', 'height:40px', 'margin-top:-20px',
    'border-radius:50%', 'display:grid', 'place-items:center', 'pointer-events:none', 'opacity:0',
    'background:var(--accent)', 'color:#fff', 'box-shadow:0 6px 16px rgb(0 0 0 / .35)', 'transform:translateX(-48px)',
  ].join(';')
  el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'
  document.body.appendChild(el)
  return el
}

export function setupSwipeBack(): void {
  let start: { x: number; y: number } | null = null
  let horizontal = false
  let pill: HTMLElement | null = null

  const reset = () => {
    if (pill) {
      pill.style.transition = 'transform .18s ease, opacity .18s ease'
      pill.style.opacity = '0'
      pill.style.transform = 'translateX(-48px)'
    }
    start = null
    horizontal = false
  }

  document.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0]
      start = e.touches.length === 1 && t.clientX <= EDGE ? { x: t.clientX, y: t.clientY } : null
      horizontal = false
    },
    { passive: true },
  )

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!start) return
      const t = e.touches[0]
      const dx = t.clientX - start.x
      const dy = Math.abs(t.clientY - start.y)
      if (!horizontal) {
        if (dy > 12 && dy > dx) return void (start = null) // è uno scroll verticale: non è per noi
        if (dx < 8) return
        horizontal = true
      }
      e.preventDefault() // niente scroll della pagina mentre si trascina
      pill ??= makeIndicator()
      const pull = Math.min(MAX_PULL, Math.max(0, dx))
      pill.style.transition = 'none'
      pill.style.opacity = String(Math.min(1, pull / TRIGGER + 0.2))
      pill.style.transform = `translateX(${pull - 40}px)`
      pill.style.background = dx >= TRIGGER ? 'var(--ok)' : 'var(--accent)'
    },
    { passive: false },
  )

  document.addEventListener(
    'touchend',
    (e) => {
      const t = e.changedTouches[0]
      if (start && horizontal && isBackSwipe(start, { x: t.clientX, y: t.clientY })) goBack()
      reset()
    },
    { passive: true },
  )
  document.addEventListener('touchcancel', reset, { passive: true })
}
