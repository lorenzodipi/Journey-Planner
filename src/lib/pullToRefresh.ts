// «Trascina verso il basso per aggiornare», come in Safari: dall'inizio della pagina si tira giù con un dito,
// e oltre una certa distanza, rilasciando, l'app ricarica tutti i dati.
import { topDialog } from '../ui/dialogStack'

export const THRESHOLD = 70 // quanto va tirato (px già "smorzati") perché al rilascio aggiorni
const MAX_PULL = 96
const DAMPING = 0.5

/** Quanto scende l'indicatore per un trascinamento di `dy` px del dito (si fa più duro man mano). */
export function pullDistance(dy: number): number {
  return Math.min(MAX_PULL, Math.max(0, dy) * DAMPING)
}

/** Un trascinamento è «verso il basso» se va giù ed è più verticale che orizzontale. */
export function isPullDown(dx: number, dy: number): boolean {
  return dy > 6 && dy > Math.abs(dx) * 1.2
}

/** Da dove può partire il gesto: dall'inizio della pagina, non su mappe, campi di testo o pannelli aperti. */
export function canStartPull(target: Element | null, scrollY: number, touches: number, dialogOpen: boolean): boolean {
  if (touches !== 1 || scrollY > 0 || dialogOpen) return false
  return !target?.closest('.maplibregl-map, input, textarea, select, [data-no-pull]')
}

function makeIndicator(): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = [
    'position:fixed', 'left:50%', 'top:calc(env(safe-area-inset-top) + 8px)', 'z-index:2147483646', 'width:40px', 'height:40px',
    'margin-left:-20px', 'border-radius:50%', 'display:grid', 'place-items:center', 'pointer-events:none', 'opacity:0',
    'background:var(--surface)', 'color:var(--pale)', 'border:2px solid var(--line)', 'box-shadow:0 6px 16px rgb(0 0 0 / .35)',
    'transform:translateY(-64px)',
  ].join(';')
  el.innerHTML =
    '<svg class="jp-ptr-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>'
  document.body.appendChild(el)
  return el
}

/** Attiva il gesto. `onRefresh` fa l'aggiornamento; l'indicatore resta visibile finché non finisce. Restituisce la funzione per spegnerlo. */
export function setupPullToRefresh(onRefresh: () => Promise<void>): () => void {
  let start: { x: number; y: number } | null = null
  let pulling = false
  let busy = false
  let pill: HTMLElement | null = null
  const icon = () => pill?.querySelector<SVGElement>('.jp-ptr-icon')

  const hide = () => {
    if (!pill) return
    pill.style.transition = 'transform .2s ease, opacity .2s ease'
    pill.style.opacity = '0'
    pill.style.transform = 'translateY(-64px)'
    icon()?.classList.remove('jp-spin')
    const i = icon()
    if (i) i.style.transform = ''
  }

  const onStart = (e: TouchEvent) => {
    if (busy) return
    const t = e.touches[0]
    start = canStartPull(e.target as Element | null, window.scrollY, e.touches.length, !!topDialog()) ? { x: t.clientX, y: t.clientY } : null
    pulling = false
  }

  const onMove = (e: TouchEvent) => {
    if (!start || busy) return
    const t = e.touches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (!pulling) {
      if (isPullDown(dx, dy) && window.scrollY <= 0) {
        pulling = true
        pill ??= makeIndicator()
        pill.style.transition = 'none'
      } else if (dy < -6 || Math.abs(dx) > 12) {
        start = null // sta scorrendo la pagina o va di lato: non è questo gesto
        return
      } else return
    }
    if (e.cancelable) e.preventDefault() // niente rimbalzo della pagina mentre si tira
    const pull = pullDistance(dy)
    if (pill) {
      pill.style.opacity = String(Math.min(1, pull / 40))
      pill.style.transform = `translateY(${pull - 64 + 40}px)`
      const i = icon()
      if (i) i.style.transform = `rotate(${pull >= THRESHOLD ? 180 : 0}deg)`
    }
  }

  const onEnd = (e: TouchEvent) => {
    if (!start) return
    const wasPulling = pulling
    const t = e.changedTouches[0]
    const pull = pullDistance(t.clientY - start.y)
    start = null
    pulling = false
    if (!wasPulling || !pill) return
    if (pull < THRESHOLD) return hide()
    busy = true
    pill.style.transition = 'transform .15s ease'
    pill.style.transform = 'translateY(0px)'
    const i = icon()
    if (i) i.style.transform = ''
    i?.classList.add('jp-spin')
    void onRefresh()
      .catch(() => undefined)
      .finally(() => {
        busy = false
        hide()
      })
  }

  const onCancel = () => {
    start = null
    if (pulling) hide()
    pulling = false
  }

  document.addEventListener('touchstart', onStart, { passive: true })
  document.addEventListener('touchmove', onMove, { passive: false })
  document.addEventListener('touchend', onEnd, { passive: true })
  document.addEventListener('touchcancel', onCancel, { passive: true })
  return () => {
    document.removeEventListener('touchstart', onStart)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
    document.removeEventListener('touchcancel', onCancel)
    pill?.remove()
    pill = null
  }
}
