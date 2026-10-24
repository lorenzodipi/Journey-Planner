import type { ComponentChildren } from 'preact'
import { useId } from 'preact/hooks'

/** Scontrino: carta chiara con il bordo inferiore a zig-zag. Colori: --paper, --paper-ink, --paper-muted. */
export function Receipt({ children, class: cls = '' }: { children: ComponentChildren; class?: string }) {
  const id = useId().replace(/[^a-z0-9]/gi, '')
  return (
    <section class={`rise text-paper-ink ${cls}`}>
      <div class="rounded-t-[20px] border border-b-0 border-hairline bg-paper px-5 pb-3.5 pt-5">{children}</div>
      <svg width="100%" height="10" aria-hidden="true" class="block">
        <defs>
          <pattern id={`z${id}`} width="20" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 0H20L10 10z" fill="var(--paper)" />
          </pattern>
        </defs>
        <rect width="100%" height="10" fill={`url(#z${id})`} />
      </svg>
    </section>
  )
}

/** Riga con i puntini guida: etichetta ..... valore. */
export function Leader({ label, value, big = false, bold = true }: { label: string; value: string; big?: boolean; bold?: boolean }) {
  const size = big ? 'text-lg' : 'text-base'
  const weight = bold ? 'font-extrabold' : 'font-semibold'
  return (
    <div class="flex items-baseline gap-1.5">
      <span class={`${size} ${weight}`}>{label}</span>
      <i class="mb-1 flex-1 border-b-2 border-dotted border-paper-muted/60" />
      <span class={`${size} ${weight} tabular-nums`}>{value}</span>
    </div>
  )
}

export const DASH = 'border-t-2 border-dashed border-paper-muted/60'
