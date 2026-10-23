import { PlusIcon } from './Icons'
import type { ComponentChildren } from 'preact'

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
  class: cls = '',
}: {
  stub: ComponentChildren
  children: ComponentChildren
  stubWidth?: number
  tone?: 'line' | 'warn' | 'ok' | 'accent'
  flash?: boolean
  class?: string
}) {
  const border = { line: 'var(--line)', warn: 'var(--warn)', ok: 'var(--ok)', accent: 'var(--accent)' }[tone]
  return (
    // il bordo trasparente da 2px tiene il contenuto alla stessa distanza di sempre dal bordo disegnato
    <div class={`relative isolate flex rounded-[14px] ${cls}`} style={{ border: '2px solid transparent' }}>
      <i
        aria-hidden="true"
        class="jp-ticket-edge pointer-events-none absolute -inset-0.5 -z-10 rounded-[14px]"
        style={{ background: border, '--tx': `${stubWidth + 1}px` }}
      />
      <i
        aria-hidden="true"
        class={`jp-ticket-fill pointer-events-none absolute -z-10 rounded-xl bg-surface ${flash ? 'jp-flash' : ''}`}
        style={{ inset: 0, '--tx': `${stubWidth - 1}px` }}
      />
      <div
        class="box-border grid shrink-0 place-items-center border-r-2 border-dashed border-line px-1 py-2.5 text-center"
        style={{ width: `${stubWidth}px` }}
      >
        {stub}
      </div>
      <div class="flex min-w-0 flex-1 items-center py-3 pl-3.5 pr-1.5">{children}</div>
    </div>
  )
}

/** Tacche laterali per la carta d'imbarco (cerchi tagliati a metà sul bordo). */
export function BoardingNotches() {
  const base = {
    background: 'var(--bg)',
    border: '2px solid var(--line)',
  }
  return (
    <div class="relative h-0" aria-hidden="true">
      <i class="absolute -left-3 -top-2.5 box-border size-5 rounded-full" style={{ ...base, clipPath: 'inset(0 0 0 50%)' }} />
      <i class="absolute -right-3 -top-2.5 box-border size-5 rounded-full" style={{ ...base, clipPath: 'inset(0 50% 0 0)' }} />
    </div>
  )
}

/** Striscia tricolore in cima alle carte principali (blu, verde, arancio). */
export function Stripe() {
  return (
    <div class="flex h-2 overflow-hidden rounded-t-[18px]" aria-hidden="true">
      <i class="block flex-[3] bg-accent" />
      <i class="block flex-[2] bg-ok" />
      <i class="block flex-1 bg-secondary" />
    </div>
  )
}

type Tone = 'ok' | 'warn' | 'accent' | 'muted' | 'danger'
const toneClass: Record<Tone, string> = {
  ok: 'border-ok text-ok',
  warn: 'border-warn text-warn',
  accent: 'border-pale text-pale',
  muted: 'border-line text-muted',
  danger: 'border-danger text-danger',
}

/** Etichetta di stato: bordo 2px, testo piccolo e pesante (Prenotato, Non acquistato…). */
export function Tag({ tone, children }: { tone: Tone; children: ComponentChildren }) {
  return (
    <span class={`inline-block whitespace-nowrap rounded-md border-2 px-1.5 text-xs font-extrabold leading-snug ${toneClass[tone]}`}>
      {children}
    </span>
  )
}

/** Cerchio colorato con dentro un'icona (categoria, tipo di prenotazione…). */
export function Disc({ color, size = 40, children }: { color: string; size?: number; children: ComponentChildren }) {
  return (
    <span
      class="grid shrink-0 place-items-center rounded-full font-extrabold"
      style={{ width: `${size}px`, height: `${size}px`, background: color, color: 'var(--bg)' }}
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
      class="grid shrink-0 place-items-center rounded-full font-extrabold text-white"
      style={{ width: `${size}px`, height: `${size}px`, background: color, fontSize: `${Math.round(size * 0.46)}px` }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** Etichetta giapponese (Zen Kaku Gothic New) a lato dei titoli. */
export function Jp({ children, class: cls = '' }: { children: ComponentChildren; class?: string }) {
  return (
    <span lang="ja" aria-hidden="true" class={`font-jp text-[15px] text-pale ${cls}`}>
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
      class={`fixed right-5 z-10 inline-flex h-14 items-center justify-center gap-2 bg-accent text-[15px] font-extrabold text-accent-ink shadow-[0_6px_16px_rgb(0_0_0/0.45)] ${wide ? 'rounded-full px-5' : 'w-14 rounded-[18px]'}`}
      style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
    >
      <PlusIcon size={wide ? 22 : 28} stroke-width={2.4} />
      {wide && label}
    </button>
  )
}
