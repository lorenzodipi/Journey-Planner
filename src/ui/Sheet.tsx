import type React from 'react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { stampOpen } from './dialogStack'
import { CloseG } from './glyphs'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
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
  function dragStart(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === 'mouse' || !e.isPrimary) return
    if ((e.target as HTMLElement).closest('button')) return // «Chiudi» resta un normale tocco
    drag.current = { startY: e.clientY, startAt: e.timeStamp, dy: 0 }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    if (ref.current) ref.current.style.transition = 'none'
  }

  function dragMove(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current
    if (!d || !ref.current) return
    d.dy = Math.max(0, e.clientY - d.startY)
    ref.current.style.transform = `translateY(${d.dy}px)`
  }

  function dragEnd(e: React.PointerEvent<HTMLElement>) {
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
      className="fsheet sheet-dlg"
    >
      <div className="fsheet-in">
        <div onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd} className="fsheet-head">
          <span aria-hidden="true" className="grab" />
          <div className="tr">
            <h2 className="h-md">{title}</h2>
            <button type="button" className="rbtn" aria-label="Chiudi" onClick={onClose}>
              <CloseG />
            </button>
          </div>
        </div>
        {children}
      </div>
    </dialog>
  )
}
