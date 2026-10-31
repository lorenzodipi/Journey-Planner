// Fogli «Nuovo luogo» e «Modifica luogo» (#33) nello stile del design system: ricerca su OpenStreetMap,
// link di Google Maps, nome, nome locale, città, categoria, stato, durata, note, orari strutturati,
// indirizzo e posizione (con il pin da aggiustare sulla mappa).
import { useConflitto } from '../../faraway/useConflitto'
import { ora } from '../../lib/formati'
import { useEffect, useRef, useState } from 'react'
import { formatDuration, parseDuration } from '../../lib/duration'
import { searchPlaces, type GeoResult } from '../../lib/geocode'
import { parseMapsUrl } from '../../lib/mapsUrl'
import { cleanSpec, type OpeningSpec } from '../../lib/opening'
import { accountCategories, type PlaceInput } from '../../lib/tripApi'
import { categorieUnite, possibiliDoppioni, prenotazioniDelLuogo, testoDoppione, visiteDelLuogo } from '../../lib/luoghiExtra'
import { formatShort } from '../../lib/dates'
import { showToast } from '../../state/toast'
import type { PlacePref } from '../../types'
import { useTrips } from '../../state/trip'
import type { Place, PlaceStatus, Trip } from '../../types'
import { SUGGESTED_CATEGORIES, uniqueCities } from '../../ui/placeMeta'
import { Campo, Chip, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { OrariEditor } from './OrariEditor'

type PinPickerComponent = typeof import('../../ui/MapView').PinPicker

const toNumber = (text: string): number | null => {
  const t = text.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

// «In programma» non si sceglie: si mette da solo quando il luogo è in una tappa
const SCELTE: { value: PlaceStatus; label: string }[] = [
  { value: 'idea', label: 'Da visitare' },
  { value: 'done', label: 'Visitato' },
  { value: 'skipped', label: 'Scartato' },
]

interface Props {
  trip: Trip
  /** Presente in modifica. */
  place?: Place
  open: boolean
  onClose: () => void
  /** Apre il foglio già sulla posizione («Aggiungi la posizione» dalla Mappa). */
  focusPosition?: boolean
}

export function LuogoSheet({ trip, place, open, onClose, focusPosition }: Props) {
  const [procediConflitto, nodoConflitto] = useConflitto(trip, 'places', place?.id)
  const t = useTrips()
  const editing = Boolean(place)
  const [name, setName] = useState(place?.name ?? '')
  const [nameLocal, setNameLocal] = useState(place?.nameLocal ?? '')
  const [city, setCity] = useState(place?.city ?? '')
  const [category, setCategory] = useState(place?.category ?? '')
  const [otherCat, setOtherCat] = useState(false)
  const [status, setStatus] = useState<PlaceStatus>(place?.status === 'done' || place?.status === 'skipped' ? place.status : 'idea')
  const [notes, setNotes] = useState(place?.note ?? '')
  const [visit, setVisit] = useState(place?.visitMinutes ? formatDuration(place.visitMinutes) : '')
  const [spec, setSpec] = useState<OpeningSpec | null>(place?.openingSpec ?? null)
  const [address, setAddress] = useState(place?.address ?? '')
  const [website, setWebsite] = useState(place?.website ?? '')
  const [mie, setMie] = useState<string[]>([])
  const [mapsUrl, setMapsUrl] = useState(place?.mapsUrl ?? '')
  const [lat, setLat] = useState(place?.lat != null ? String(place.lat) : '')
  const [lng, setLng] = useState(place?.lng != null ? String(place.lng) : '')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [linkHint, setLinkHint] = useState<{ ok: boolean; text: string } | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [Picker, setPicker] = useState<PinPickerComponent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const posRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMap) return
    let active = true
    import('../../ui/MapView').then((m) => active && setPicker(() => m.PinPicker))
    return () => {
      active = false
    }
  }, [showMap])

  useEffect(() => {
    if (open && focusPosition) window.setTimeout(() => posRef.current?.scrollIntoView({ block: 'start' }), 200)
  }, [open, focusPosition])

  useEffect(() => {
    let active = true
    void accountCategories().then((c) => active && setMie(c)).catch(() => {})
    return () => {
      active = false
    }
  }, [])
  const cats = categorieUnite(trip.categories.map((c) => c.label), mie, SUGGESTED_CATEGORIES.slice(0, 6))
  const pref = place ? trip.placePrefs?.[place.id] : undefined
  const doppioni = name.trim().length > 2 ? possibiliDoppioni(trip.places, { id: place?.id, name, lat: toNumber(lat) ?? null, lng: toNumber(lng) ?? null }).filter((d) => !Number.isNaN(d.place.lat ?? 0)) : []
  const visite = place ? visiteDelLuogo(trip, place.id) : []
  const prenotazioni = place ? prenotazioniDelLuogo(trip, place) : []

  async function scegliPref(v: PlacePref) {
    if (!place) return
    const m = await t.setPlacePref(place.id, pref === v ? null : v)
    if (m) showToast(m)
  }
  async function archivia() {
    if (!place) return
    const m = await t.archivePlace(place.id, true)
    if (m) return showToast(m)
    showToast(`«${place.name}» archiviato`, { label: 'Annulla', run: () => void t.archivePlace(place.id, false) })
    onClose()
  }
  const cities = [...new Set([...uniqueCities(trip.places), ...trip.days.map((d) => d.city).filter(Boolean)])]

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
    setQuery('')
  }

  function onLink(value: string) {
    setMapsUrl(value)
    if (!value.trim()) return setLinkHint(null)
    const info = parseMapsUrl(value)
    if (info) {
      setLat(String(info.lat))
      setLng(String(info.lng))
      if (!name.trim() && info.name) setName(info.name)
      setLinkHint({ ok: true, text: 'Posizione letta dal link' })
    } else {
      setLinkHint({ ok: false, text: 'Non trovo la posizione in questo link. I link corti (maps.app.goo.gl) non si leggono: aprilo e incolla quello lungo dalla barra del browser, oppure cerca il luogo qui sopra.' })
    }
  }

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!name.trim()) return setError('Scrivi il nome del luogo.')
    const latN = toNumber(lat)
    const lngN = toNumber(lng)
    if (Number.isNaN(latN) || Number.isNaN(lngN)) return setError('Latitudine e longitudine devono essere numeri, per esempio 35,0116.')
    if ((latN === null) !== (lngN === null)) return setError('Scrivi sia la latitudine sia la longitudine, oppure nessuna delle due.')
    if (latN !== null && (Math.abs(latN) > 90 || Math.abs(lngN as number) > 180)) return setError('Le coordinate sono fuori dalla mappa: controlla i numeri.')
    const visitN = parseDuration(visit)
    if (Number.isNaN(visitN)) return setError('La durata non è chiara: scrivi per esempio 45 min o 1 h 30.')
    const bad = spec && Object.values(spec.w).some((f) => f?.some((x) => !x.from || !x.to))
    if (bad) return setError('In un giorno manca l’ora di apertura o di chiusura.')
    const cleaned = spec ? (cleanSpec(spec) ?? null) : null

    if (!(await procediConflitto())) return
    setBusy(true)
    setError(null)
    const input: PlaceInput = {
      name,
      nameLocal,
      city,
      category,
      status,
      notes,
      address,
      mapsUrl,
      website: website.trim() === '' && !place?.website ? undefined : website,
      openingHours: place?.openingHours ?? '',
      // le colonne nuove si toccano solo se servono (l'app funziona anche prima delle migrazioni)
      visitMinutes: visitN === null && !place?.visitMinutes ? undefined : visitN,
      openingSpec: cleaned === null && !place?.openingSpec ? undefined : cleaned,
      lat: latN,
      lng: lngN,
    }
    const message = place ? await t.updatePlace(place.id, trip.id, input) : await t.createPlace(trip.id, input)
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  return (
    <Foglio
      open={open}
      full
      title={editing ? 'Modifica luogo' : 'Nuovo luogo'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="luogo-form" isLoading={busy}>
          {busy ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Aggiungi luogo'}
        </Pulsante>
      }
    >
      <form id="luogo-form" className="frm" onSubmit={submit} noValidate style={{ overflow: 'visible' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <Campo
            label="Cerca su OpenStreetMap"
            icon="search"
            type="search"
            value={query}
            onChange={setQuery}
            placeholder="es. Fushimi Inari Kyoto"
            enterKeyHint="search"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void search()
              }
            }}
            trailing={
              <button type="button" className="fa-btn soft sm" style={{ height: 36, padding: '0 12px' }} disabled={searching || !query.trim()} onClick={() => void search()}>
                {searching ? 'Cerco…' : 'Cerca'}
              </button>
            }
          />
          {searchError ? (
            <span className="fa-help bad" role="alert">
              <Sv name="err" size={16} />
              {searchError}
            </span>
          ) : null}
          {results && results.length === 0 ? <span className="fa-help">Nessun risultato: prova con un altro nome o aggiungi la città.</span> : null}
          {results && results.length > 0 ? (
            <ul className="fa-list" aria-label="Risultati">
              {results.map((r, i) => (
                <li key={i}>
                  <button type="button" className="fa-row" style={{ minHeight: 52, gridTemplateColumns: '20px minmax(0,1fr) auto', width: '100%' }} onClick={() => pick(r)}>
                    <Sv name="pin" size={20} />
                    <span style={{ minWidth: 0 }}>
                      <span className="t" style={{ display: 'block' }}>
                        {r.name}
                      </span>
                      <span className="s" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.address}
                      </span>
                    </span>
                    <span />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Campo label="…oppure incolla un link di Google Maps" icon="link" value={mapsUrl} onChange={onLink} placeholder="https://www.google.com/maps/…" autoComplete="off" positive={linkHint?.ok ? linkHint.text : undefined} hint={linkHint && !linkHint.ok ? linkHint.text : undefined} />
        </div>

        <Campo label="Nome" value={name} onChange={setName} maxLength={120} placeholder="es. Ramen da Gokkei" />
        {doppioni.length > 0 ? (
          <span className="fa-help" role="status">
            <Sv name="warn" size={16} />
            {testoDoppione(name.trim(), doppioni[0])}. Puoi salvare lo stesso.
          </span>
        ) : null}
        <Campo label="Nome nella lingua del posto" value={nameLocal} onChange={setNameLocal} maxLength={120} hint="Da mostrare a un tassista" />
        <Campo label="Città" icon="pin" value={city} onChange={setCity} list="luogo-citta" autoComplete="off" placeholder="es. Kyoto" />
        <datalist id="luogo-citta">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="fa-fld" role="group" aria-label="Categoria">
          Categoria
          <div className="fa-chips wrap">
            {cats.map((c) => (
              <Chip key={c} on={!otherCat && category === c} onPress={() => (setOtherCat(false), setCategory(category === c ? '' : c))}>
                {c}
              </Chip>
            ))}
            {category && !cats.includes(category) && !otherCat ? (
              <Chip on onPress={() => setCategory('')}>
                {category}
              </Chip>
            ) : null}
            <Chip on={otherCat} onPress={() => (setOtherCat(!otherCat), setCategory(''))}>
              Altra…
            </Chip>
          </div>
          {otherCat ? <Campo label="Nuova categoria" hideLabel value={category} onChange={setCategory} placeholder="es. Onsen" maxLength={40} autoFocus /> : null}
        </div>

        <div className="fa-fld" role="group" aria-label="Stato">
          Stato
          <div className="fa-chips wrap">
            {SCELTE.map((s) => (
              <Chip key={s.value} on={status === s.value} onPress={() => setStatus(s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
          <span className="fa-help">«In programma» si mette da solo quando il luogo è in una tappa.</span>
        </div>

        <Campo label="Sito web" icon="link" type="url" inputMode="url" value={website} onChange={setWebsite} placeholder="https://…" autoComplete="off" />
        {place ? (
          <div className="fa-fld" role="group" aria-label="La mia preferenza">
            La mia preferenza
            <div className="fa-chips wrap">
              <Chip on={pref === 'must'} onPress={() => void scegliPref('must')}>Da non perdere</Chip>
              <Chip on={pref === 'if_time'} onPress={() => void scegliPref('if_time')}>Se c’è tempo</Chip>
            </div>
            <span className="fa-help">La vedi solo tu, gli altri non la vedono.</span>
          </div>
        ) : null}
        <Campo label="Quanto ci si ferma" icon="clock" value={visit} onChange={setVisit} placeholder="es. 1 h 30" />
        <Campo label="Note" textarea value={notes} onChange={setNotes} placeholder="Cosa ordinare, l'ora migliore, come arrivarci…" />

        <OrariEditor value={spec} onChange={setSpec} legacyText={place?.openingHours} />

        <div ref={posRef} style={{ display: 'grid', gap: 16, scrollMarginTop: 16 }}>
          <Campo label="Indirizzo" icon="pin" value={address} onChange={setAddress} />
          <div className="fa-2c">
            <Campo label="Latitudine" inputMode="decimal" value={lat} onChange={setLat} autoComplete="off" />
            <Campo label="Longitudine" inputMode="decimal" value={lng} onChange={setLng} autoComplete="off" />
          </div>
          {showMap ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {Picker ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--hairline)' }}>
                  <Picker
                    lat={toNumber(lat)}
                    lng={toNumber(lng)}
                    center={trip.center}
                    onMove={(a, b) => {
                      setLat(String(a))
                      setLng(String(b))
                    }}
                  />
                </div>
              ) : (
                <span className="fa-help">Carico la mappa…</span>
              )}
              <span className="fa-help">Trascina il pin o tocca la mappa per correggere la posizione.</span>
            </div>
          ) : (
            <button type="button" className="fa-btn out" style={{ height: 44, fontSize: 14 }} onClick={() => setShowMap(true)}>
              <Sv name="pin" size={20} />
              Aggiusta il pin sulla mappa
            </button>
          )}
        </div>
        {visite.length > 0 ? (
          <div className="fa-fld" role="group" aria-label="Visite">
            Visite
            <ul className="fa-list">
              {visite.map((v) => (
                <li key={v.itemId} className="fa-row" style={{ minHeight: 44 }}>
                  <span className="t">{formatShort(v.date)}{v.time ? ` · ${ora(v.time)}` : ''}</span>
                  <span className="s">{v.city}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {prenotazioni.length > 0 ? (
          <div className="fa-fld" role="group" aria-label="Prenotazioni">
            Prenotazioni
            <ul className="fa-list">
              {prenotazioni.map((b) => (
                <li key={b.id} className="fa-row" style={{ minHeight: 44 }}>
                  <span className="t">{b.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {place ? (
          <Pulsante color="tertiary" iconLeading="archive" onPress={() => void archivia()}>
            Archivia il luogo
          </Pulsante>
        ) : null}
        {error ? (
          <span className="fa-help bad" role="alert">
            <Sv name="err" size={16} />
            {error}
          </span>
        ) : null}
      </form>
    {nodoConflitto}
    </Foglio>
  )
}
