import { useEffect, useState } from 'preact/hooks'
import { formatDuration, parseDuration } from '../lib/duration'
import { DurationField } from './DurationField'
import { searchPlaces, type GeoResult } from '../lib/geocode'
import { parseMapsUrl } from '../lib/mapsUrl'
import type { PlaceInput } from '../lib/tripApi'
import type { Place, PlaceStatus, Trip } from '../types'
import { FormError, PrimaryButton, TextArea, TextField } from './Field'
import { Select } from './Select'
import { STATUSES, STATUS_LABEL, SUGGESTED_CATEGORIES, uniqueCities } from './placeMeta'

type PinPickerComponent = typeof import('./MapView').PinPicker

interface Props {
  trip: Trip
  initial?: Place
  onSubmit: (input: PlaceInput) => Promise<string | null>
  onDone: () => void
}

const toNumber = (text: string): number | null => {
  const t = text.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

export function PlaceForm({ trip, initial, onSubmit, onDone }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [nameLocal, setNameLocal] = useState(initial?.nameLocal ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [status, setStatus] = useState<PlaceStatus>(initial?.status ?? 'idea')
  const [notes, setNotes] = useState(initial?.note ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [mapsUrl, setMapsUrl] = useState(initial?.mapsUrl ?? '')
  const [openingHours, setOpeningHours] = useState(initial?.openingHours ?? '')
  const [visit, setVisit] = useState(initial?.visitMinutes ? formatDuration(initial.visitMinutes) : '')
  const [lat, setLat] = useState(initial?.lat != null ? String(initial.lat) : '')
  const [lng, setLng] = useState(initial?.lng != null ? String(initial.lng) : '')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [linkHint, setLinkHint] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [Picker, setPicker] = useState<PinPickerComponent | null>(null)
  const [showMap, setShowMap] = useState(false)

  // la mappa per aggiustare il pin si scarica solo se l'utente la apre
  useEffect(() => {
    if (!showMap) return
    let active = true
    import('./MapView').then((m) => active && setPicker(() => m.PinPicker))
    return () => {
      active = false
    }
  }, [showMap])

  const categories = Array.from(new Set([...trip.categories.map((c) => c.label), ...SUGGESTED_CATEGORIES]))

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      setResults(await searchPlaces(query, trip.center))
    } catch (e) {
      setResults(null)
      setSearchError(e instanceof Error ? e.message : 'Ricerca non riuscita. Controlla la connessione.')
    } finally {
      setSearching(false)
    }
  }

  function pick(r: GeoResult) {
    setName(r.name)
    if (r.nameLocal) setNameLocal(r.nameLocal)
    if (r.city) setCity(r.city)
    setAddress(r.address)
    setLat(String(r.lat))
    setLng(String(r.lng))
    setResults(null)
  }

  function onLink(value: string) {
    setMapsUrl(value)
    if (!value.trim()) return setLinkHint(null)
    const info = parseMapsUrl(value)
    if (info) {
      setLat(String(info.lat))
      setLng(String(info.lng))
      if (!name.trim() && info.name) setName(info.name)
      setLinkHint('Posizione letta dal link.')
    } else {
      setLinkHint('Non trovo le coordinate in questo link. I link corti (maps.app.goo.gl) non si leggono: apri il link e incolla quello lungo dalla barra del browser, oppure usa la ricerca qui sopra.')
    }
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!name.trim()) return setError('Scrivi il nome del luogo.')
    const latN = toNumber(lat)
    const lngN = toNumber(lng)
    if (Number.isNaN(latN) || Number.isNaN(lngN)) return setError('Latitudine e longitudine devono essere numeri.')
    if ((latN === null) !== (lngN === null)) return setError('Inserisci sia latitudine che longitudine, oppure nessuna delle due.')
    if (latN !== null && (Math.abs(latN) > 90 || Math.abs(lngN as number) > 180)) return setError('Le coordinate sono fuori intervallo.')

    const visitN = parseDuration(visit)
    if (Number.isNaN(visitN)) return setError('La durata non è chiara: scrivi per esempio 45 min o 1 h 30.')

    setBusy(true)
    setError(null)
    const message = await onSubmit({
      name,
      nameLocal,
      city,
      category,
      status,
      notes,
      address,
      mapsUrl,
      openingHours,
      // senza durata e senza averne mai avuta non si tocca la colonna (esiste solo dopo la migrazione 0015)
      visitMinutes: visitN === null && !initial?.visitMinutes ? undefined : visitN,
      lat: latN,
      lng: lngN,
    })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <section class="space-y-2 rounded-2xl bg-bg p-3">
        <label class="block">
          <span class="mb-1 block text-sm font-extrabold">Cerca su OpenStreetMap</span>
          <div class="flex gap-2">
            <input
              type="search"
              value={query}
              placeholder="Es. Senso-ji Tokyo"
              onInput={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void search()
                }
              }}
              class="min-h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-line bg-surface px-4"
            />
            <button
              type="button"
              onClick={() => void search()}
              disabled={searching || !query.trim()}
              class="min-h-12 shrink-0 rounded-full bg-accent px-5 font-extrabold text-accent-ink disabled:opacity-50"
            >
              {searching ? '…' : 'Cerca'}
            </button>
          </div>
        </label>
        {searchError && <p class="text-sm text-danger">{searchError}</p>}
        {results && results.length === 0 && <p class="text-sm text-muted">Nessun risultato: prova con un altro nome.</p>}
        {results && results.length > 0 && (
          <ul class="divide-y divide-hairline overflow-hidden rounded-[20px] border border-hairline bg-surface">
            {results.map((r) => (
              <li>
                <button type="button" onClick={() => pick(r)} class="block min-h-12 w-full px-4 py-2 text-left">
                  <span class="block truncate font-extrabold">{r.name}</span>
                  <span class="block truncate text-xs text-muted">{r.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <TextField label="…oppure incolla un link di Google Maps" value={mapsUrl} onInput={onLink} placeholder="https://www.google.com/maps/…" />
        {linkHint && <p class="text-xs text-muted">{linkHint}</p>}
      </section>

      <TextField label="Nome" value={name} onInput={setName} maxLength={120} />
      <TextField label="Nome in lingua locale (da mostrare a un tassista)" value={nameLocal} onInput={setNameLocal} maxLength={120} />
      <div class="grid grid-cols-2 gap-3">
        <Select
          label="Città"
          value={city}
          onChange={setCity}
          creatable
          placeholder="Scegli o scrivi"
          options={uniqueCities(trip.places).map((c) => ({ value: c, label: c }))}
        />
        <Select
          label="Categoria"
          value={category}
          onChange={setCategory}
          creatable
          placeholder="Scegli o scrivi"
          options={[{ value: '', label: 'Nessuna' }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
      </div>

      <fieldset>
        <legend class="mb-1 block text-sm font-extrabold">Stato</legend>
        <div class="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              class={`min-h-11 rounded-full border-2 px-4 text-sm font-extrabold ${
                status === s ? 'border-accent bg-accent-soft text-pale' : 'border-line text-muted'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </fieldset>

      <DurationField label="Quanto ci si ferma" value={visit} onInput={setVisit} />

      <TextArea label="Note" value={notes} onInput={setNotes} placeholder="Consigli, orari migliori, cosa ordinare…" />

      <details class="rounded-[20px] border border-hairline px-4 py-1">
        <summary class="min-h-11 cursor-pointer list-none py-3 text-sm font-extrabold">Indirizzo, orari e coordinate</summary>
        <div class="space-y-4 pb-4">
          <TextField label="Indirizzo" value={address} onInput={setAddress} />
          <TextField label="Orari di apertura" value={openingHours} onInput={setOpeningHours} placeholder="9:00–17:00, chiuso il lunedì" />
          <div class="grid grid-cols-2 gap-3">
            <TextField label="Latitudine" value={lat} onInput={setLat} autoComplete="off" />
            <TextField label="Longitudine" value={lng} onInput={setLng} autoComplete="off" />
          </div>
          {showMap ? (
            <div class="space-y-1">
              {Picker ? (
                <Picker
                  lat={toNumber(lat)}
                  lng={toNumber(lng)}
                  center={trip.center}
                  onMove={(a, b) => {
                    setLat(String(a))
                    setLng(String(b))
                  }}
                />
              ) : (
                <p class="grid h-56 place-items-center rounded-2xl bg-bg text-sm text-muted">Carico la mappa…</p>
              )}
              <p class="text-xs text-muted">Trascina il pin o tocca la mappa per correggere la posizione.</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowMap(true)}
              class="min-h-11 rounded-full border-2 border-line px-4 text-sm font-extrabold"
            >
              Aggiusta il pin sulla mappa
            </button>
          )}
        </div>
      </details>

      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva luogo' : 'Aggiungi luogo'}</PrimaryButton>
    </form>
  )
}
