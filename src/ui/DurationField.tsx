import { DURATION_CHIPS, formatDuration, parseDuration } from '../lib/duration'

interface Props {
  label: string
  /** Testo del campo: «», «90», «1 h 30»… */
  value: string
  onInput: (value: string) => void
  /** Valore che il campo segue quando è vuoto (es. la durata del luogo): si vede come suggerimento. */
  inherited?: number
  /** Dove lo eredita, per il testo di aiuto: «Dal luogo». */
  inheritedFrom?: string
}

/** Tempo di permanenza: scorciatoie a un tocco e, sotto, il valore libero («1h30», «45», «2 ore»). */
export function DurationField({ label, value, onInput, inherited, inheritedFrom = 'Dal luogo' }: Props) {
  const parsed = parseDuration(value)
  const invalid = Number.isNaN(parsed)
  return (
    <fieldset>
      <legend class="mb-1 block text-[13px] font-extrabold">{label}</legend>
      <div class="flex flex-wrap gap-2">
        {DURATION_CHIPS.map((m) => (
          <button
            type="button"
            aria-pressed={parsed === m}
            onClick={() => onInput(parsed === m ? '' : formatDuration(m))}
            class={`min-h-11 rounded-full border-2 px-3.5 text-sm font-extrabold ${
              parsed === m ? 'border-accent bg-accent-soft text-pale' : 'border-line text-muted'
            }`}
          >
            {formatDuration(m)}
          </button>
        ))}
      </div>
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        aria-label={`${label}, valore libero`}
        aria-invalid={invalid || undefined}
        value={value}
        placeholder={inherited ? formatDuration(inherited) : 'es. 1 h 30'}
        onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
        class={`mt-2 min-h-12 w-full rounded-[14px] border-2 bg-bg px-3.5 text-base placeholder:text-muted/70 ${invalid ? 'border-danger' : 'border-line'}`}
      />
      {invalid && <p class="mt-1 text-[13px] font-bold text-danger">Scrivi la durata, per esempio 45 min o 1 h 30.</p>}
      {!invalid && inherited && (
        <p class="mt-1 text-[13px] text-muted">
          {value.trim() ? (
            <>
              {inheritedFrom}: {formatDuration(inherited)}.{' '}
              <button type="button" onClick={() => onInput('')} class="min-h-11 font-extrabold text-accent">
                Ripristina
              </button>
            </>
          ) : (
            <>{inheritedFrom}: {formatDuration(inherited)}. Lascia vuoto per seguirla.</>
          )}
        </p>
      )}
    </fieldset>
  )
}
