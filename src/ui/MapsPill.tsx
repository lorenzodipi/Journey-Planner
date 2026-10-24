import { PinIcon } from './Icons'

/** «Apri sulla mappa»: pillola con il pin su un cerchio verde acqua (design system). Si apre in Google Maps. */
export function MapsPill({ href, label, text = 'Apri sulla mappa', compact = false }: { href: string; label: string; text?: string; compact?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Apri in Google Maps: ${label}`}
      class={`inline-flex h-11 shrink-0 touch-manipulation items-center gap-2 whitespace-nowrap rounded-full bg-surface text-sm font-bold text-ink shadow-[inset_0_0_0_1.5px_var(--line)] ${compact ? 'pl-1.5 pr-3' : 'pl-2 pr-4'}`}
    >
      <span class="grid size-8 place-items-center rounded-full" style={{ background: 'var(--menta)', color: 'var(--on-bright)' }}>
        <PinIcon size={15} />
      </span>
      {text}
    </a>
  )
}
