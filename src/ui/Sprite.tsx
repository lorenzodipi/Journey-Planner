import { SPRITE } from './spriteData'

/** Le icone del Design System (dischi colorati con il glifo scuro): si disegnano una volta sola, poi si richiamano con <Ic name="i-..."/>. */
export function Sprite() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute' }}
      aria-hidden="true"
      focusable="false"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: `<defs>${SPRITE}</defs>` }}
    />
  )
}

/** Icona del Design System, per nome del simbolo (es. "i-nav-today", "i-cat-temple", "g-food"). */
export function Ic({ name, size = 24, class: cls = '' }: { name: string; size?: number; class?: string }) {
  return (
    <svg class={`ic ${cls}`.trim()} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  )
}
