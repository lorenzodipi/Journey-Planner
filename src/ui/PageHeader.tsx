import type { ComponentChildren } from 'preact'

interface Props {
  title: string
  subtitle?: string
  children?: ComponentChildren
}

export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <header
      class="px-5 pb-4"
      style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
    >
      <h1 class="font-display text-3xl font-semibold leading-tight">{title}</h1>
      {subtitle && <p class="mt-1 text-sm text-muted">{subtitle}</p>}
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
