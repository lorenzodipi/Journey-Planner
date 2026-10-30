import { categoryIcon, pinIconShape } from '../lib/categoryIcon'

/** Colore del testo di una categoria: il suo colore, scurito col tema chiaro e schiarito con lo scuro (contrasto sempre leggibile). */
export const categoryInk = (color: string) => `color-mix(in srgb, ${color} 62%, var(--ink))`

/** Icona della categoria (Cibo, Visita, Alloggio…): cerchio con solo il bordo colorato e il simbolo dentro, senza riempimento. */
export function PlaceDisc({ category, color, size = 40 }: { category?: string; color: string; size?: number }) {
  const ink = categoryInk(color)
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: `${size}px`, height: `${size}px`, color: ink, boxShadow: `inset 0 0 0 2px ${ink}` }}
    >
      <PinGlyph category={category} size={Math.round(size * 0.46)} />
    </span>
  )
}

/** Etichetta della categoria, con il bordo del suo colore. */
export function CategoryTag({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-full px-2.5 text-xs font-extrabold leading-[1.45rem]" style={{ boxShadow: `inset 0 0 0 1.5px ${categoryInk(color)}`, color: categoryInk(color) }}>
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
