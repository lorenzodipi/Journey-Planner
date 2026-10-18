import type { ComponentChildren } from 'preact'
import { Link } from 'wouter-preact'
import { Jp } from './Ticket'

interface Props {
  title: string
  subtitle?: string
  /** Se presente, mostra un link "‹ testo" che porta a `href`. */
  back?: { href: string; label: string }
  /** Etichetta giapponese a destra del titolo (solo schede principali). */
  jp?: string
  /** Testo piccolo a destra del titolo (es. «19 in tutto»). */
  aside?: string
  children?: ComponentChildren
}

export function PageHeader({ title, subtitle, back, jp, aside, children }: Props) {
  return (
    <header class="px-5 pb-3" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
      {back && (
        <Link href={back.href} class="-ml-1 inline-flex min-h-11 items-center text-[15px] font-extrabold text-pale">
          ‹ {back.label}
        </Link>
      )}
      <div class="flex items-center justify-between gap-3">
        <h1 class="font-display text-[28px] font-extrabold leading-tight">{title}</h1>
        {jp && <Jp>{jp}</Jp>}
        {aside && <span class="text-[13px] text-muted">{aside}</span>}
      </div>
      {subtitle && <p class="mt-0.5 text-sm text-muted">{subtitle}</p>}
      {children}
    </header>
  )
}

/** Riquadro base: sfondo surface, bordo 2px, angoli morbidi. */
export function Card({ children, class: cls = '' }: { children: ComponentChildren; class?: string }) {
  return <section class={`rounded-2xl border-2 border-line bg-surface p-4 ${cls}`}>{children}</section>
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div class="rounded-2xl border-2 border-dashed border-line px-5 py-10 text-center">
      <p class="font-display text-lg">{title}</p>
      <p class="mx-auto mt-1 max-w-xs text-sm text-muted">{text}</p>
    </div>
  )
}
