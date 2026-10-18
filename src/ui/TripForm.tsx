import { useState } from 'preact/hooks'
import { useAuth } from '../lib/auth'
import type { TripInput, TripPeople } from '../lib/tripApi'
import {
  PRESETS,
  TRAVELER_COLORS,
  cleanPeople,
  validateTrip,
  type Preset,
} from '../lib/tripForm'
import type { ThemeName, Trip } from '../types'
import { FormError, PrimaryButton, TextField } from './Field'
import { Select } from './Select'
import { timezoneOptions } from '../lib/timezones'

interface Props {
  /** Se presente il form modifica quel viaggio, altrimenti ne crea uno nuovo. */
  trip?: Trip
  onSubmit: (input: TripInput, people: TripPeople) => Promise<string | null>
  /** Chiamata dopo un salvataggio riuscito. */
  onDone: () => void
}

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
  const auth = useAuth()
  const ownEmail = auth.session?.user.email ?? undefined
  const [selfName, setSelfName] = useState('')
  const [others, setOthers] = useState<{ email: string; name: string }[]>([{ email: '', name: '' }])
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

    let people: TripPeople = { self: { name: '', color: TRAVELER_COLORS[0] }, others: [] }
    if (!editing) {
      const cleaned = cleanPeople(selfName, others, ownEmail)
      if (cleaned.error) return setError(cleaned.error)
      people = {
        self: { name: cleaned.self, color: TRAVELER_COLORS[0] },
        others: cleaned.others.map((o, i) => ({ ...o, color: TRAVELER_COLORS[(i + 1) % TRAVELER_COLORS.length] })),
      }
    }

    setBusy(true)
    setError(null)
    const message = await onSubmit(input, people)
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      {!editing && (
        <fieldset>
          <legend class="mb-1 block text-sm font-extrabold">Dove vai?</legend>
          <div class="flex gap-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                aria-pressed={presetId === p.id}
                onClick={() => applyPreset(p)}
                class={`min-h-11 flex-1 rounded-full border-2 px-3 text-sm font-extrabold ${
                  presetId === p.id ? 'border-accent bg-accent-soft text-pale' : 'border-line text-muted'
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
        <fieldset class="space-y-3">
          <legend class="mb-1 block text-sm font-extrabold">Chi viaggia</legend>
          <div class="flex items-center gap-2">
            <span aria-hidden="true" class="h-4 w-4 shrink-0 rounded-full" style={{ background: TRAVELER_COLORS[0] }} />
            <input
              type="text"
              aria-label="Il tuo nome"
              value={selfName}
              placeholder="Il tuo nome"
              maxLength={40}
              autoComplete="off"
              onInput={(e) => setSelfName(e.currentTarget.value)}
              class="min-h-12 min-w-0 flex-1 rounded-[14px] border-2 border-line bg-bg px-4"
            />
          </div>
          {ownEmail && <p class="-mt-1 pl-6 text-xs text-muted">Sei tu: {ownEmail}</p>}
          {others.map((o, i) => (
            <div class="flex items-start gap-2">
              <span
                aria-hidden="true"
                class="mt-4 h-4 w-4 shrink-0 rounded-full"
                style={{ background: TRAVELER_COLORS[(i + 1) % TRAVELER_COLORS.length] }}
              />
              <div class="min-w-0 flex-1 space-y-2">
                <input
                  type="email"
                  inputMode="email"
                  aria-label={`Email della persona ${i + 1}`}
                  value={o.email}
                  placeholder="Email del suo account"
                  autoComplete="off"
                  autoCapitalize="none"
                  onInput={(e) => setOthers(others.map((x, j) => (j === i ? { ...x, email: e.currentTarget.value } : x)))}
                  class="min-h-12 w-full rounded-[14px] border-2 border-line bg-bg px-4"
                />
                <input
                  type="text"
                  aria-label={`Nome della persona ${i + 1}`}
                  value={o.name}
                  placeholder="Nome (facoltativo)"
                  maxLength={40}
                  autoComplete="off"
                  onInput={(e) => setOthers(others.map((x, j) => (j === i ? { ...x, name: e.currentTarget.value } : x)))}
                  class="min-h-12 w-full rounded-[14px] border-2 border-line bg-bg px-4"
                />
              </div>
              <button
                type="button"
                aria-label={`Rimuovi persona ${i + 1}`}
                onClick={() => setOthers(others.filter((_, j) => j !== i))}
                class="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted"
              >
                ✕
              </button>
            </div>
          ))}
          {others.length < 5 && (
            <button
              type="button"
              onClick={() => setOthers([...others, { email: '', name: '' }])}
              class="min-h-11 rounded-full px-2 text-sm font-extrabold text-accent"
            >
              + Aggiungi persona
            </button>
          )}
          <p class="text-xs text-muted">
            Gli altri partecipanti devono avere già un account: scrivi la loro email e potranno vedere e modificare il viaggio.
          </p>
        </fieldset>
      )}

      <details class="rounded-2xl border-2 border-line px-4 py-1">
        <summary class="min-h-11 cursor-pointer list-none py-3 text-sm font-extrabold">
          Fuso e valute
        </summary>
        <div class="space-y-4 pb-4">
          <Select
            label="Fuso orario della destinazione"
            value={timezone}
            onChange={setTimezone}
            creatable
            options={timezoneOptions(timezone)}
          />
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
