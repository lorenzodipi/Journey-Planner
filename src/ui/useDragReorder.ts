import { useEffect, useRef, useState } from 'preact/hooks'
import { dropIndex } from '../lib/dragOrder'

export interface DragState {
  from: number
  to: number
  /** spostamento verticale della riga trascinata rispetto a dov'era (in px) */
  dy: number
  /** altezza della riga trascinata + spazio tra le righe: di tanto si spostano le righe in mezzo */
  step: number
}

const GAP = 12 // lo spazio tra le righe dell'elenco (space-y-3)
const EDGE_TOP = 96
const EDGE_BOTTOM = 120 // sotto c'è la barra di navigazione
const MAX_SPEED = 14

/**
 * Trascinamento di una riga dell'elenco dalla sua maniglia (Pointer Events, nessuna libreria).
 * Sulla maniglia serve `touch-action: none`: lo scorrimento della pagina resta libero ovunque altrove.
 * Vicino ai bordi dello schermo la pagina scorre da sola; al rilascio si chiama `onDrop(from, to)`
 * e la riga resta dov'è arrivata finché il salvataggio non finisce.
 */
export function useDragReorder(onDrop: (from: number, to: number) => void | Promise<void>) {
  const listRef = useRef<HTMLUListElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const stop = useRef<(() => void) | null>(null)
  const drop = useRef(onDrop)
  drop.current = onDrop

  // se la pagina si chiude a metà trascinamento
  useEffect(() => () => stop.current?.(), [])

  function start(from: number, e: PointerEvent) {
    const ul = listRef.current
    const handle = e.currentTarget as HTMLElement
    if (!ul || drag) return
    const rows = Array.from(ul.children) as HTMLElement[]
    if (!rows[from]) return
    const scrollY0 = window.scrollY
    const rects = rows.map((r) => r.getBoundingClientRect())
    const mids = rects.map((r) => r.top + scrollY0 + r.height / 2)
    const step = rects[from].height + GAP
    const startPageY = e.clientY + scrollY0
    let clientY = e.clientY
    let current: DragState = { from, to: from, dy: 0, step }
    let raf = 0
    let ended = false

    const update = () => {
      const dy = clientY + window.scrollY - startPageY
      const to = dropIndex(mids, from, mids[from] + dy)
      current = { from, to, dy, step }
      setDrag(current)
    }
    const tick = () => {
      if (ended) return
      const h = window.innerHeight
      let speed = 0
      if (clientY < EDGE_TOP) speed = -MAX_SPEED * Math.min(1, (EDGE_TOP - clientY) / EDGE_TOP)
      else if (clientY > h - EDGE_BOTTOM) speed = MAX_SPEED * Math.min(1, (clientY - (h - EDGE_BOTTOM)) / EDGE_BOTTOM)
      if (speed !== 0) {
        const before = window.scrollY
        window.scrollBy(0, speed)
        if (window.scrollY !== before) update()
      }
      raf = requestAnimationFrame(tick)
    }
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return
      clientY = ev.clientY
      update()
    }
    const end = (commit: boolean) => {
      if (ended) return
      ended = true
      cancelAnimationFrame(raf)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', cancel)
      try {
        handle.releasePointerCapture(e.pointerId)
      } catch {
        /* già rilasciato */
      }
      stop.current = null
      if (commit && current.to !== current.from) {
        // la riga resta nel posto di arrivo finché il salvataggio non è finito: niente rimbalzo al posto vecchio
        setDrag({ ...current, dy: mids[current.to] - mids[from] })
        void Promise.resolve(drop.current(current.from, current.to)).finally(() => setDrag(null))
      } else setDrag(null)
    }
    const up = (ev: PointerEvent) => ev.pointerId === e.pointerId && end(true)
    const cancel = (ev: PointerEvent) => ev.pointerId === e.pointerId && end(false)

    try {
      handle.setPointerCapture(e.pointerId)
    } catch {
      /* senza cattura il trascinamento funziona comunque finché il dito resta sulla maniglia */
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', cancel)
    stop.current = () => end(false)
    raf = requestAnimationFrame(tick)
    update()
  }

  return { listRef, drag, start }
}
