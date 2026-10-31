// Dischi colorati nello stile dello sprite del design system (glifo pieno, in grassetto) con un colore a scelta.
import { faUser, faWifi, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { SPRITE } from '../ui/spriteData'

const SIMBOLI = SPRITE.replace(/\\"/g, '"')

/** Un disco dello sprite (es. «i-azi-swap») con un altro colore di fondo. */
export function DiscoSprite({ name, colore, size = 44 }: { name: string; colore: string; size?: number }) {
  const m = new RegExp(`<symbol id="${name}"[^>]*>(.*?)</symbol>`, 's').exec(SIMBOLI)
  const inner = (m?.[1] ?? '').replace(/(<rect[^>]*fill=")#\w+(")/, `$1${colore}$2`)
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }} dangerouslySetInnerHTML={{ __html: inner }} />
}

/** Disco con un glifo pieno di Font Awesome, stessa scala e stesso colore del glifo dello sprite. */
export function DiscoGlifo({ icona, colore, size = 44 }: { icona: IconDefinition; colore: string; size?: number }) {
  const [w, h, , , path] = icona.icon
  const k = 13 / Math.max(w, h)
  const d = Array.isArray(path) ? path.join('') : path
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
      <rect width="24" height="24" rx="12" fill={colore} />
      <g transform={`translate(${(24 - w * k) / 2} ${(24 - h * k) / 2}) scale(${k})`}>
        <path d={d} fill="#333333" />
      </g>
    </svg>
  )
}

export const GLIFI = { persona: faUser, rete: faWifi }
