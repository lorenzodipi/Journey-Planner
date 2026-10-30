import type { ReactNode } from 'react'
import { Link } from 'wouter'

export const ChevronLeft = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const ChevronRight = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5l7 7-7 7" />
  </svg>
)

interface Props {
  title: string
  subtitle?: string
  /** Se presente, mostra il link «‹ testo» che porta a `href`. */
  back?: { href: string; label: string }
  /** Pulsanti tondi a destra del titolo (.rbtn). */
  actions?: ReactNode
  /** Sotto la riga del titolo, dentro la testata (es. meteo, orologi). */
  children?: ReactNode
  className?: string
}

/** Testata del Design System v3: titolo display-md, sottotitolo, azioni tonde su surface-high. */
export function PageHeader({ title, subtitle, back, actions, children, className: cls = '' }: Props) {
  return (
    <header className={`hero ${cls}`.trim()}>
      {back && (
        <Link href={back.href} className="hback">
          <ChevronLeft />
          <span>{back.label}</span>
        </Link>
      )}
      <div className="hrow">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="hsub">{subtitle}</p>}
        </div>
        <div className="acts">{actions}</div>
      </div>
      {children}
    </header>
  )
}

/** Riquadro base del Design System. */
export function Card({ children, className: cls = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${cls}`.trim()}>{children}</section>
}

/** Stato vuoto: scena + titolo + testo (come nei mock). */
export function EmptyState({ title, text, art }: { title: string; text: string; art?: string }) {
  return (
    <div className="card empty">
      {art && <img src={art} alt="" width="112" height="84" />}
      <p className="h-sm" style={{ marginTop: art ? '12px' : 0 }}>{title}</p>
      <p className="b-sm muted" style={{ marginTop: '4px' }}>{text}</p>
    </div>
  )
}
