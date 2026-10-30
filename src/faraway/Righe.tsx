// Righe e card che si aprono in linea (regola di Lorenzo: niente modali per i dettagli).
// Una sola aperta per lista: aprirne una chiude la precedente; freccia che ruota e aria-expanded.
import type { ReactNode } from 'react'
import { useCallback, useEffect, useId, useState } from 'react'
import { Ic } from '../ui/Sprite'
import { cx } from './cx'
import { Sv, type SvName } from './icons'

/** Quale elemento della lista è aperto (uno solo). Il tasto «indietro» di Android lo chiude prima di tornare indietro. */
export function useUnaAperta<T extends string = string>(initial: T | null = null) {
  const [open, setOpen] = useState<T | null>(initial)
  const toggle = useCallback((id: T) => setOpen((cur) => (cur === id ? null : id)), [])
  useEffect(() => {
    if (open === null) return
    const root = document.documentElement
    root.setAttribute('data-card-open', '')
    const onClose = () => setOpen(null)
    window.addEventListener('fa:close-card', onClose)
    return () => {
      root.removeAttribute('data-card-open')
      window.removeEventListener('fa:close-card', onClose)
    }
  }, [open])
  return { open, toggle, setOpen, isOpen: (id: T) => open === id }
}

interface RigaProps {
  /** Nome del simbolo a disco (es. «i-sez-food»), o un nodo già pronto. */
  icon?: string | ReactNode
  title: ReactNode
  sub?: ReactNode
  end?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}

/** Riga di lista apribile (.fa-xr): tocco sulla riga = apre/chiude i dettagli sotto. */
export function RigaApribile({ icon, title, sub, end, open, onToggle, children, className }: RigaProps) {
  const id = useId()
  return (
    <div className={cx('fa-xr', open && 'open', className)}>
      <button type="button" className="fa-row" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        {typeof icon === 'string' ? <Ic name={icon} size={44} /> : icon ?? <span />}
        <span style={{ minWidth: 0 }}>
          <span className="t" style={{ display: 'block' }}>
            {title}
          </span>
          {sub ? (
            <span className="s" style={{ display: 'block' }}>
              {sub}
            </span>
          ) : null}
        </span>
        <span className="end">
          {end}
          <Sv name="chev" size={20} className="chev" />
        </span>
      </button>
      <div className="fa-xd" id={id} hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  )
}

/** Riga chiave-valore dentro una card aperta: icona, titolo e sottotitolo. */
export function KV({ icon, title, sub }: { icon: SvName; title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="kv">
      <Sv name={icon} size={20} />
      <div>
        <div className="t">{title}</div>
        {sub ? <div className="s">{sub}</div> : null}
      </div>
    </div>
  )
}

/** Azioni dentro una card aperta (Modifica, Sposta, Elimina…). */
export function Azioni({ children }: { children: ReactNode }) {
  return <div className="acts">{children}</div>
}

export function AzioneModifica({ onPress, label = 'Modifica' }: { onPress: () => void; label?: string }) {
  return (
    <button type="button" className="fa-btn sm out" onClick={onPress}>
      <Sv name="pencil" size={18} />
      {label}
    </button>
  )
}

export function AzioneElimina({ onPress, label = 'Elimina' }: { onPress: () => void; label?: string }) {
  return (
    <button type="button" className="fa-btn sm del" style={{ color: 'var(--danger)' }} onClick={onPress}>
      <Sv name="trash" size={18} />
      {label}
    </button>
  )
}

/** Riga semplice (link o pulsante) con icona a disco, testo e freccia. */
export function Riga({ icon, title, sub, end, onPress, href, chevron = true }: { icon?: string | ReactNode; title: ReactNode; sub?: ReactNode; end?: ReactNode; onPress?: () => void; href?: string; chevron?: boolean }) {
  const inner = (
    <>
      {typeof icon === 'string' ? <Ic name={icon} size={44} /> : icon ?? <span />}
      <span style={{ minWidth: 0 }}>
        <span className="t" style={{ display: 'block' }}>
          {title}
        </span>
        {sub ? (
          <span className="s" style={{ display: 'block' }}>
            {sub}
          </span>
        ) : null}
      </span>
      <span className="end">
        {end}
        {chevron ? <Sv name="chevr" size={20} className="chev" /> : null}
      </span>
    </>
  )
  if (href)
    return (
      <a className="fa-row" href={href}>
        {inner}
      </a>
    )
  return (
    <button type="button" className="fa-row" onClick={onPress}>
      {inner}
    </button>
  )
}
