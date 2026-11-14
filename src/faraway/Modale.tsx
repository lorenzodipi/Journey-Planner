// Modale al centro dello schermo, per i momenti importanti: la conferma di un'azione che non si può annullare
// (eliminare un viaggio) e l'esito che va letto (viaggio eliminato). <dialog> nativo: focus intrappolato, Esc e
// «indietro» di Android chiudono come nei fogli. I fogli dal basso restano per tutto il resto.
import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { stampOpen } from '../ui/dialogStack'
import { Pulsante } from './base'
import { cx } from './cx'
import { useBloccaSotto } from './bloccaSotto'
import { Sv } from './icons'
import type { SvName } from './icons'

interface ModaleProps {
  open: boolean
  title: string
  children: ReactNode
  /** Pulsanti in fondo, uno sotto l'altro. */
  actions: ReactNode
  onClose: () => void
  /** Disco sopra il titolo (es. spunta per un esito andato bene). */
  icon?: { name: SvName; tone: 'ok' | 'danger' }
  /** Conferme: si chiudono solo con i pulsanti, non toccando il velo. */
  alert?: boolean
}

export function Modale({ open, title, children, actions, onClose, icon, alert }: ModaleProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const bodyId = useId()
  useBloccaSotto(ref, open)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // il focus va al modale, non al primo pulsante: niente anello di focus a sorpresa sul tocco
      d.focus({ preventScroll: true })
      stampOpen(d)
    }
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="fa-mod"
      tabIndex={-1}
      role={alert ? 'alertdialog' : 'dialog'}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (!alert && e.target === e.currentTarget) onClose()
      }}
    >
      {open ? (
        <div className="box">
          {icon ? (
            <span className={cx('dk', icon.tone)} aria-hidden="true">
              <Sv name={icon.name} size={24} />
            </span>
          ) : null}
          <h2 id={titleId} className="tt">
            {title}
          </h2>
          <div id={bodyId} className="tx">
            {children}
          </div>
          <div className="ac">{actions}</div>
        </div>
      ) : null}
    </dialog>
  )
}

interface ConfermaOpts {
  title: string
  message: ReactNode
  confirm: string
  cancel: string
}

/** Conferma al centro per le azioni definitive: «Elimina …» rosso sopra, «Tieni …» sotto, stessa forma. */
export function useConfermaCentrata(): [(o: ConfermaOpts) => Promise<boolean>, ReactNode] {
  const [state, setState] = useState<(ConfermaOpts & { resolve: (v: boolean) => void }) | null>(null)
  const ask = (o: ConfermaOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve }))
  const close = (v: boolean) => {
    state?.resolve(v)
    setState(null)
  }
  const node = (
    <Modale
      open={state !== null}
      alert
      title={state?.title ?? ''}
      icon={{ name: 'trash', tone: 'danger' }}
      onClose={() => close(false)}
      actions={
        <>
          <button type="button" className="fa-btn del" style={{ width: '100%', height: 48 }} onClick={() => close(true)}>
            <Sv name="trash" size={20} />
            {state?.confirm}
          </button>
          <Pulsante color="secondary-soft" onPress={() => close(false)}>
            {state?.cancel}
          </Pulsante>
        </>
      }
    >
      {state?.message}
    </Modale>
  )
  return [ask, node]
}
