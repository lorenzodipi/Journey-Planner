import { formatMinutes } from '../lib/sun'

interface Props {
  sunrise: number | null
  sunset: number | null
  alwaysUp?: boolean
  alwaysDown?: boolean
  /** Ora attuale (minuti dalla mezzanotte, ora locale): mostra un puntino. Solo per il giorno di oggi. */
  nowMin?: number | null
}

export function daylightLabel(sunrise: number, sunset: number): string {
  const total = Math.max(0, sunset - sunrise)
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min di luce`
}

const DAY_COLOR = '#f2a93b'

/** Luce del giorno: alba e tramonto agli estremi, una sottile barra dorata per le ore di luce. */
export function LightBar({ sunrise, sunset, alwaysUp, alwaysDown, nowMin = null }: Props) {
  const hasSun = !alwaysUp && !alwaysDown && sunrise != null && sunset != null
  const pct = (m: number) => Math.min(100, Math.max(0, (m / 1440) * 100))
  const from = alwaysUp ? 0 : hasSun ? pct(sunrise as number) : 0
  const to = alwaysUp ? 100 : hasSun ? pct(sunset as number) : 0

  const summary = hasSun
    ? daylightLabel(sunrise as number, sunset as number)
    : alwaysUp
      ? 'Il sole non tramonta'
      : alwaysDown
        ? 'Il sole non sorge'
        : 'Alba e tramonto non disponibili'

  return (
    <div
      role="img"
      aria-label={hasSun ? `Alba alle ${formatMinutes(sunrise as number)}, tramonto alle ${formatMinutes(sunset as number)}. ${summary}` : summary}
    >
      {hasSun && (
        <div class="flex items-end justify-between">
          <div>
            <p class="text-xs text-muted">Alba</p>
            <p class="font-display text-2xl font-semibold leading-tight tabular-nums">{formatMinutes(sunrise as number)}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-muted">Tramonto</p>
            <p class="font-display text-2xl font-semibold leading-tight tabular-nums">{formatMinutes(sunset as number)}</p>
          </div>
        </div>
      )}

      {/* la barra copre le 24 ore: la parte dorata è il giorno */}
      <div class={`relative h-2 rounded-full bg-line ${hasSun ? 'mt-3' : ''}`}>
        <span
          class="absolute inset-y-0 rounded-full"
          style={{ left: `${from}%`, width: `${Math.max(0, to - from)}%`, background: DAY_COLOR }}
        />
        {nowMin != null && (
          <span
            class="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
            style={{ left: `${pct(nowMin)}%`, boxShadow: '0 0 0 3px var(--surface)' }}
            title={`Adesso ${formatMinutes(nowMin)}`}
          />
        )}
      </div>

      <p class="mt-2 text-sm text-muted">{summary}</p>
    </div>
  )
}
