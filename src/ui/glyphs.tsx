// Segni a tratto del Design System v3 (stesse forme e spessori dei mock). Prendono il colore da currentColor.
import type { ComponentChildren } from 'preact'

function G({ size, sw = 2.2, children }: { size: number; sw?: number; children: ComponentChildren }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={sw} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
type P = { size?: number; sw?: number }
export const CheckG = ({ size = 20, sw = 2.6 }: P) => <G size={size} sw={sw}><path d="M5 12.5l4.5 4.5L19 7.5" /></G>
export const PlusG = ({ size = 20, sw = 2.6 }: P) => <G size={size} sw={sw}><path d="M12 5v14M5 12h14" /></G>
export const MinusG = ({ size = 20, sw = 2.6 }: P) => <G size={size} sw={sw}><path d="M5 12h14" /></G>
export const ArrowRightG = ({ size = 20, sw = 2.6 }: P) => <G size={size} sw={sw}><path d="M5 12h14M13 6l6 6-6 6" /></G>
export const ChevronRightG = ({ size = 20, sw = 2.6 }: P) => <G size={size} sw={sw}><path d="M9 5l7 7-7 7" /></G>
export const ChevronLeftG = ({ size = 20, sw = 2.6 }: P) => <G size={size} sw={sw}><path d="M15 5l-7 7 7 7" /></G>
export const ChevronDownG = ({ size = 20, sw = 2.2 }: P) => <G size={size} sw={sw}><path d="M5 9l7 7 7-7" /></G>
export const ChevronDownG2 = ({ size = 20, sw = 2.5 }: P) => <G size={size} sw={sw}><path d="M6 9l6 6 6-6" /></G>
export const SearchG = ({ size = 20, sw = 2.2 }: P) => <G size={size} sw={sw}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></G>
export const ClockG = ({ size = 14, sw = 2.4 }: P) => <G size={size} sw={sw}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></G>
export const CloseG = ({ size = 20, sw = 2.2 }: P) => <G size={size} sw={sw}><path d="M6 6l12 12M18 6L6 18" /></G>
export const SendG = ({ size = 16, sw = 2.2 }: P) => <G size={size} sw={sw}><path d="M3 11l19-9-9 19-2-8-8-2z" /></G>
export const TrashG = ({ size = 20, sw = 2.2 }: P) => <G size={size} sw={sw}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" /></G>
export const SwapG = ({ size = 20, sw = 2.2 }: P) => <G size={size} sw={sw}><path d="M7 4l-3.5 3.5L7 11M3.5 7.5h14M17 13l3.5 3.5L17 20M20.5 16.5h-14" /></G>
export const FilterG = ({ size = 20, sw = 2.2 }: P) => <G size={size} sw={sw}><path d="M4 6h16M7 12h10M10 18h4" /></G>
export const CalendarG = ({ size = 20, sw = 2.2 }: P) => <G size={size} sw={sw}><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></G>
export const UserG = ({ size = 20, sw = 2.2 }: P) => <G size={size} sw={sw}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></G>
/** Spunta del nodo «fatto» nello stepper (M6.5 12.5…), piena larghezza del nodo. */
export const NodeCheck = ({ sw = 2.6 }: { sw?: number }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.5 12.5l3.8 3.8 7.2-8" fill="none" stroke="currentColor" stroke-width={sw} stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

/** Simbolo di Faraway (mongolfiera ad anello) sulla tinta azzurra, come nei biglietti dei mock. */
export function LogoSym({ width = 40, height = 47, class: cls = '', style }: { width?: number; height?: number; class?: string; style?: Record<string, string | number> }) {
  return (
    <svg class={`logo-sym ${cls}`.trim()} viewBox="2 2 124 146" width={width} height={height} aria-hidden="true" style={style}>
      <path d="M50 110L58 126M78 110L70 126" stroke="var(--azzurro-solid)" stroke-width="3.4" stroke-linecap="round" fill="none" />
      <rect x="53" y="125" width="22" height="16" rx="4.5" fill="var(--azzurro-solid)" />
      <circle cx="64" cy="24" r="17" fill="var(--pomodoro)" stroke="var(--tinta-azzurro)" stroke-width="3" />
      <circle cx="64" cy="24" r="5.5" fill="var(--tinta-azzurro)" />
      <circle cx="95.27" cy="39.06" r="17" fill="var(--arancia)" stroke="var(--tinta-azzurro)" stroke-width="3" />
      <circle cx="103" cy="72.9" r="17" fill="var(--limone)" stroke="var(--tinta-azzurro)" stroke-width="3" />
      <circle cx="81.36" cy="100.04" r="17" fill="var(--menta)" stroke="var(--tinta-azzurro)" stroke-width="3" />
      <circle cx="46.64" cy="100.04" r="17" fill="var(--cielo)" stroke="var(--tinta-azzurro)" stroke-width="3" />
      <circle cx="25" cy="72.9" r="17" fill="var(--azzurro-solid)" stroke="var(--tinta-azzurro)" stroke-width="3" />
      <circle cx="32.73" cy="39.06" r="17" fill="var(--confetto)" stroke="var(--tinta-azzurro)" stroke-width="3" />
    </svg>
  )
}

/** Anello di avanzamento (come .ring nei mock): `value` da 0 a 1. */
export function Ring({ value, size = 64, label, tone = 'card' }: { value: number; size?: number; label: string; tone?: 'card' | 'high' }) {
  const c = 2 * Math.PI * 40
  const v = Math.max(0, Math.min(1, value))
  return (
    <div class="pring" style={{ width: `${size}px`, height: `${size}px` }}>
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r="40" fill="none" style={{ stroke: tone === 'card' ? 'var(--surface-high)' : 'var(--surface-card)' }} stroke-width="12" />
        <circle cx="48" cy="48" r="40" fill="none" style={{ stroke: 'var(--azzurro-solid)' }} stroke-width="12" stroke-linecap="round" stroke-dasharray={`${(c * v).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 48 48)" />
      </svg>
      <div class="c num" style={{ fontSize: size >= 90 ? undefined : '16px' }}>{label}</div>
    </div>
  )
}
