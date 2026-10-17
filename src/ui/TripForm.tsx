import { useState } from 'preact/hooks'
import type { TravelerInput, TripInput } from '../lib/tripApi'
import {
  PRESETS,
  THEME_LABELS,
  TRAVELER_COLORS,
  cleanTravelerNames,
  validateTrip,
  type Preset,
} from '../lib/tripForm'
import type { ThemeName, Trip } from '../types'
import { FormError, PrimaryButton, TextField } from './Field'

interface Props {
  /** Se presente il form modifica quel viaggio, altrimenti ne crea uno nuovo. */
  trip?: Trip
  onSubmit: (input: TripInput, travelers: TravelerInput[]) => Promise<string | null>
  /** Chiamata dopo un salvataggio riuscito. */
  onDone: () => void
}

const allTimezones: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? []
  } catch {
    return []
  }
})()

export function TripForm({ trip, onSubmit, onDone }: Props) {
  const editing = Boolean(trip)
  const [presetId, setPresetId] = useState<string>(editing ? '' : 'japan')
  const first = PRESETS[0]

  const [title, setTitle] = useState(trip?.title ?? '')
  const [destination, setDestination] = useState(trip?.destination ?? first.destination)
  const [startDate, setStartDate] = useState(trip?.startDate ?? '')
  const [endDate, setEndDate] = useState(trip?.endDate ?? '')
  const [timezone, setTimezone] = useState(trip?.timezone ?? first.timezone)
  const [theme, setTheme] = useState<ThemeName>(trip?.theme ?? first.theme)
  const [baseCurrency, setBaseCurrency] = useState(trip?.baseCurrency ?? 'EUR')
  const [localCurrency, setLocalCurrency] = useState(trip?.localCurrency ?? first.localCurrency)
  const [center, setCenter] = useState(trip?.center ?? first.center)
  const [names, setNames] = useState<string[]>(['', ''])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function applyPreset(p: Preset) {
    setPresetId(p.id)
    setDestination(p.destination)
    setTimezone(p.timezone)
    setTheme(p.theme)
    setLocalCurrency(p.localCurrency)
    setCenter(p.center)
  }

  async function submit(e: Event) {
    e.preventDefault()
    const input: TripInput = {
      title,
      destination,
      startDate,
      endDate,
      timezone,
      theme,
      baseCurrency,
      localCurrency,
      center,
    }
    const problem = validateTrip(input)
    if (problem) return setError(problem)

    let travelers: TravelerInput[] = []
    if (!editing) {
      const cleaned = cleanTravelerNames(names)
      if (cleaned.error) return setError(cleaned.error)
      travelers = cleaned.names.map((name, i) => ({ name, color: TRAVELER_COLORS[i % TRAVELER_COLORS.length] }))
    }

    setBusy(true)
    setError(null)
    const message = await onSubmit(input, travelers)
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      {!editing && (
        <fieldset>
          <legend class="mb-1 block text-sm font-medium">Dove vai?</legend>
          <div class="flex gap-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                aria-pressed={presetId === p.id}
                onClick={() => applyPreset(p)}
                class={`min-h-11 flex-1 rounded-full border px-3 text-sm font-medium ${
                  presetId === p.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <TextField label="Nome del viaggio" value={title} onInput={setTitle} placeholder="Giappone 2026" maxLength={80} />
      <TextField label="Destinazione" value={destination} onInput={setDestination} maxLength={80} />

      <div class="grid grid-cols-2 gap-3">
        <TextField label="Dal" type="date" value={startDate} onInput={setStartDate} />
        <TextField label="Al" type="date" value={endDate} onInput={setEndDate} />
      </div>

      {!editing && (
        <fieldset class="space-y-2">
          <legend class="mb-1 block text-sm font-medium">Chi viaggia</legend>
          {names.map((n, i) => (
            <div class="flex items-center gap-2">
              <span
                aria-hidden="true"
                class="h-4 w-4 shrink-0 rounded-full"
                style={{ background: TRAVELER_COLORS[i % TRAVELER_COLORS.length] }}
              />
              <input
                type="text"
                aria-label={`Nome viaggiatore ${i + 1}`}
                value={n}
                placeholder={i === 0 ? 'Il tuo nome' : 'Nome'}
                maxLength={40}
                onInput={(e) => setNames(names.map((x, j) => (j === i ? e.currentTarget.value : x)))}
                class="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-bg px-4"
              />
              {names.length > 1 && (
                <button
                  type="button"
                  aria-label={`Rimuovi viaggiatore ${i + 1}`}
                  onClick={() => setNames(names.filter((_, j) => j !== i))}
                  class="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {names.length < 6 && (
            <button
              type="button"
              onClick={() => setNames([...names, ''])}
              class="min-h-11 rounded-full px-2 text-sm font-medium text-accent"
            >
              + Aggiungi persona
            </button>
          )}
        </fieldset>
      )}

      <details class="rounded-2xl border border-line px-4 py-1">
        <summary class="min-h-11 cursor-pointer list-none py-3 text-sm font-medium">
          Tema, fuso e valute
        </summary>
        <div class="space-y-4 pb-4">
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Tema</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.currentTarget.value as ThemeName)}
              class="min-h-12 w-full rounded-2xl border border-line bg-bg px-4"
            >
              {(Object.keys(THEME_LABELS) as ThemeName[]).map((t) => (
                <option value={t}>{THEME_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <TextField
            label="Fuso orario della destinazione"
            value={timezone}
            onInput={setTimezone}
            list="timezones"
            autoComplete="off"
          />
          <datalist id="timezones">
            {allTimezones.map((tz) => (
              <option value={tz} />
            ))}
          </datalist>
          <div class="grid grid-cols-2 gap-3">
            <TextField label="Valuta base" value={baseCurrency} onInput={setBaseCurrency} maxLength={3} />
            <TextField label="Valuta locale" value={localCurrency} onInput={setLocalCurrency} maxLength={3} />
          </div>
        </div>
      </details>

      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Crea viaggio'}</PrimaryButton>
    </form>
  )
}
