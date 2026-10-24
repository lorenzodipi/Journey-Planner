import { useMemo, useState } from 'preact/hooks'
import { useAuth } from '../lib/auth'
import { COUNTRIES, countryByCode, countryByName, themeForCountry, zonesOf } from '../lib/countries'
import { currencyName, parseAmount } from '../lib/money'
import { tzOffsetMinutes } from '../lib/sun'
import { formatDiffHours } from '../lib/today'
import type { TripInput, TripPeople } from '../lib/tripApi'
import {
  PRESETS,
  TRAVELER_COLORS,
  cleanPeople,
  isValidTimezone,
  validateTrip,
} from '../lib/tripForm'
import type { ThemeName, Trip } from '../types'
import { FormError, PrimaryButton, TextField } from './Field'
import { CurrencySelect } from './CurrencySelect'
import { ChevronDownG, CloseG, PlusG } from './glyphs'
import '../fw-altro.css'
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
  const first = PRESETS[0]
  const AV = ['var(--arancia)', 'var(--confetto)', 'var(--menta)', 'var(--cielo)', 'var(--limone)', 'var(--glicine)']

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

  // «+8 h, yen»: scarto dal fuso del telefono e valuta locale della destinazione
  const autoNote = (() => {
    if (!isValidTimezone(timezone)) return ''
    const diff = (tzOffsetMinutes(new Date(), timezone) - tzOffsetMinutes(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)) / 60
    const cur = localCurrency.trim().toUpperCase()
    const name = cur ? currencyName(cur)?.split(' ')[0]?.toLowerCase() : undefined
    return [diff !== 0 ? formatDiffHours(diff) : 'stesso fuso', name ?? (cur || '')].filter(Boolean).join(', ')
  })()

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
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <TextField label="Nome del viaggio" value={title} onInput={setTitle} placeholder="Es. Estate 2027" maxLength={80} />
      <Select label="Destinazione" value={destination} onChange={onCountry} options={countryOptions} placeholder="Scegli il paese" searchable />

      <div class="grid2">
        <TextField label="Partenza" type="date" value={startDate} onInput={onStartDate} />
        <TextField label="Ritorno" type="date" value={endDate} onInput={setEndDate} min={startDate || undefined} />
      </div>

      <Select label="Paese di partenza (facoltativo)" value={originCountry} onChange={onOrigin} options={originOptions} placeholder="Nessuno" searchable />
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
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend class="b-bold" style={{ marginBottom: '8px' }}>
            Chi viaggia
          </legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label class="fld person">
              <span class="av" style={{ background: 'var(--arancia)' }} aria-hidden="true">
                {(selfName.trim().charAt(0) || '?').toUpperCase()}
              </span>
              <div>
                <span class="l">Il tuo nome</span>
                <input type="text" class="v" value={selfName} maxLength={40} autoComplete="off" placeholder="Come ti chiami" onInput={(e) => setSelfName(e.currentTarget.value)} />
              </div>
            </label>
            {ownEmail && <p class="cap muted">Sei tu: {ownEmail}</p>}
            {others.map((o, i) => (
              <div class="fld person" style={{ alignItems: 'flex-start', paddingTop: '10px', paddingBottom: '10px' }}>
                <span class="av" style={{ background: AV[(i + 1) % AV.length] }} aria-hidden="true">
                  {(o.name.trim().charAt(0) || o.email.trim().charAt(0) || '?').toUpperCase()}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label>
                    <span class="l">Email della persona {i + 1}</span>
                    <input
                      type="email"
                      inputMode="email"
                      class="v"
                      value={o.email}
                      placeholder="Email del suo account"
                      autoComplete="off"
                      autoCapitalize="none"
                      onInput={(e) => setOthers(others.map((x, j) => (j === i ? { ...x, email: e.currentTarget.value } : x)))}
                    />
                  </label>
                  <label>
                    <span class="l">Nome (facoltativo)</span>
                    <input
                      type="text"
                      class="v"
                      value={o.name}
                      maxLength={40}
                      autoComplete="off"
                      onInput={(e) => setOthers(others.map((x, j) => (j === i ? { ...x, name: e.currentTarget.value } : x)))}
                    />
                  </label>
                </div>
                <button type="button" class="rbtn sm" aria-label={`Rimuovi persona ${i + 1}`} onClick={() => setOthers(others.filter((_, j) => j !== i))}>
                  <CloseG size={16} />
                </button>
              </div>
            ))}
            {others.length < 5 && (
              <div class="chips" style={{ margin: 0, padding: 0 }}>
                <button type="button" class="chip dash" onClick={() => setOthers([...others, { email: '', name: '' }])}>
                  <PlusG size={16} />
                  Aggiungi
                </button>
              </div>
            )}
            <p class="cap muted">Gli altri partecipanti devono avere già un account: scrivi la loro email e potranno vedere e modificare il viaggio.</p>
          </div>
        </fieldset>
      )}

      <details class="group rows">
        <summary class="row" style={{ minHeight: '56px', cursor: 'pointer', listStyle: 'none' }}>
          <span class="grow tt">Fuso e valute</span>
          <span class="muted transition-transform duration-200 group-open:rotate-180">
            <ChevronDownG />
          </span>
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 16px 16px' }}>
          <Select label="Fuso orario della destinazione" value={timezone} onChange={onTimezone} creatable options={timezoneOptions(timezone)} />
          <div class="grid2">
            <CurrencySelect label="Valuta base" value={baseCurrency} onChange={setBaseCurrency} />
            <CurrencySelect label="Valuta locale" value={localCurrency} onChange={setLocalCurrency} optional />
          </div>
        </div>
      </details>

      <FormError message={error} />
      <div class="cta">
        <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Crea viaggio'}</PrimaryButton>
        {!editing && autoNote && (
          <p class="cap muted" style={{ textAlign: 'center', marginTop: '8px' }}>
            Fuso orario e valuta si compilano da soli: {autoNote}.
          </p>
        )}
      </div>
    </form>
  )
}
