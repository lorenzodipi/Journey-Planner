import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { stampOpen } from './dialogStack'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ComponentChildren
}

/**
 * Pannello che sale dal basso (bottom sheet) basato sul <dialog> nativo:
 * focus intrappolato, tasto Esc e sfondo oscurato gestiti dal browser.
 */
export function Sheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ startY: number; startAt: number; dy: number } | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      // un trascinamento precedente può aver lasciato il pannello spostato in basso
      dialog.style.transition = ''
      dialog.style.transform = ''
      dialog.showModal()
      dialog.focus({ preventScroll: true }) // non il tasto Chiudi, che altrimenti compare cerchiato
      stampOpen(dialog)
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Trascinando verso il basso la maniglia o il titolo (solo col dito/penna) il pannello segue il gesto
  // e si chiude se lo si porta abbastanza giù o lo si lancia; altrimenti torna su.
  function dragStart(e: PointerEvent) {
    if (e.pointerType === 'mouse' || !e.isPrimary) return
    if ((e.target as HTMLElement).closest('button')) return // «Chiudi» resta un normale tocco
    drag.current = { startY: e.clientY, startAt: e.timeStamp, dy: 0 }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    if (ref.current) ref.current.style.transition = 'none'
  }

  function dragMove(e: PointerEvent) {
    const d = drag.current
    if (!d || !ref.current) return
    d.dy = Math.max(0, e.clientY - d.startY)
    ref.current.style.transform = `translateY(${d.dy}px)`
  }

  function dragEnd(e: PointerEvent) {
    const d = drag.current
    drag.current = null
    const dialog = ref.current
    if (!d || !dialog) return
    const speed = d.dy / Math.max(1, e.timeStamp - d.startAt) // px per ms
    dialog.style.transition = 'transform 180ms ease-out'
    if (e.type !== 'pointercancel' && (d.dy > 120 || (d.dy > 30 && speed > 0.5))) {
      dialog.style.transform = 'translateY(100%)'
      window.setTimeout(onClose, 160)
    } else {
      dialog.style.transform = ''
    }
  }

  if (!open) return <dialog ref={ref} />

  return (
    <dialog
      ref={ref}
      aria-label={title}
      tabIndex={-1}
      onClose={onClose}
      onClick={(e) => {
        // un tocco sullo sfondo oscurato chiude il pannello
        if (e.target === e.currentTarget) onClose()
      }}
      class="sheet fixed focus:outline-none inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[92dvh] w-full max-w-xl overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-x-0 border-b-0 border-t-2 border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/55"
    >
      <div class="px-5 pb-6 pt-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <div
          onPointerDown={dragStart}
          onPointerMove={dragMove}
          onPointerUp={dragEnd}
          onPointerCancel={dragEnd}
          class="-mx-5 -mt-3 touch-none px-5 pt-3"
        >
        <span aria-hidden="true" class="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-line" />
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="font-display text-2xl font-extrabold leading-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            class="min-h-11 shrink-0 rounded-full px-3 text-sm font-bold text-muted"
          >
            Chiudi
          </button>
        </div>
        </div>
        {children}
      </div>
    </dialog>
  )
}
