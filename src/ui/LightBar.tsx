import { SunIcon, SunriseIcon, SunsetIcon } from './Icons'
import { formatDayLong } from '../lib/dates'
import { formatMinutes, type DaySun } from '../lib/sun'

interface Props {
  sunrise: number | null
  sunset: number | null
  alwaysUp?: boolean
  alwaysDown?: boolean
  /** Ora attuale (minuti dalla mezzanotte, ora locale): mostra il pallino. Solo per il giorno di oggi. */
  nowMin?: number | null
}

export function daylightLabel(sunrise: number, sunset: number): string {
  return `${duration(sunset - sunrise)} di luce`
}

function duration(min: number): string {
  const total = Math.max(0, Math.round(min))
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`
}

const EVENING = 90 // la "sera" dura un'ora e mezza dopo il tramonto

const PHASES = [
  { label: 'Notte', color: 'var(--phase-night)' },
  { label: 'Mattina', color: 'var(--phase-morning)' },
  { label: 'Pomeriggio', color: 'var(--phase-afternoon)' },
  { label: 'Sera', color: 'var(--phase-evening)' },
]

function Marker({ at, children }: { at: number; children: React.ReactNode }) {
  return (
    <span
      className="absolute top-1/2 z-[2] grid size-[26px] -translate-x-1/2 -translate-y-1/2 rotate-45 place-items-center rounded-[7px] border-2 border-ink bg-surface"
      style={{ left: `${at}%` }}
    >
      <span className="-rotate-45">{children}</span>
    </span>
  )
}

/**
 * La luce del giorno su una riga sola: notte, mattina, pomeriggio, sera in proporzione alle ore vere.
 * Alba, sole più alto e tramonto hanno un'icona e l'orario; un pallino segna l'ora attuale.
 */
export function LightBar({ sunrise, sunset, alwaysUp, alwaysDown, nowMin = null }: Props) {
  const hasSun = !alwaysUp && !alwaysDown && sunrise != null && sunset != null

  if (!hasSun) {
    const text = alwaysUp ? 'Il sole non tramonta' : alwaysDown ? 'Il sole non sorge' : 'Alba e tramonto non disponibili'
    return (
      <div role="img" aria-label={text}>
        <div className="h-3.5 rounded-full" style={{ background: alwaysUp ? 'var(--phase-morning)' : alwaysDown ? 'var(--phase-night)' : 'var(--line)' }} />
        <p className="mt-2 text-sm text-muted">{text}</p>
      </div>
    )
  }

  const rise = sunrise as number
  const set = sunset as number
  const noon = Math.round((rise + set) / 2)
  // di solito 05:00 → 21:00; si allarga se alba o tramonto cadono fuori (estate, alte latitudini)
  const start = Math.max(0, Math.min(300, Math.floor((rise - 30) / 60) * 60))
  const end = Math.min(1440, Math.max(1260, Math.ceil((set + EVENING + 30) / 60) * 60))
  const pct = (m: number) => Math.min(100, Math.max(0, ((m - start) / (end - start)) * 100))

  const cuts = [start, rise, noon, set, set + EVENING, end]
  const colors = [PHASES[0], PHASES[1], PHASES[2], PHASES[3], PHASES[0]].map((p) => p.color)
  const showNow = nowMin != null && nowMin >= start && nowMin <= end
  const left = (m: number) => `clamp(20px, ${pct(m)}%, calc(100% - 20px))`
  const remaining = nowMin != null && nowMin >= rise && nowMin < set ? set - nowMin : null

  return (
    <div>
      <div
        role="img"
        aria-label={`Alba ${formatMinutes(rise)}, sole più alto ${formatMinutes(noon)}, tramonto ${formatMinutes(set)}${showNow ? `. Adesso sono le ${formatMinutes(nowMin as number)}` : ''}`}
        className="relative h-[104px]"
      >
        {/* linee che collegano gli orari ai rombi */}
        {[rise, set].map((m) => (
          <span className="absolute top-6 h-[28px] w-px bg-ink/30" style={{ left: `${pct(m)}%` }} />
        ))}
        <span className="absolute bottom-6 h-[26px] w-px bg-ink/30" style={{ left: `${pct(noon)}%` }} />

        {/* riga unica: le fasce sono tagli di colore sulla stessa barra */}
        <div className="absolute inset-x-0 top-1/2 z-[1] h-3.5 -translate-y-1/2 overflow-hidden rounded-full">
          {colors.map((c, i) => (
            <span
              className="absolute inset-y-0"
              style={{ left: `${pct(cuts[i])}%`, width: `${pct(cuts[i + 1]) - pct(cuts[i])}%`, background: c }}
            />
          ))}
        </div>

        <Marker at={pct(rise)}>
          <SunriseIcon size={12} />
        </Marker>
        <Marker at={pct(noon)}>
          <SunIcon size={14} />
        </Marker>
        <Marker at={pct(set)}>
          <SunsetIcon size={12} />
        </Marker>

        {showNow && (
          <span
            className="absolute top-1/2 z-[3] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink bg-surface"
            style={{ left: `${pct(nowMin as number)}%` }}
          />
        )}

        {/* orari */}
        <span className="absolute top-0 -translate-x-1/2 text-base font-bold leading-5 tabular-nums" style={{ left: left(rise) }}>
          {formatMinutes(rise)}
        </span>
        <span className="absolute bottom-0 -translate-x-1/2 text-base font-bold leading-5 tabular-nums" style={{ left: left(noon) }}>
          {formatMinutes(noon)}
        </span>
        <span className="absolute top-0 -translate-x-1/2 text-base font-bold leading-5 tabular-nums" style={{ left: left(set) }}>
          {formatMinutes(set)}
        </span>
      </div>

      {/* legenda */}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
        {PHASES.map((p) => (
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: p.color }} />
            {p.label}
          </li>
        ))}
        {showNow && (
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-[3px] border-ink bg-surface" />
            Adesso
          </li>
        )}
      </ul>

      <p className="mt-2.5 text-sm text-muted">
        {daylightLabel(rise, set)}
        {remaining != null && <span className="font-semibold text-ink"> · ancora {duration(remaining)}</span>}
      </p>
    </div>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** La card "luce del giorno": data e città in testa, poi la barra. Usata in Oggi e nella pagina del giorno. */
export function LightCard({ date, city, sun, nowMin = null }: { date: string; city?: string; sun: DaySun; nowMin?: number | null }) {
  return (
    <section className="rise rounded-[20px] border border-hairline bg-surface px-4 pb-3.5 pt-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-extrabold">{cap(formatDayLong(date))}</h2>
        {city && <span className="text-[13px] text-muted">{city}</span>}
      </div>
      <div className="mt-1.5">
        <LightBar sunrise={sun.sunrise} sunset={sun.sunset} alwaysUp={sun.alwaysUp} alwaysDown={sun.alwaysDown} nowMin={nowMin} />
      </div>
    </section>
  )
}
