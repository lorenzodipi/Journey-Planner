import { useMemo, useState } from 'preact/hooks'
import { useAuth } from '../lib/auth'
import { COUNTRIES, countryByCode, countryByName, themeForCountry, zonesOf } from '../lib/countries'
import { parseAmount } from '../lib/money'
import type { TripInput, TripPeople } from '../lib/tripApi'
import {
  PRESETS,
  TRAVELER_COLORS,
  cleanPeople,
  isValidTimezone,
  validateTrip,
  type Preset,
} from '../lib/tripForm'
import type { ThemeName, Trip } from '../types'
import { FormError, PrimaryButton, TextField } from './Field'
import { CurrencySelect } from './CurrencySelect'
import { ChevronDownIcon } from './Icons'
import { Select } from './Select'
import { timezoneOptions } from '../lib/timezones'
import { centerForTimezone } from '../lib/tzCenter'

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
  const [originCountry, setOriginCountry] = useState(trip?.originCountry ?? '')
  const [originTz, setOriginTz] = useState(trip?.originTimezone ?? '')
  const [budget, setBudget] = useState(trip?.budgetLimit ? String(trip.budgetLimit).replace('.', ',') : '')
  const auth = useAuth()
  const ownEmail = auth.session?.user.email ?? undefined
  const [selfName, setSelfName] = useState('')
  const [others, setOthers] = useState<{ email: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  // «Al» non può essere prima di «Dal»: spostando l'inizio oltre la fine, la fine lo segue
  function onStartDate(v: string) {
    setStartDate(v)
    if (v && endDate && endDate < v) setEndDate(v)
  }
  const [busy, setBusy] = useState(false)

  // cambiando il fuso orario, anche la posizione (per alba/tramonto, meteo e mappa) si sposta nella zona giusta
  function onTimezone(tz: string) {
    setTimezone(tz)
    if (isValidTimezone(tz)) setCenter(centerForTimezone(tz))
  }

  // scegliendo il paese si propongono fuso, valuta locale, centro mappa e tema: restano tutti modificabili
  function onCountry(name: string) {
    setDestination(name)
    setPresetId(PRESETS.find((p) => p.destination === name)?.id ?? '')
    const c = countryByName(name)
    if (!c) return
    setTimezone(c.timezone)
    setLocalCurrency(c.currency === baseCurrency.trim().toUpperCase() ? '' : c.currency)
    setCenter(c.center)
    setTheme(themeForCountry(c.code))
  }
  // un viaggio già esistente con una destinazione scritta a mano resta selezionabile
  const countryOptions = useMemo(() => {
    const list = COUNTRIES.map((c) => ({ value: c.name, label: c.name }))
    const current = destination.trim()
    return current && !countryByName(current) ? [{ value: current, label: current, hint: 'Come scritto finora' }, ...list] : list
  }, [destination])

  // paese di casa: facoltativo; per i paesi con più fusi si sceglie anche il fuso (di base il principale)
  const originOptions = useMemo(() => [{ value: '', label: 'Nessuno' }, ...COUNTRIES.map((c) => ({ value: c.code, label: c.name }))], [])
  const originZones = originCountry ? zonesOf(originCountry) : []
  function onOrigin(code: string) {
    setOriginCountry(code)
    setOriginTz(code ? (countryByCode(code)?.timezone ?? '') : '')
  }

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
    // budget massimo: facoltativo; vuoto = nessun tetto (e, in modifica, toglie quello che c'era)
    let budgetLimit: number | null | undefined
    if (budget.trim()) {
      const n = parseAmount(budget)
      if (n === null || n <= 0 || n >= 1e11) return setError('Il budget massimo è un importo maggiore di zero (esempio: 3000).')
      budgetLimit = n
    } else if (trip?.budgetLimit) budgetLimit = null
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
      ...(budgetLimit !== undefined ? { budgetLimit } : {}),
      // vuoto = nessuna origine (e, in modifica, toglie quella che c'era)
      ...(originCountry ? { originCountry, originTimezone: originTz || countryByCode(originCountry)?.timezone || null } : trip?.originCountry ? { originCountry: null, originTimezone: null } : {}),
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

      <TextField label="Nome del viaggio" value={title} onInput={setTitle} placeholder="Es. Estate 2027" maxLength={80} />
      <Select label="Destinazione" value={destination} onChange={onCountry} options={countryOptions} placeholder="Scegli il paese" searchable />

      <div class="grid grid-cols-2 gap-3">
        <TextField label="Dal" type="date" value={startDate} onInput={onStartDate} />
        <TextField label="Al" type="date" value={endDate} onInput={setEndDate} min={startDate || undefined} />
      </div>

      <Select label="Paese di origine (facoltativo)" value={originCountry} onChange={onOrigin} options={originOptions} placeholder="Nessuno" searchable />
      {originZones.length > 1 && (
        <Select label="Fuso di casa" value={originTz} onChange={setOriginTz} options={originZones.map((z) => ({ value: z, label: z }))} />
      )}

      <TextField
        label={`Budget massimo, in ${baseCurrency.trim().toUpperCase() || 'EUR'} (facoltativo)`}
        value={budget}
        onInput={setBudget}
        inputMode="decimal"
        placeholder="Es. 3.000"
        maxLength={12}
      />

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

      <details class="group rounded-2xl border-2 border-line px-4 py-1">
        <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-1 text-sm font-extrabold [&::-webkit-details-marker]:hidden">
          Fuso e valute
          <span class="grid size-11 shrink-0 place-items-center text-pale transition-transform duration-200 group-open:rotate-180">
            <ChevronDownIcon size={18} />
          </span>
        </summary>
        <div class="space-y-4 pb-4">
          <Select
            label="Fuso orario della destinazione"
            value={timezone}
            onChange={onTimezone}
            creatable
            options={timezoneOptions(timezone)}
          />
          <div class="grid grid-cols-2 gap-3">
            <CurrencySelect label="Valuta base" value={baseCurrency} onChange={setBaseCurrency} />
            <CurrencySelect label="Valuta locale" value={localCurrency} onChange={setLocalCurrency} optional />
          </div>
        </div>
      </details>

      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Crea viaggio'}</PrimaryButton>
    </form>
  )
}
