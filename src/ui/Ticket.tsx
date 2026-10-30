import type React from 'react'
import { PlusIcon } from './Icons'
import type { ReactNode } from 'react'

/**
 * Biglietto: spezzone a sinistra, strappo tratteggiato e due tacche. Le tacche sono vere aperture:
 * bordo e fondo stanno su due livelli dietro al contenuto, ciascuno con una `mask` che toglie due semicerchi
 * (in alto e in basso, sullo strappo), quindi si vede quello che c'è dietro il biglietto, mappa compresa.
 * `tone` colora il bordo (es. arancio = da fare). `flash` fa lampeggiare il fondo (tappa trovata dalla mappa).
 */
export function Ticket({
  stub,
  children,
  stubWidth = 84,
  tone = 'line',
  flash = false,
  stubFill = false,
  tint,
  className: cls = '',
}: {
  stub: ReactNode
  children: ReactNode
  stubWidth?: number
  tone?: 'line' | 'warn' | 'ok' | 'accent'
  flash?: boolean
  /** Lo spezzone senza margini, a tutta altezza (foto): angoli a sinistra arrotondati e tacche ritagliate. */
  stubFill?: boolean
  /** Biglietto colorato con una tinta del design system (azzurro, menta, limone, lavanda, confetto): testo scuro in ogni tema. */
  tint?: Tint
  className?: string
}) {
  const border = tint ? `var(--tinta-${tint})` : { line: 'var(--hairline)', warn: 'var(--warn)', ok: 'var(--ok)', accent: 'var(--accent)' }[tone]
  return (
    // il bordo trasparente da 2px tiene il contenuto alla stessa distanza di sempre dal bordo disegnato
    <div className={`relative isolate flex rounded-[18px] ${cls}`} style={{ border: '2px solid transparent', ...(tint ? TINT_SCOPE : null) }}>
      <i
        aria-hidden="true"
        className="jp-ticket-edge pointer-events-none absolute -inset-0.5 -z-10 rounded-[18px]"
        style={{ background: border, '--tx': `${stubWidth + 1}px` } as React.CSSProperties}
      />
      <i
        aria-hidden="true"
        className={`jp-ticket-fill pointer-events-none absolute -z-10 rounded-[16px] ${tint ? '' : 'bg-surface'} ${flash ? 'jp-flash' : ''}`}
        style={{ inset: 0, '--tx': `${stubWidth - 1}px`, ...(tint ? { background: `var(--tinta-${tint})` } : null) } as React.CSSProperties}
      />
      <div
        className={`box-border grid shrink-0 place-items-center border-r-2 border-dashed border-[color-mix(in_srgb,var(--ink)_28%,transparent)] text-center ${
          stubFill ? 'jp-ticket-fill relative overflow-hidden rounded-l-[16px]' : 'px-1 py-2.5'
        }`}
        style={(stubFill ? { width: `${stubWidth}px`, '--tx': `${stubWidth - 1}px` } : { width: `${stubWidth}px` }) as React.CSSProperties}
      >
        {stub}
      </div>
      <div className="flex min-w-0 flex-1 items-center py-3 pl-3.5 pr-1.5">{children}</div>
    </div>
  )
}

export type Tint = 'azzurro' | 'menta' | 'limone' | 'lavanda' | 'confetto'

/** Dentro una tinta il testo è sempre scuro (anche col tema scuro): si ridefiniscono i colori del testo. */
export const TINT_SCOPE = {
  '--ink': 'var(--on-tinta)',
  '--muted': 'var(--on-tinta-muted)',
  '--pale': '#075a99',
  '--line': '#6f7594',
  '--surface': '#ffffff',
  '--warn': '#8f5300',
  '--ok': '#096b53',
  '--accent-soft': 'rgb(255 255 255 / 0.55)',
  color: 'var(--on-tinta)',
} as Record<string, string>

/** Tacche laterali per la carta d'imbarco (cerchi tagliati a metà sul bordo). */
export function BoardingNotches() {
  const base = {
    background: 'var(--bg)',
    border: '2px solid var(--hairline)',
  }
  return (
    <div className="relative h-0" aria-hidden="true">
      <i className="absolute -left-3 -top-2.5 box-border size-5 rounded-full" style={{ ...base, clipPath: 'inset(0 0 0 50%)' }} />
      <i className="absolute -right-3 -top-2.5 box-border size-5 rounded-full" style={{ ...base, clipPath: 'inset(0 50% 0 0)' }} />
    </div>
  )
}

/** Striscia in cima alle carte principali: azzurro, menta e arancia del design system. */
export function Stripe() {
  return (
    <div className="flex h-2 overflow-hidden rounded-t-[18px]" aria-hidden="true">
      <i className="block flex-[3]" style={{ background: 'var(--cielo)' }} />
      <i className="block flex-[2]" style={{ background: 'var(--menta)' }} />
      <i className="block flex-1" style={{ background: 'var(--arancia)' }} />
    </div>
  )
}

type Tone = 'ok' | 'warn' | 'accent' | 'muted' | 'danger'
const dotClass: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  accent: 'bg-pale',
  muted: 'bg-muted',
  danger: 'bg-danger',
}

/** Etichetta di stato del design system: pillola a contorno con un pallino del colore dello stato (Prenotato, Da pagare…). */
export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-extrabold leading-[1.45rem] text-ink shadow-[inset_0_0_0_1.5px_var(--line)]">
      <i className={`size-2 rounded-full ${dotClass[tone]}`} aria-hidden="true" />
      {children}
    </span>
  )
}

/** Cerchio colorato con dentro un'icona (categoria, tipo di prenotazione…). */
export function Disc({ color, size = 40, children }: { color: string; size?: number; children: ReactNode }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-extrabold"
      style={{ width: `${size}px`, height: `${size}px`, background: color, color: 'var(--on-bright)' }}
    >
      {children}
    </span>
  )
}

/** Iniziale in un cerchio colorato (viaggiatore). */
export function Avatar({ name, color, size = 24 }: { name: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-display font-medium"
      style={{ width: `${size}px`, height: `${size}px`, background: color, color: 'var(--on-bright)', fontSize: `${Math.round(size * 0.46)}px` }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** Etichetta giapponese (Zen Kaku Gothic New) a lato dei titoli. */
export function Jp({ children, className: cls = '' }: { children: ReactNode; className?: string }) {
  return (
    <span lang="ja" aria-hidden="true" className={`font-jp text-[15px] text-pale ${cls}`}>
      {children}
    </span>
  )
}

/**
 * Pulsante "+" fisso in basso a destra, sopra la barra. Con `wide` diventa una pillola con l'etichetta
 * (Alloggio, Trasporto…); senza, è un quadrato con angoli morbidi e solo il "+".
 */
export function Fab({ label, onClick, wide = false }: { label: string; onClick: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Aggiungi ${label.toLowerCase()}`}
      title={`Aggiungi ${label.toLowerCase()}`}
      className={`fixed right-5 z-10 inline-flex h-14 items-center justify-center gap-2 bg-accent text-[15px] font-extrabold text-accent-ink shadow-[0_6px_16px_rgb(20_25_48/0.28)] ${wide ? 'rounded-full px-5' : 'w-14 rounded-full'}`}
      style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
    >
      <PlusIcon size={wide ? 22 : 28} strokeWidth={2.4} />
      {wide && label}
    </button>
  )
}
