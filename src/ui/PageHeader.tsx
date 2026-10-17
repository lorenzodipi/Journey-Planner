import type { ComponentChildren } from 'preact'
import { Link } from 'wouter-preact'

interface Props {
  title: string
  subtitle?: string
  /** Se presente, mostra un link "‹ testo" che porta a `href`. */
  back?: { href: string; label: string }
  children?: ComponentChildren
}

export function PageHeader({ title, subtitle, back, children }: Props) {
  return (
    <header
      class="px-5 pb-3"
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
    >
      {back && (
        <Link href={back.href} class="-ml-2 mb-1 inline-flex min-h-11 items-center rounded-full px-2 text-sm font-medium text-accent">
          ‹ {back.label}
        </Link>
      )}
      <h1 class="font-display text-2xl font-semibold leading-tight">{title}</h1>
      {subtitle && <p class="text-sm text-muted">{subtitle}</p>}
      {children}
    </header>
  )
}

export function Card({ children, class: cls = '' }: { children: ComponentChildren; class?: string }) {
  return <section class={`rounded-card bg-surface p-4 shadow-card ${cls}`}>{children}</section>
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div class="rounded-card border border-dashed border-line px-5 py-10 text-center">
      <p class="font-display text-lg">{title}</p>
      <p class="mx-auto mt-1 max-w-xs text-sm text-muted">{text}</p>
    </div>
  )
}
