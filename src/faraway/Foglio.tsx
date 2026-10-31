// Foglio dal basso del design system (componente Foglio): <dialog> nativo, così focus, Esc e
// il tasto «indietro» di Android funzionano come prima; si chiude anche trascinando giù la maniglia.
import type React from 'react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { stampOpen } from '../ui/dialogStack'
import { Pulsante } from './base'
import { cx } from './cx'
import { Sv } from './icons'

interface FoglioProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Pulsanti in fondo (azione primaria). */
  footer?: ReactNode
  /** Foglio a tutta altezza (moduli lunghi). */
  full?: boolean
  /** Titolo semplice centrato, senza «Chiudi» (es. conferme). */
  plain?: boolean
  /** Azione a sinistra del titolo (es. «Azzera» nei filtri); «Chiudi» va a destra. */
  headStart?: ReactNode
  className?: string
}

/** Il foglio e il suo contenitore non devono mai scorrere (scorre solo il corpo): un focus o un cambio di altezza non li sposta. */
const noScroll = (e: React.UIEvent<HTMLElement>) => {
  if (e.target === e.currentTarget && (e.currentTarget.scrollTop !== 0 || e.currentTarget.scrollLeft !== 0)) {
    e.currentTarget.scrollTop = 0
    e.currentTarget.scrollLeft = 0
  }
}

export function Foglio({ open, title, onClose, children, footer, full, plain, headStart, className }: FoglioProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startAt: number; dy: number } | null>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      if (sheet.current) sheet.current.style.transform = ''
      d.showModal()
      d.focus({ preventScroll: true })
      stampOpen(d)
      // l'apertura non deve lasciare il foglio spostato dal focus automatico
      for (const el of [d, sheet.current]) if (el) (el.scrollTop = 0, (el.scrollLeft = 0))
    }
    if (!open && d.open) d.close()
  }, [open])

  function dragStart(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === 'mouse' || !e.isPrimary) return
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { startY: e.clientY, startAt: e.timeStamp, dy: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    if (sheet.current) sheet.current.style.transition = 'none'
  }
  function dragMove(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current
    if (!d || !sheet.current) return
    d.dy = Math.max(0, e.clientY - d.startY)
    sheet.current.style.transform = `translateY(${d.dy}px)`
  }
  function dragEnd(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current
    drag.current = null
    const el = sheet.current
    if (!d || !el) return
    const speed = d.dy / Math.max(1, e.timeStamp - d.startAt)
    el.style.transition = ''
    if (e.type !== 'pointercancel' && (d.dy > 120 || (d.dy > 30 && speed > 0.5))) {
      el.style.transform = 'translateY(100%)'
      window.setTimeout(onClose, 160)
    } else el.style.transform = ''
  }

  if (!open) return <dialog ref={ref} className="fa-dlg" />
  const handle = { onPointerDown: dragStart, onPointerMove: dragMove, onPointerUp: dragEnd, onPointerCancel: dragEnd }
  return (
    <dialog
      ref={ref}
      className="fa-dlg"
      aria-label={title}
      tabIndex={-1}
      onClose={onClose}
      onScroll={noScroll}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={sheet} className={cx('fa-sheet', full && 'full', className)} onScroll={noScroll}>
        <div className="grab" aria-hidden="true" {...handle} />
        {plain ? (
          <div className="st" {...handle}>
            {title}
          </div>
        ) : headStart ? (
          <div className="hd" {...handle}>
            {headStart}
            <h2 className="st">{title}</h2>
            <button type="button" className="fa-ib" style={{ background: 'none' }} aria-label="Chiudi" onClick={onClose}>
              <Sv name="close" />
            </button>
          </div>
        ) : (
          <div className="hd" {...handle}>
            <button type="button" className="fa-ib" style={{ background: 'none' }} aria-label="Chiudi" onClick={onClose}>
              <Sv name="close" />
            </button>
            <h2 className="st">{title}</h2>
            <span />
          </div>
        )}
        <div className="fb">{children}</div>
        {footer ? (
          <div
            className="bt"
            onClick={() =>
              // se il salvataggio non va a buon fine, porta in vista il primo errore (il modulo può essere più lungo dello schermo)
              window.setTimeout(() => sheet.current?.querySelector('.fb [aria-invalid="true"], .fb [role="alert"], .fb .fa-help.bad')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250)
            }
          >
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  )
}

interface ConfirmOptions {
  title: string
  message: ReactNode
  /** Etichetta dell'azione rossa, es. «Elimina viaggio». */
  confirm: string
  /** Etichetta di chi ci ripensa, es. «Tieni il viaggio». */
  cancel: string
  destructive?: boolean
}

/** Foglio di conferma: «Eliminare …?», cosa si perde, «Elimina …» rosso e «Tieni …». */
export function useConferma(): [(o: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const ask = (o: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...o, resolve }))
  const close = (v: boolean) => {
    state?.resolve(v)
    setState(null)
  }
  const node = (
    <Foglio open={state !== null} title={state?.title ?? ''} onClose={() => close(false)} plain>
      {state ? (
        <>
          <p className="msg">{state.message}</p>
          <div className="bt">
            {state.destructive === false ? (
              <Pulsante onPress={() => close(true)}>{state.confirm}</Pulsante>
            ) : (
              <button type="button" className="fa-btn del" style={{ width: '100%', height: 48 }} onClick={() => close(true)}>
                <Sv name="trash" size={20} />
                {state.confirm}
              </button>
            )}
            <Pulsante color="secondary-soft" onPress={() => close(false)}>
              {state.cancel}
            </Pulsante>
          </div>
        </>
      ) : null}
    </Foglio>
  )
  return [ask, node]
}
