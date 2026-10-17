import { formatMinutes } from '../lib/sun'

interface Props {
  sunrise: number | null
  sunset: number | null
  alwaysUp?: boolean
  alwaysDown?: boolean
  /** Fasce di attività del giorno, in minuti dalla mezzanotte (es. tappe). */
  segments?: { from: number; to: number }[]
  rangeStart?: number
  rangeEnd?: number
}

/** Barra della luce del giorno: giallo = luce, blu notte = buio. */
export function LightBar({
  sunrise,
  sunset,
  alwaysUp,
  alwaysDown,
  segments = [],
  rangeStart = 6 * 60,
  rangeEnd = 20 * 60,
}: Props) {
  const pct = (m: number) => Math.min(100, Math.max(0, ((m - rangeStart) / (rangeEnd - rangeStart)) * 100))
  const lit = alwaysUp ? [0, 100] : sunrise != null && sunset != null ? [pct(sunrise), pct(sunset)] : null
  const hours = [6, 8, 10, 12, 14, 16, 18, 20]

  return (
    <div>
      <div
        class="relative h-7 overflow-hidden rounded-full"
        style={{ background: 'var(--night)' }}
        role="img"
        aria-label={
          sunrise != null && sunset != null
            ? `Alba ${formatMinutes(sunrise)}, tramonto ${formatMinutes(sunset)}`
            : alwaysDown
              ? 'Il sole non sorge'
              : 'Luce del giorno'
        }
      >
        {lit && !alwaysDown && (
          <div
            class="absolute inset-y-0"
            style={{
              left: `${lit[0]}%`,
              width: `${lit[1] - lit[0]}%`,
              background: 'linear-gradient(90deg, var(--day-a), var(--day-b))',
            }}
          />
        )}
        {segments.map((s) => (
          <div
            class="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent"
            style={{ left: `${pct(s.from)}%`, width: `${Math.max(1.5, pct(s.to) - pct(s.from))}%` }}
          />
        ))}
      </div>
      <div class="relative mt-1.5 h-4 text-[10px] text-muted">
        {hours.map((h) => (
          <span class="absolute -translate-x-1/2" style={{ left: `${pct(h * 60)}%` }}>
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  )
}
