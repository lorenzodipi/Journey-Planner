import { categoryIcon, pinIconShape } from '../lib/categoryIcon'
import { Disc } from './Ticket'

/** Cerchio colorato con l'icona della categoria (Cibo, Visita, Alloggio…). */
export function PlaceDisc({ category, color, size = 40 }: { category?: string; color: string; size?: number }) {
  return (
    <Disc color={color} size={size}>
      <PinGlyph category={category} size={Math.round(size * 0.5)} />
    </Disc>
  )
}

/** Etichetta della categoria, con il bordo del suo colore. */
export function CategoryTag({ label, color }: { label: string; color: string }) {
  return (
    <span class="inline-block whitespace-nowrap rounded-md border-2 px-1.5 text-xs font-extrabold leading-snug" style={{ borderColor: color, color }}>
      {label}
    </span>
  )
}

function PinGlyph({ category, size }: { category?: string; size: number }) {
  const { viewBox, d } = pinIconShape(categoryIcon(category))
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
