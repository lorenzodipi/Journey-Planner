// Icone del tempo del componente Meteo (disegnate a 48px come nel design system):
// sole, nuvola, sole con nuvola, pioggia, neve, temporale, nebbia, luna, notte con nuvole.
import type { ReactNode } from 'react'

export type WxKind = 'sun' | 'cloud' | 'partly' | 'rain' | 'snow' | 'storm' | 'fog' | 'moon' | 'partlyNight'

const CLOUD = 'M14 38A8 8 0 0 1 14 22A10 10 0 0 1 33 19A9 9 0 0 1 34 38Z'

function cloud(transform = 'translate(0 0) scale(1)') {
  return <path d={CLOUD} fill="var(--wx-cloud)" stroke="var(--wxbg,var(--surface-card))" strokeWidth="2.5" strokeLinejoin="round" paintOrder="stroke" transform={transform} />
}

function rays(cx: number, cy: number, r1: number, r2: number, width: number) {
  const out: ReactNode[] = []
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    out.push(<line key={i} x1={(cx + r1 * Math.cos(a)).toFixed(2)} y1={(cy + r1 * Math.sin(a)).toFixed(2)} x2={(cx + r2 * Math.cos(a)).toFixed(2)} y2={(cy + r2 * Math.sin(a)).toFixed(2)} />)
  }
  return (
    <g stroke="var(--wx-sun)" strokeWidth={width} strokeLinecap="round">
      {out}
    </g>
  )
}

/** Tipo di icona da un codice meteo WMO (Open-Meteo); di notte sole → luna. */
export function wxKind(code: number, night = false): WxKind {
  if (code <= 1) return night ? 'moon' : 'sun'
  if (code === 2) return night ? 'partlyNight' : 'partly'
  if (code === 3) return 'cloud'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  if (code >= 51) return 'rain'
  return 'cloud'
}

export function Wx({ kind, size = 24 }: { kind: WxKind; size?: number }) {
  let body: ReactNode
  switch (kind) {
    case 'sun':
      body = (
        <>
          <circle cx="24" cy="24" r="8" fill="var(--wx-sun)" />
          {rays(24, 24, 13, 18, 3)}
        </>
      )
      break
    case 'partly':
      body = (
        <>
          <circle cx="17" cy="17" r="6.5" fill="var(--wx-sun)" />
          {rays(17, 17, 10.5, 14.5, 2.6)}
          {cloud('translate(6 6) scale(0.88)')}
        </>
      )
      break
    case 'rain':
      body = (
        <>
          {cloud('translate(0 -4) scale(1)')}
          <g stroke="var(--wx-rain)" strokeWidth="3" strokeLinecap="round">
            <line x1="16" y1="39" x2="14" y2="44" />
            <line x1="25" y1="39" x2="23" y2="44" />
            <line x1="34" y1="39" x2="32" y2="44" />
          </g>
        </>
      )
      break
    case 'snow':
      body = (
        <>
          {cloud('translate(0 -4) scale(1)')}
          <g fill="var(--wx-rain)">
            <circle cx="16" cy="41" r="2.2" />
            <circle cx="25" cy="44" r="2.2" />
            <circle cx="34" cy="41" r="2.2" />
          </g>
        </>
      )
      break
    case 'storm':
      body = (
        <>
          {cloud('translate(0 -4) scale(1)')}
          <path d="M25 36l-5 7h5l-3 5" fill="none" stroke="var(--wx-sun)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )
      break
    case 'fog':
      body = (
        <>
          {cloud('translate(0 -4) scale(1)')}
          <g stroke="var(--wx-cloud)" strokeWidth="3" strokeLinecap="round">
            <line x1="10" y1="40" x2="38" y2="40" />
            <line x1="14" y1="45" x2="34" y2="45" />
          </g>
        </>
      )
      break
    case 'moon':
      body = <path d="M31 8A16 16 0 1 0 40 33A13 13 0 0 1 31 8Z" fill="var(--wx-moon)" />
      break
    case 'partlyNight':
      body = (
        <>
          <path d="M22 5A11 11 0 1 0 31 24A9 9 0 0 1 22 5Z" fill="var(--wx-moon)" />
          {cloud('translate(6 6) scale(0.88)')}
        </>
      )
      break
    default:
      body = cloud()
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {body}
    </svg>
  )
}
