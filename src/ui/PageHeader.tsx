import type { ComponentChildren } from 'preact'
import { Link } from 'wouter-preact'

export const ChevronLeft = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const ChevronRight = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M9 5l7 7-7 7" />
  </svg>
)

interface Props {
  title: string
  subtitle?: string
  /** Se presente, mostra il link «‹ testo» che porta a `href`. */
  back?: { href: string; label: string }
  /** Pulsanti tondi a destra del titolo (.rbtn). */
  actions?: ComponentChildren
  /** Sotto la riga del titolo, dentro la testata (es. meteo, orologi). */
  children?: ComponentChildren
  class?: string
}

/** Testata del Design System v3: titolo display-md, sottotitolo, azioni tonde su surface-high. */
export function PageHeader({ title, subtitle, back, actions, children, class: cls = '' }: Props) {
  return (
    <header class={`hero ${cls}`.trim()}>
      {back && (
        <Link href={back.href} class="hback">
          <ChevronLeft />
          <span>{back.label}</span>
        </Link>
      )}
      <div class="hrow">
        <div>
          <h1>{title}</h1>
          {subtitle && <p class="hsub">{subtitle}</p>}
        </div>
        <div class="acts">{actions}</div>
      </div>
      {children}
    </header>
  )
}

/** Riquadro base del Design System. */
export function Card({ children, class: cls = '' }: { children: ComponentChildren; class?: string }) {
  return <section class={`card ${cls}`.trim()}>{children}</section>
}

/** Stato vuoto: scena + titolo + testo (come nei mock). */
export function EmptyState({ title, text, art }: { title: string; text: string; art?: string }) {
  return (
    <div class="card empty">
      {art && <img src={art} alt="" width="112" height="84" />}
      <p class="h-sm" style={{ marginTop: art ? '12px' : 0 }}>{title}</p>
      <p class="b-sm muted" style={{ marginTop: '4px' }}>{text}</p>
    </div>
  )
}
