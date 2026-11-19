// Riordino a trascinamento delle tappe senza orario (#88). I calcoli stanno in lib/dragOrder; qui c'è la parte con i tocchi:
// si afferra la maniglia (subito) o si tiene premuto su tutta la card per mezzo secondo (anche aperta), la tappa segue il
// dito, le altre si fanno da parte, al rilascio si scrive il nuovo ordine. Il posto d'arrivo dipende da dove sta il dito,
// non dal centro della card: così anche una card aperta, alta, sale e scende come le altre.
// Da tastiera: sulla maniglia, frecce su/giù spostano la tappa di un posto.
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dropIndex } from '../lib/dragOrder'

interface Geo {
  tops: number[]
  hs: number[]
  mids: number[]
}
interface Stato {
  from: number
  to: number
  dy: number
}

/** Misura i blocchi della lista (una tappa con il suo spostamento che la precede), in coordinate della pagina. */
function misura(ol: HTMLElement): Geo | null {
  const tops: number[] = []
  const bottoms: number[] = []
  let seg: number | null = null
  for (const el of Array.from(ol.children) as HTMLElement[]) {
    const r = el.getBoundingClientRect()
    if (el.classList.contains('seg')) {
      seg = r.top + window.scrollY
      continue
    }
    tops.push(seg ?? r.top + window.scrollY)
    bottoms.push(r.bottom + window.scrollY)
    seg = null
  }
  if (tops.length === 0) return null
  const hs = tops.map((t, i) => bottoms[i] - t)
  return { tops, hs, mids: tops.map((t, i) => t + hs[i] / 2) }
}

export function useTrascinaTappe(listRef: RefObject<HTMLElement | null>, count: number, onDrop: (from: number, to: number) => void) {
  const [st, setSt] = useState<Stato | null>(null)
  const geo = useRef<Geo | null>(null)
  const from = useRef(0)
  const start = useRef({ y: 0, sy: 0 })
  // pressione lunga in attesa (prima che parta il trascinamento)
  const attesa = useRef<(() => void) | null>(null)
  const ptr = useRef(0)
  const raf = useRef(0)
  const stop = useRef<(() => void) | null>(null)
  const dropRef = useRef(onDrop)
  dropRef.current = onDrop

  const aggiorna = useCallback(() => {
    const g = geo.current
    if (!g) return null
    const f = from.current
    const mosso = ptr.current - start.current.y + (window.scrollY - start.current.sy)
    // la card si vede spostata solo dentro la lista; il posto d'arrivo segue il dito anche oltre
    const min = g.tops[0] - g.tops[f]
    const max = g.tops[g.tops.length - 1] + g.hs[g.hs.length - 1] - (g.tops[f] + g.hs[f])
    const dy = Math.min(max, Math.max(min, mosso))
    // il dito, in coordinate della pagina
    const dito = start.current.y + start.current.sy + mosso
    const next = { from: f, to: dropIndex(g.mids, f, dito), dy }
    setSt(next)
    return next
  }, [])

  /** Fa partire il trascinamento della tappa `index` con il dito a `clientY`. `daPressione`: partito tenendo premuta la card. */
  const avvia = useCallback(
    (clientY: number, index: number, daPressione: boolean) => {
      const ol = listRef.current
      if (!ol) return
      const g = misura(ol)
      if (!g) return
      geo.current = g
      from.current = index
      start.current = { y: clientY, sy: window.scrollY }
      ptr.current = clientY
      setSt({ from: index, to: index, dy: 0 })
      const move = (ev: PointerEvent) => {
        ptr.current = ev.clientY
        aggiorna()
      }
      // dopo la pressione lunga il dito non deve più far scorrere la pagina
      const blocca = (ev: TouchEvent) => ev.preventDefault()
      const fine = (ev: Event) => {
        const s = aggiorna()
        chiudi()
        if (ev.type !== 'pointercancel' && s && s.to !== s.from) dropRef.current(s.from, s.to)
        if (daPressione) {
          // il rilascio non deve anche aprire o chiudere la card
          const mangia = (c: Event) => {
            c.stopPropagation()
            c.preventDefault()
          }
          window.addEventListener('click', mangia, { capture: true, once: true })
          window.setTimeout(() => window.removeEventListener('click', mangia, { capture: true }), 400)
        }
      }
      const esc = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') chiudi()
      }
      const tick = () => {
        // vicino al bordo dello schermo la pagina scorre da sola
        if (ptr.current < 96) window.scrollBy(0, -12)
        else if (ptr.current > window.innerHeight - 140) window.scrollBy(0, 12)
        aggiorna()
        raf.current = requestAnimationFrame(tick)
      }
      const chiudi = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', fine)
        window.removeEventListener('pointercancel', fine)
        window.removeEventListener('keydown', esc)
        window.removeEventListener('touchmove', blocca)
        cancelAnimationFrame(raf.current)
        stop.current = null
        geo.current = null
        setSt(null)
      }
      stop.current = chiudi
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', fine)
      window.addEventListener('pointercancel', fine)
      window.addEventListener('keydown', esc)
      if (daPressione) window.addEventListener('touchmove', blocca, { passive: false })
      raf.current = requestAnimationFrame(tick)
    },
    [aggiorna, listRef],
  )

  /** Maniglia: il trascinamento parte subito. */
  const inizia = useCallback(
    (e: ReactPointerEvent<HTMLElement>, index: number) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      attesa.current?.()
      avvia(e.clientY, index, false)
    },
    [avvia],
  )

  /**
   * Tutta la card: tenendo premuto mezzo secondo senza muovere il dito parte il trascinamento; se il dito si muove prima
   * (si sta scorrendo) o si alza (è un tocco) non succede niente. Non parte dai campi e dai link.
   */
  const premi = useCallback(
    (e: ReactPointerEvent<HTMLElement>, index: number) => {
      if ((e.pointerType === 'mouse' && e.button !== 0) || stop.current) return
      if ((e.target as HTMLElement).closest('input, textarea, select, a[href]')) return
      attesa.current?.()
      const id = e.pointerId
      const x0 = e.clientX
      const y0 = e.clientY
      const sy0 = window.scrollY
      let y = y0
      const muovi = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return
        y = ev.clientY
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) pulisci()
      }
      // la pagina che scorre davvero (rotellina, scorrimento) annulla; i piccoli assestamenti no
      const scorre = () => {
        if (Math.abs(window.scrollY - sy0) > 8) pulisci()
      }
      const pulisci = () => {
        window.clearTimeout(timer)
        window.removeEventListener('pointermove', muovi)
        window.removeEventListener('pointerup', pulisci)
        window.removeEventListener('pointercancel', pulisci)
        window.removeEventListener('scroll', scorre)
        attesa.current = null
      }
      const timer = window.setTimeout(() => {
        pulisci()
        navigator.vibrate?.(15)
        avvia(y, index, true)
      }, 500)
      window.addEventListener('pointermove', muovi)
      window.addEventListener('pointerup', pulisci)
      window.addEventListener('pointercancel', pulisci)
      window.addEventListener('scroll', scorre)
      attesa.current = pulisci
    },
    [avvia],
  )

  useEffect(
    () => () => {
      attesa.current?.()
      stop.current?.()
    },
    [],
  )

  const tasto = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>, index: number) => {
      const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
      if (!step) return
      e.preventDefault()
      const to = index + step
      if (to >= 0 && to < count) dropRef.current(index, to)
    },
    [count],
  )

  /** Di quanti pixel va spostato il blocco `i` mentre si trascina. */
  const spostamento = (i: number): number => {
    const g = geo.current
    if (!st || !g) return 0
    if (i === st.from) return st.dy
    const ordine = g.tops.map((_, k) => k).filter((k) => k !== st.from)
    ordine.splice(st.to, 0, st.from)
    let y = g.tops[0]
    for (const k of ordine) {
      if (k === i) return y - g.tops[i]
      y += g.hs[k]
    }
    return 0
  }

  return { trascinata: st?.from ?? null, inizia, premi, tasto, spostamento }
}
