// Fogli «Nuovo luogo» e «Modifica luogo» (#33), a gruppi: Trova il luogo (OpenStreetMap o link di Google Maps), Il luogo
// (nome, nome locale, città, categoria a riquadri, stato, sito), La visita (preferenza, durata a scelte rapide, orari, note),
// Posizione (indirizzo e pin), Nel viaggio (visite e prenotazioni), Altri dettagli (latitudine e longitudine).
import { SceltaIcona } from '../../faraway/SceltaIcona'
import { glifoCategoria, iconaDalNome } from '../../lib/categoryIcon'
import { compilati } from '../../lib/moduli'
import { Loader } from '../../faraway/Loader'
import { useConflitto } from '../../faraway/useConflitto'
import { ora } from '../../lib/formati'
import { useEffect, useRef, useState } from 'react'
import { formatDuration, parseDuration } from '../../lib/duration'
import { reverseGeocode, searchPlaces, type GeoResult } from '../../lib/geocode'
import { parseMapsUrl } from '../../lib/mapsUrl'
import { cleanSpec, type OpeningSpec } from '../../lib/opening'
import { accountCategories, type PlaceInput } from '../../lib/tripApi'
import { categorieUnite, possibiliDoppioni, prenotazioniDelLuogo, testoDoppione, visiteDelLuogo } from '../../lib/luoghiExtra'
import { formatShort } from '../../lib/dates'
import { showToast } from '../../state/toast'
import type { PlacePref } from '../../types'
import { useTrips } from '../../state/trip'
import type { Place, PlaceStatus, Trip } from '../../types'
import { SUGGESTED_CATEGORIES } from '../../ui/placeMeta'
import { Campo, Chip, Pulsante } from '../../faraway/base'
import { AltriDettagli, Gruppo, Riquadri } from '../../faraway/Moduli'
import { CampoDurata } from '../../faraway/CampoDurata'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { OrariEditor } from './OrariEditor'
import { useInCorso } from '../../faraway/Attesa'

type PinPickerComponent = typeof import('../../ui/MapView').PinPicker

const toNumber = (text: string): number | null => {
  const t = text.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

const ALTRA = '__altra__'
/** Scelte rapide di «Quanto ci si ferma», in minuti. */
const DURATE: [number, string][] = [[30, '30 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h'], [180, '3 h'], [240, 'Mezza giornata']]

// «In programma» non si sceglie: si mette da solo quando il luogo è in una tappa
const SCELTE: { value: PlaceStatus; label: string; icona: 'pin' | 'check' | 'close' }[] = [
  { value: 'idea', label: 'Da visitare', icona: 'pin' },
  { value: 'done', label: 'Visitato', icona: 'check' },
  { value: 'skipped', label: 'Scartato', icona: 'close' },
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
  /** Icona scelta a mano per la categoria nuova; finché non la si tocca segue il nome che si scrive. */
  const [icona, setIcona] = useState<string | null>(null)
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
  const [altraDurata, setAltraDurata] = useState(false)
  /** cresce a ogni «Salva»: riapre «Altri dettagli» se l'errore è lì, anche se è lo stesso di prima */
  const [tentativi, setTentativi] = useState(0)

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
  const [occ, faiOcc] = useInCorso()
  async function archivia() {
    if (!place) return
    const m = await faiOcc('archivia', () => t.archivePlace(place.id, true))
    if (m) return showToast(m)
    showToast(`«${place.name}» archiviato`, { label: 'Annulla', run: () => void t.archivePlace(place.id, false) })
    onClose()
  }

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
      // città e indirizzo dalle coordinate (solo i campi ancora vuoti)
      if (!city.trim() || !address.trim()) {
        reverseGeocode(info.lat, info.lng)
          .then((r) => {
            if (!city.trim() && r.city) setCity(r.city)
            if (!address.trim() && r.address) setAddress(r.address)
            if (r.city || r.address) setLinkHint({ ok: true, text: 'Posizione, città e indirizzo letti dal link: controlla che siano giusti.' })
          })
          .catch(() => undefined)
      }
    } else {
      setLinkHint({ ok: false, text: 'Non trovo la posizione in questo link. I link corti (maps.app.goo.gl) non si leggono: aprilo e incolla quello lungo dalla barra del browser, oppure cerca il luogo qui sopra.' })
    }
  }

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    setTentativi((n) => n + 1)
    if (!name.trim()) return setError('Scrivi il nome del luogo.')
    const latN = toNumber(lat)
    const lngN = toNumber(lng)
    if (Number.isNaN(latN) || Number.isNaN(lngN)) return setError('Latitudine e longitudine devono essere numeri, per esempio 35,0116.')
    if ((latN === null) !== (lngN === null)) return setError('Scrivi sia la latitudine sia la longitudine, oppure nessuna delle due.')
    if (latN !== null && (Math.abs(latN) > 90 || Math.abs(lngN as number) > 180)) return setError('Le coordinate sono fuori dalla mappa: controlla i numeri.')
    const visitN = parseDuration(visit)
    if (Number.isNaN(visitN)) return setError('La durata non è chiara: scrivi per esempio 45min o 1h 30min.')
    const bad = spec && Object.values(spec.w).some((f) => f?.some((x) => !x.from || !x.to))
    if (bad) return setError('In un giorno manca l’ora di apertura o di chiusura.')
    const cleaned = spec ? (cleanSpec(spec) ?? null) : null

    if (!(await procediConflitto())) return
    setBusy(true)
    setError(null)
    const input: PlaceInput = {
      ...(otherCat && category.trim() ? { categoryIcon: icona ?? iconaDalNome(category) } : {}),
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

  const visitN = parseDuration(visit)
  const rapida = !altraDurata && visitN !== null && !Number.isNaN(visitN) && DURATE.some(([m]) => m === visitN) ? visitN : null
  const catScelta = otherCat ? ALTRA : category
  const catOpzioni = [...cats, ...(category && !cats.includes(category) && !otherCat ? [category] : [])]
  const erroreCoord = !!error && /latitudine|longitudine|coordinate/i.test(error)

  return (
    <Foglio
      open={open}
      full
      title={editing ? 'Modifica luogo' : 'Nuovo luogo'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="luogo-form" isLoading={busy}>
          {editing ? 'Salva le modifiche' : 'Aggiungi il luogo'}
        </Pulsante>
      }
    >
      <form id="luogo-form" className="frm grp" onSubmit={submit} noValidate style={{ overflow: 'visible' }}>
        <Gruppo titolo="Trova il luogo">
          <div style={{ display: 'grid', gap: 8 }}>
            <Campo
              label="Cerca su OpenStreetMap"
              icon="search"
              type="search"
              value={query}
              onChange={setQuery}
              placeholder="es. Fushimi Inari"
              enterKeyHint="search"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void search()
                }
              }}
              trailing={
                <button type="button" className="fa-btn soft sm" style={{ height: 36, padding: '0 16px' }} disabled={searching || !query.trim()} onClick={() => void search()}>
                  {searching ? <Loader size={16} label="Ricerca in corso" /> : 'Cerca'}
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
          </div>
          <Campo
            label="Oppure incolla un link di Google Maps"
            icon="link"
            value={mapsUrl}
            onChange={onLink}
            placeholder="es. google.com/maps/…"
            autoComplete="off"
            positive={linkHint?.ok ? linkHint.text : undefined}
            hint={linkHint ? (linkHint.ok ? undefined : linkHint.text) : 'Compilo da solo nome, città, indirizzo e posizione.'}
          />
        </Gruppo>

        <Gruppo titolo="Il luogo">
          <Campo label="Nome" value={name} onChange={setName} maxLength={120} placeholder="es. Fushimi Inari" />
          {doppioni.length > 0 ? (
            <span className="fa-help" role="status">
              <Sv name="warn" size={16} />
              {testoDoppione(name.trim(), doppioni[0])}. Puoi salvare lo stesso.
            </span>
          ) : null}
          <Campo label="Nome nella lingua del posto" value={nameLocal} onChange={setNameLocal} maxLength={120} hint="Da mostrare a un tassista" placeholder="" />
          <Campo label="Città" icon="pin" value={city} onChange={setCity} autoComplete="off" placeholder="es. Kyoto" />
          <Riquadri<string>
            label="Categoria"
            cols={4}
            value={catScelta}
            deselezionabile
            onChange={(v) => {
              if (v === ALTRA) return (setOtherCat(true), setCategory(''))
              setOtherCat(false)
              setCategory(v)
            }}
            options={[...catOpzioni.map((c) => ({ value: c, label: c, glifo: glifoCategoria(c) })), { value: ALTRA, label: 'Altra…', glifo: 'g-plus' }]}
          >
            {otherCat ? <Campo label="Nuova categoria" hideLabel value={category} onChange={setCategory} placeholder="es. Onsen" maxLength={40} autoFocus /> : null}
            {otherCat ? <SceltaIcona value={icona ?? iconaDalNome(category)} onChange={setIcona} /> : null}
          </Riquadri>
          <Riquadri<PlaceStatus> label="Stato" cols={3} value={status} onChange={(v) => v && setStatus(v)} options={SCELTE}>
            <span className="fa-help">«In programma» si mette da solo quando il luogo è in una tappa.</span>
          </Riquadri>
          <Campo label="Sito web" icon="link" type="url" inputMode="url" value={website} onChange={setWebsite} placeholder="es. inari.jp" autoComplete="off" />
        </Gruppo>

        <Gruppo titolo="La visita">
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
          <div className="fa-fld" role="group" aria-label="Quanto ci si ferma">
            Quanto ci si ferma
            <div className="fa-chips wrap">
              {DURATE.map(([m, l]) => (
                <Chip key={m} on={rapida === m} onPress={() => (setAltraDurata(false), setVisit(rapida === m ? '' : formatDuration(m)))}>
                  {l}
                </Chip>
              ))}
              <Chip on={altraDurata || (rapida === null && !!visit.trim())} onPress={() => setAltraDurata(true)}>
                Altro…
              </Chip>
            </div>
          </div>
          {altraDurata || (rapida === null && !!visit.trim()) ? <CampoDurata label="Durata" value={visit} onChange={setVisit} placeholder="es. 1h 15min" /> : null}
          <OrariEditor value={spec} onChange={setSpec} legacyText={place?.openingHours} />
          <Campo label="Note" textarea value={notes} onChange={setNotes} placeholder="" />
        </Gruppo>

        <div ref={posRef} style={{ scrollMarginTop: 16, display: 'grid' }}>
          <Gruppo titolo="Posizione">
            <Campo label="Indirizzo" icon="pin" value={address} onChange={setAddress} placeholder="es. 68 Fukakusa, Kyoto" />
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
                  <Loader size={24} label="Caricamento della mappa" />
                )}
                <span className="fa-help">Trascina il pin o tocca la mappa per correggere la posizione.</span>
              </div>
            ) : (
              <button type="button" className="fa-btn out" style={{ height: 44, fontSize: 14 }} onClick={() => setShowMap(true)}>
                <Sv name="pin" size={20} />
                Aggiusta il pin sulla mappa
              </button>
            )}
          </Gruppo>
        </div>

        {visite.length > 0 || prenotazioni.length > 0 ? (
          <Gruppo titolo="Nel viaggio">
            {visite.length > 0 ? (
              <div className="fa-fld" role="group" aria-label="Visite">
                Visite
                <ul className="fa-list">
                  {visite.map((v) => (
                    <li key={v.itemId} className="fa-row" style={{ minHeight: 44, gridTemplateColumns: 'minmax(0,1fr) auto' }}>
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
                    <li key={b.id} className="fa-row" style={{ minHeight: 44, gridTemplateColumns: 'minmax(0,1fr)' }}>
                      <span className="t">{b.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Gruppo>
        ) : null}

        <AltriDettagli pieni={compilati([lat, lng])} contenuto="Latitudine e longitudine" errore={erroreCoord ? tentativi : undefined} apriSeCompilati={false}>
          <div className="fa-2c">
            <Campo label="Latitudine" inputMode="decimal" value={lat} onChange={setLat} autoComplete="off" placeholder="es. 34,9671" />
            <Campo label="Longitudine" inputMode="decimal" value={lng} onChange={setLng} autoComplete="off" placeholder="es. 135,7727" />
          </div>
        </AltriDettagli>
        {place ? (
          <Pulsante color="tertiary" iconLeading="archive" isLoading={occ === 'archivia'} onPress={() => void archivia()}>
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
