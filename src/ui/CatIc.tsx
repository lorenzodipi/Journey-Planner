import { categoryIcon, pinIconShape } from '../lib/categoryIcon'

// Cerchio a solo bordo con il simbolo della categoria (Luoghi, Design System v3).
// Le sette categorie del mock usano i simboli `o-*` dello sprite; le altre disegnano la stessa forma con il glifo della categoria.
const OUTLINED = new Set(['temple', 'castle', 'food', 'district', 'viewpoint', 'cafe', 'shopping'])
const K = 0.02539

export function CatIc({ category, size = 48 }: { category?: string; size?: number }) {
  const icon = categoryIcon(category)
  if (OUTLINED.has(icon)) {
    return (
      <span class={`cat-ic c-${icon}`} aria-hidden="true">
        <svg width={size} height={size} viewBox="0 0 24 24">
          <use href={`#o-${icon}`} />
        </svg>
      </span>
    )
  }
  const { viewBox, d } = pinIconShape(icon)
  const [, , w, h] = viewBox.split(' ').map(Number)
  return (
    <span class={`cat-ic c-${icon}`} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10.9" fill="none" stroke="currentColor" stroke-width="1.6" />
        <g transform={`translate(${((24 - w * K) / 2).toFixed(3)} ${((24 - h * K) / 2).toFixed(3)}) scale(${K})`}>
          <path d={d} fill="currentColor" />
        </g>
      </svg>
    </span>
  )
}
