// Segni a tratto del Design System v3 (stesse forme e spessori dei mock). Prendono il colore da currentColor.
import type { ReactNode } from 'react'

function G({ size, sw = 2.2, children }: { size: number; sw?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
type P = { size?: number; sw?: number }
export const ChevronLeftG = ({ size = 20, sw = 2.6 }: P) => <G size={size} sw={sw}><path d="M15 5l-7 7 7 7" /></G>
