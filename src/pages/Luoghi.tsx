// Scheda Luoghi (mock Fa-16…Fa-21, Fa-56, issue #33): Elenco | Mappa con filtri separati, pillole di stato,
// card aperta in linea con «Aggiungi a una tappa», selezione multipla, FAB «+ Luogo».
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import { countActive, EMPTY_FILTERS, filterPlaces, type PlaceFilters } from '../lib/placeFilter'
import { LUOGHI_VIEW, viewPlaces } from '../lib/placeView'
import { conStato, STATI_LUOGO, STATO_LUOGO, tappaDelLuogo } from '../lib/luoghi'
import { isJapanTrip } from '../lib/tripLocale'
import { usePlaceFilters } from '../state/placeFilters'
import { usePlaceView } from '../state/placeView'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Place, PlaceStatus, Trip } from '../types'
import type { MapApi, MapPin } from '../ui/MapView'
import { usePlacePhoto } from '../ui/usePlacePhoto'
import { Ic } from '../ui/Sprite'
import { Campo, Chip, Pulsante, PulsanteIcona, Segmenti } from '../faraway/base'
import { cx } from '../faraway/cx'
import { useConferma } from '../faraway/Foglio'
import { Sv } from '../faraway/icons'
import { discOfPlace, LuogoCard } from '../faraway/Luogo'
import { useUnaAperta } from '../faraway/Righe'
import { BarraGrande, Schermata } from '../faraway/shell'
import { Vuoto, VuotoFiltro } from '../faraway/Stati'
import { SpostaSheet } from './giorno/SpostaSheet'
import { FiltriSheet } from './luoghi/FiltriSheet'
import { LuogoSheet } from './luoghi/LuogoSheet'
import { TrovaPosizioni } from './luoghi/TrovaPosizioni'

type Vista = 'elenco' | 'mappa'
type MapViewComponent = typeof import('../ui/MapView').MapView

const VUOTO_STATO: Record<PlaceStatus, { title: string; text: string }> = {
  idea: { title: 'Nessun luogo da visitare', text: 'Qui trovi i luoghi salvati che non sono ancora in un giorno.' },
  planned: { title: 'Nessun luogo in programma', text: 'Quando aggiungi un luogo a un giorno lo trovi qui.' },
  done: { title: 'Nessun luogo visitato', text: 'Quando segni come fatta una tappa, il suo luogo arriva qui.' },
  skipped: { title: 'Nessun luogo scartato', text: 'Quando scarti un luogo lo trovi qui, senza che finisca nel programma.' },
}

const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`

/** Barra «Filtri» + pillole di stato (Tutti · Da visitare · In programma · Visitato · Scartato). */
function RigaFiltri({ filters, onChange, onOpen }: { filters: PlaceFilters; onChange: (f: PlaceFilters) => void; onOpen: () => void }) {
  const active = countActive(filters)
  const only = filters.statuses.length === 1 ? filters.statuses[0] : null
  return (
    <div className="fa-frow">
      <button type="button" className={cx('fa-fbtn', active > 0 && 'on')} aria-label={active > 0 ? `Apri i filtri, ${active} attivi` : 'Apri i filtri'} onClick={onOpen}>
        <Sv name="filter" size={18} />
        Filtri
        {active > 0 ? <b>{active}</b> : null}
      </button>
      <div className="fa-chips scroll" role="group" aria-label="Stato">
        <Chip on={filters.statuses.length === 0} onPress={() => onChange({ ...filters, statuses: [] })}>
          Tutti
        </Chip>
        {STATI_LUOGO.map((s) => (
          <Chip key={s} on={only === s} onPress={() => onChange({ ...filters, statuses: only === s ? [] : [s] })}>
            {STATO_LUOGO[s].label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

/** Azioni comuni sulle card: aggiungere a un giorno, spostare la tappa, modificare, eliminare. */
function useAzioniLuogo(trip: Trip) {
  const t = useTrips()
  const [ask, confirmNode] = useConferma()
  const [sheet, setSheet] = useState<{ place?: Place; focusPosition?: boolean } | null>(null)
  const [move, setMove] = useState<{ place: Place } | null>(null)

  async function addToDay(place: Place, dayId: string) {
    const index = trip.days.findIndex((d) => d.id === dayId)
    const message = await t.createItem(trip.id, dayId, { title: place.name, kind: 'visit', startTime: '', endTime: '', notes: '', placeId: place.id })
    if (message) showToast(message)
    else showToast(`Aggiunto al Giorno ${index + 1}`)
  }

  async function remove(list: Place[]): Promise<boolean> {
    if (list.length === 0) return false
    const used = list.filter((p) => tappaDelLuogo(trip, p.id)).length
    const one = list.length === 1
    const ok = await ask({
      title: one ? `Eliminare «${list[0].name}»?` : `Eliminare ${list.length} luoghi?`,
      message: used > 0 ? `${one ? 'Resta nelle tappe dei giorni' : 'Le tappe dei giorni restano'}, ma senza il luogo collegato. Puoi annullare subito dopo.` : 'Puoi annullare subito dopo.',
      confirm: one ? 'Elimina il luogo' : `Elimina ${list.length} luoghi`,
      cancel: one ? 'Tieni il luogo' : 'Tieni i luoghi',
      destructive: true,
    })
    if (!ok) return false
    const ids = list.map((p) => p.id)
    const message = await t.setPlacesDeleted(ids, true) // una sola richiesta per tutti
    if (message) {
      showToast(message)
      return false
    }
    showToast(one ? 'Luogo eliminato' : `${list.length} luoghi eliminati`, { label: 'Annulla', run: () => void t.setPlacesDeleted(ids, false) })
    return true
  }

  const tappa = move ? tappaDelLuogo(trip, move.place.id) : null
  const nodes = (
    <>
      {confirmNode}
      {sheet ? <LuogoSheet key={sheet.place?.id ?? 'new'} trip={trip} place={sheet.place} focusPosition={sheet.focusPosition} open onClose={() => setSheet(null)} /> : null}
      {move && tappa ? (
        <SpostaSheet
          trip={trip}
          current={trip.days[tappa.dayIndex]}
          open
          title="Sposta in un altro giorno"
          preferCity={move.place.city}
          onClose={() => setMove(null)}
          onMove={async (dayId) => {
            const m = await t.moveItemToDay(trip.id, tappa.item.id, dayId)
            if (!m) showToast(`Spostato al Giorno ${trip.days.findIndex((d) => d.id === dayId) + 1}`)
            return m
          }}
        />
      ) : null}
    </>
  )
  return {
    nodes,
    addToDay,
    remove,
    edit: (place: Place, focusPosition = false) => setSheet({ place, focusPosition }),
    create: () => setSheet({}),
    changeDay: (place: Place) => setMove({ place }),
  }
}

export function Luoghi() {
  const search = useSearch()
  const [, navigate] = useLocation()
  const vista: Vista = new URLSearchParams(search).get('vista') === 'mappa' ? 'mappa' : 'elenco'
  const setVista = (v: Vista) => navigate(v === 'mappa' ? '/luoghi?vista=mappa' : '/luoghi', { replace: true })
  return vista === 'mappa' ? <Mappa setVista={setVista} /> : <Elenco setVista={setVista} />
}

function sottotitolo(places: Place[]): string {
  if (places.length === 0) return 'Nessun luogo'
  const cities = new Set(places.map((p) => p.city.trim().toLowerCase()).filter(Boolean)).size
  return [n(places.length, 'luogo', 'luoghi'), cities > 0 ? n(cities, 'città', 'città') : ''].filter(Boolean).join(' · ')
}

/** Ricerca nei luoghi, sotto la barra: si apre con «Cerca». */
function CampoCerca({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Campo label="Cerca nei tuoi luoghi" hideLabel icon="search" type="search" value={value} onChange={onChange} placeholder="Nome, città o categoria" autoFocus enterKeyHint="search" />
}

/* ------------------------------------------------------------------ Elenco */

function Elenco({ setVista }: { setVista: (v: Vista) => void }) {
  const trip = useTrip()
  const places = useMemo(() => conStato(trip), [trip])
  const [filters, setFilters] = usePlaceFilters('luoghi', trip.id)
  const [view, setView] = usePlaceView(trip.id, LUOGHI_VIEW)
  const [filtriOpen, setFiltriOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [text, setText] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const card = useUnaAperta()
  const az = useAzioniLuogo(trip)

  const visible = filterPlaces(places, filters, searchOpen ? text : '')
  const dayIndex = (id: string) => tappaDelLuogo(trip, id)?.dayIndex
  const groups = viewPlaces(visible, view, { dayIndex, categoryOrder: trip.categories.map((c) => c.label) })
  const chosen = visible.filter((p) => sel.has(p.id))
  const allSelected = visible.length > 0 && chosen.length === visible.length
  const original = (p: Place) => trip.places.find((x) => x.id === p.id) ?? p

  const stopSelecting = () => (setSelecting(false), setSel(new Set()))
  const startSelecting = (id?: string) => {
    card.setOpen(null)
    setSelecting(true)
    setSel(new Set(id ? [id] : []))
  }
  const toggleSel = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // il tasto «indietro» esce dalla selezione
  useEffect(() => {
    if (!selecting) return
    const root = document.documentElement
    root.setAttribute('data-card-open', '')
    const close = () => stopSelecting()
    window.addEventListener('fa:close-card', close)
    return () => {
      root.removeAttribute('data-card-open')
      window.removeEventListener('fa:close-card', close)
    }
  }, [selecting])

  const only = filters.statuses.length === 1 && countActive(filters) === 1 && !text ? filters.statuses[0] : null
  const empty = trip.places.length === 0

  const bar = selecting ? (
    <BarraGrande
      title={chosen.length === 0 ? 'Tocca i luoghi' : n(chosen.length, 'selezionato', 'selezionati')}
      sub="Scegli i luoghi da eliminare"
      actions={
        <button type="button" className="fa-btn soft sm" onClick={stopSelecting}>
          Annulla
        </button>
      }
    />
  ) : (
    <BarraGrande
      title="Luoghi"
      sub={sottotitolo(trip.places)}
      actions={
        empty ? (
          <PulsanteIcona icon="search" label="Cerca un luogo" pressed={searchOpen} onPress={() => (setSearchOpen(!searchOpen), setText(''))} />
        ) : (
          <>
            <PulsanteIcona icon="check" label="Seleziona luoghi" onPress={() => startSelecting()} />
            <PulsanteIcona icon="search" label="Cerca un luogo" pressed={searchOpen} onPress={() => (setSearchOpen(!searchOpen), setText(''))} />
          </>
        )
      }
    />
  )

  return (
    <Schermata
      bar={bar}
      tabs={!selecting}
      fab={empty || selecting ? null : { label: 'Luogo', aria: 'Aggiungi un luogo', onPress: az.create }}
      className={selecting ? 'fa-selmode' : undefined}
      overlay={
        <>
          {selecting ? (
            <div className="fa-selbar">
              <Pulsante color="tertiary-destructive" iconLeading="trash" isDisabled={chosen.length === 0} onPress={() => void az.remove(chosen.map(original)).then((ok) => ok && stopSelecting())}>
                {chosen.length === 0 ? 'Elimina' : chosen.length === 1 ? 'Elimina 1 luogo' : `Elimina ${chosen.length} luoghi`}
              </Pulsante>
            </div>
          ) : null}
          {filtriOpen ? (
            <FiltriSheet
              trip={trip}
              places={places}
              open
              filters={filters}
              view={view}
              onApply={(f, v) => {
                setFilters(f)
                if (v) setView(v)
              }}
              onClose={() => setFiltriOpen(false)}
            />
          ) : null}
          {az.nodes}
        </>
      }
    >
      {searchOpen && !selecting ? <CampoCerca value={text} onChange={setText} /> : null}
      {selecting ? null : (
        <Segmenti
          label="Vista"
          value="elenco"
          options={[
            { value: 'elenco', label: 'Elenco' },
            { value: 'mappa', label: 'Mappa' },
          ]}
          onChange={(v) => setVista(v as Vista)}
        />
      )}
      {empty ? (
        <Vuoto art="vuotoLuoghi" title="Nessun luogo salvato" text="Salva qui ristoranti, templi e viste da non perdere. Poi li metti nei giorni che vuoi." action="Aggiungi un luogo" onAction={az.create} />
      ) : (
        <>
          {selecting ? null : <RigaFiltri filters={filters} onChange={setFilters} onOpen={() => setFiltriOpen(true)} />}
          {selecting ? null : <TrovaPosizioni />}
          {visible.length === 0 ? (
            only ? (
              <VuotoFiltro title={VUOTO_STATO[only].title} text={VUOTO_STATO[only].text} action="Mostra tutti i luoghi" onAction={() => setFilters(EMPTY_FILTERS)} />
            ) : (
              <VuotoFiltro title="Nessun luogo con questi filtri" text={text ? 'Nessun luogo ha questo nome: prova a scriverlo in un altro modo.' : 'Prova a togliere qualche filtro.'} action="Mostra tutti i luoghi" onAction={() => (setFilters(EMPTY_FILTERS), setText(''))} />
            )
          ) : null}
          {selecting && visible.length > 0 ? (
            <button
              type="button"
              className="fa-card fa-selall"
              role="checkbox"
              aria-checked={allSelected ? true : chosen.length > 0 ? 'mixed' : false}
              onClick={() => setSel(allSelected ? new Set() : new Set(visible.map((p) => p.id)))}
            >
              <span className={cx('fa-cbx', chosen.length > 0 && 'on')} aria-hidden="true">
                {allSelected ? <Sv name="check" size={16} /> : chosen.length > 0 ? <Sv name="minus" size={16} /> : null}
              </span>
              <span className="t">{allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}</span>
              <span className="fa-c">
                {chosen.length} su {visible.length}
              </span>
            </button>
          ) : null}
          {groups.map((g) => (
            <section key={g.key} aria-label={g.title || 'Luoghi'} style={{ display: 'grid', gap: 8 }}>
              {g.title ? (
                <div className="fa-sech">
                  <h2 className="fa-h3">{g.title}</h2>
                  <span className="fa-c">{n(g.places.length, 'luogo', 'luoghi')}</span>
                </div>
              ) : null}
              <div className="k-Luoghi">
                <div className="list">
                  {g.places.map((p) => (
                    <LuogoCard
                      key={p.id}
                      trip={trip}
                      place={original(p)}
                      open={card.isOpen(p.id)}
                      onToggle={() => card.toggle(p.id)}
                      onAddToDay={(dayId) => az.addToDay(original(p), dayId)}
                      onChangeDay={() => az.changeDay(original(p))}
                      onEdit={() => az.edit(original(p))}
                      onDelete={() => void az.remove([original(p)])}
                      selecting={selecting}
                      selected={sel.has(p.id)}
                      onSelect={() => toggleSel(p.id)}
                      onLongPress={() => startSelecting(p.id)}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </>
      )}
    </Schermata>
  )
}

/* ------------------------------------------------------------------ Mappa */

/** La foto di Wikipedia del luogo (#20) nel disco della card della Mappa, se c'è; sotto resta il disco. */
function FotoLuogo({ trip, place }: { trip: Trip; place: Place }) {
  const photo = usePlacePhoto(place, isJapanTrip(trip) ? ['ja'] : [])
  const url = photo.status === 'ready' ? photo.photo.url : null
  const [bad, setBad] = useState<string | null>(null)
  return (
    <span className="fa-foto">
      <Ic name={discOfPlace(place)} size={44} />
      {url && bad !== url ? <img src={url} alt="" decoding="async" referrerPolicy="no-referrer" onError={() => setBad(url)} /> : null}
    </span>
  )
}

function CreditoFoto({ trip, place }: { trip: Trip; place: Place }) {
  const photo = usePlacePhoto(place, isJapanTrip(trip) ? ['ja'] : [])
  if (photo.status !== 'ready') return null
  return (
    <p className="fa-c" style={{ marginTop: 12 }}>
      Foto:{' '}
      <a href={photo.photo.page} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
        Wikimedia Commons
      </a>{' '}
      (da «{photo.photo.title}»)
    </p>
  )
}

function Mappa({ setVista }: { setVista: (v: Vista) => void }) {
  const trip = useTrip()
  const places = useMemo(() => conStato(trip), [trip])
  const [filters, setFilters] = usePlaceFilters('mappa', trip.id)
  const [filtriOpen, setFiltriOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [text, setText] = useState('')
  const [View, setView] = useState<MapViewComponent | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cardOpen, setCardOpen] = useState(false)
  const [clusterIds, setClusterIds] = useState<string[] | null>(null)
  const [noPos, setNoPos] = useState<{ ids: string[]; i: number } | null>(null)
  const [noPosDismissed, setNoPosDismissed] = useState('')
  const api = useRef<MapApi | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(0)
  const az = useAzioniLuogo(trip)

  // MapLibre si scarica solo quando si apre la Mappa
  useEffect(() => {
    let active = true
    import('../ui/MapView').then(
      (m) => active && setView(() => m.MapView),
      () => active && setLoadError(true),
    )
    return () => {
      active = false
    }
  }, [])

  // la mappa riempie lo spazio tra la barra in alto e le schede (anche con il banner della demo sopra)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.fa-mapmode')
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    el.style.height = top > 0 ? `calc(100dvh - ${Math.round(top)}px)` : ''
  }, [])

  const visible = filterPlaces(places, filters)
  const withPos = visible.filter((p) => p.lat != null && p.lng != null)
  const withoutPos = visible.filter((p) => p.lat == null || p.lng == null)
  const filterKey = JSON.stringify(filters)
  const original = (id: string) => trip.places.find((x) => x.id === id)

  const pins: MapPin[] = useMemo(
    () => withPos.map((p) => ({ id: p.id, lat: p.lat as number, lng: p.lng as number, name: p.name, color: '', symbol: `${discOfPlace(p)}-w` })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [withPos.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.category}`).join('|')],
  )

  // card «senza posizione» con i filtri attivi: compare da sola se i filtri ne trovano
  const autoNoPos = countActive(filters) > 0 && withoutPos.length > 0 && noPosDismissed !== filterKey && !selectedId && !clusterIds ? { ids: withoutPos.map((p) => p.id), i: 0 } : null
  const nopos = noPos ?? autoNoPos
  const selected = selectedId ? original(selectedId) : undefined

  const showCard = Boolean(selected || clusterIds || nopos)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return setCardH(0)
    const ro = new ResizeObserver(() => setCardH(el.getBoundingClientRect().height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [showCard, selectedId, clusterIds, nopos?.ids.join(',')])

  function select(id: string | null) {
    setSelectedId(id)
    setCardOpen(false)
    setClusterIds(null)
    setNoPos(null)
    if (id === null && autoNoPos) setNoPosDismissed(filterKey)
  }
  function pickFromSearch(p: Place) {
    setSearchOpen(false)
    setText('')
    if (p.lat != null && p.lng != null) {
      select(p.id)
      api.current?.flyTo(p.id)
    } else {
      setSelectedId(null)
      setClusterIds(null)
      setNoPos({ ids: [p.id], i: 0 })
    }
  }

  const q = text.trim().toLowerCase()
  const results = searchOpen && q ? visible.filter((p) => `${p.name} ${p.nameLocal ?? ''} ${p.city} ${p.category}`.toLowerCase().includes(q)).slice(0, 6) : []
  const np = nopos ? original(nopos.ids[Math.min(nopos.i, nopos.ids.length - 1)]) : undefined
  const fabHidden = (cardOpen && Boolean(selected)) || trip.places.length === 0

  return (
    <Schermata
      bare
      className="fa-mapmode"
      bar={<BarraGrande title="Luoghi" sub={sottotitolo(trip.places)} actions={<PulsanteIcona icon="search" label="Cerca un luogo" pressed={searchOpen} onPress={() => (setSearchOpen(!searchOpen), setText(''))} />} />}
      overlay={
        <>
          {fabHidden ? null : (
            <button type="button" className="fa-fab" aria-label="Aggiungi un luogo" onClick={az.create} style={showCard ? { bottom: `calc(64px + env(safe-area-inset-bottom, 0px) + ${Math.round(cardH) + 24}px)` } : undefined}>
              <Sv name="plus" size={24} />
              Luogo
            </button>
          )}
          {filtriOpen ? <FiltriSheet trip={trip} places={places} open filters={filters} onApply={(f) => (setFilters(f), select(null), setNoPosDismissed(''))} onClose={() => setFiltriOpen(false)} /> : null}
          {az.nodes}
        </>
      }
    >
      <div className="fa-maptop">
        {searchOpen ? (
          <div style={{ position: 'relative', display: 'grid', gap: 8 }}>
            <CampoCerca value={text} onChange={setText} />
            {results.length > 0 ? (
              <ul className="fa-list fa-mapres" aria-label="Luoghi trovati">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="fa-row" onClick={() => pickFromSearch(p)}>
                      <Ic name={discOfPlace(p)} size={44} />
                      <span style={{ minWidth: 0 }}>
                        <span className="t" style={{ display: 'block' }}>
                          {p.name}
                        </span>
                        <span className="s" style={{ display: 'block' }}>
                          {[p.city, p.lat == null ? 'Senza posizione' : STATO_LUOGO[p.status].label].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="end" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : q ? (
              <span className="fa-help">Nessun luogo con questo nome.</span>
            ) : null}
          </div>
        ) : null}
        <Segmenti
          label="Vista"
          value="mappa"
          options={[
            { value: 'elenco', label: 'Elenco' },
            { value: 'mappa', label: 'Mappa' },
          ]}
          onChange={(v) => setVista(v as Vista)}
        />
        {trip.places.length > 0 ? <RigaFiltri filters={filters} onChange={(f) => (setFilters(f), select(null), setNoPosDismissed(''))} onOpen={() => setFiltriOpen(true)} /> : null}
      </div>
      <div className="fa-map">
        {View ? (
          <View pins={pins} center={trip.center} selectedId={selectedId} onSelect={select} bare cluster onCluster={(ids) => (setSelectedId(null), setNoPos(null), setClusterIds(ids))} apiRef={api} />
        ) : (
          <p className="fa-m fa-mapmsg" role="status">
            {loadError ? 'Non riesco a caricare la mappa: serve la connessione la prima volta.' : 'Carico la mappa…'}
          </p>
        )}
        <div className="fa-mapctl">
          <button type="button" className="fa-ib" aria-label="La mia posizione" onClick={() => api.current?.locate()}>
            <Sv name="pin" size={22} />
          </button>
        </div>
        {showCard ? (
          <div className="fa-mapcard" ref={cardRef}>
            {selected ? (
              <div className="k-Luoghi">
                <div className="list">
                  <LuogoCard
                    trip={trip}
                    place={selected}
                    open={cardOpen}
                    onToggle={() => setCardOpen(!cardOpen)}
                    onAddToDay={(dayId) => az.addToDay(selected, dayId)}
                    onChangeDay={() => az.changeDay(selected)}
                    onEdit={() => az.edit(selected)}
                    onDelete={() => void az.remove([selected]).then((ok) => ok && select(null))}
                    lead={<FotoLuogo key={selected.id} trip={trip} place={selected} />}
                    foot={<CreditoFoto trip={trip} place={selected} />}
                  />
                </div>
              </div>
            ) : clusterIds ? (
              <div className="fa-card xl" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="fa-sech" style={{ padding: '12px 16px 4px' }}>
                  <h2 className="fa-h3">{n(clusterIds.length, 'luogo qui', 'luoghi qui')}</h2>
                  <button type="button" className="fa-lnk" onClick={() => (api.current?.zoomTo(clusterIds), setClusterIds(null))}>
                    Ingrandisci
                  </button>
                </div>
                {clusterIds.map((id) => {
                  const p = places.find((x) => x.id === id)
                  if (!p) return null
                  return (
                    <div key={id} className="fa-xr">
                      <button type="button" className="fa-row" aria-expanded={false} onClick={() => (setClusterIds(null), setSelectedId(id), setCardOpen(true))}>
                        <Ic name={discOfPlace(p)} size={44} />
                        <span style={{ minWidth: 0 }}>
                          <span className="t" style={{ display: 'block' }}>
                            {p.name}
                          </span>
                          <span className="s" style={{ display: 'block' }}>
                            {[p.city, STATO_LUOGO[p.status].label].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className="end">
                          <Sv name="chev" size={20} />
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : np && nopos ? (
              <div className="fa-card xl pad" style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
                  <Ic name="i-nav-no-pin" size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fa-b">{np.name}</div>
                    <div className="fa-m">Non ha una posizione sulla mappa</div>
                  </div>
                  {nopos.ids.length > 1 ? (
                    <span className="fa-npnav">
                      <button type="button" className="fa-ib" aria-label="Luogo precedente" disabled={nopos.i === 0} onClick={() => setNoPos({ ...nopos, i: nopos.i - 1 })}>
                        <Sv name="back" size={20} />
                      </button>
                      <span className="fa-c">
                        {nopos.i + 1} di {nopos.ids.length}
                      </span>
                      <button type="button" className="fa-ib" aria-label="Luogo seguente" disabled={nopos.i >= nopos.ids.length - 1} onClick={() => setNoPos({ ...nopos, i: nopos.i + 1 })}>
                        <Sv name="chevr" size={20} />
                      </button>
                    </span>
                  ) : null}
                </div>
                <p className="fa-m">Aggiungi l’indirizzo e lo vedi qui, con la strada per arrivarci.</p>
                <button type="button" className="fa-btn out" style={{ height: 44, fontSize: 14 }} onClick={() => az.edit(np, true)}>
                  Aggiungi la posizione
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {trip.places.length === 0 ? (
          <div className="fa-mapcard">
            <div className="fa-card xl pad" style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
              <h2 className="fa-h3">Nessun luogo salvato</h2>
              <p className="fa-m">Salva qui ristoranti, templi e viste da non perdere. Poi li metti nei giorni che vuoi.</p>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="fa-mapcard">
            {filters.statuses.length === 1 && countActive(filters) === 1 ? (
              <VuotoFiltro title={VUOTO_STATO[filters.statuses[0]].title} text={VUOTO_STATO[filters.statuses[0]].text} action="Mostra tutti i luoghi" onAction={() => setFilters(EMPTY_FILTERS)} />
            ) : (
              <VuotoFiltro title="Nessun luogo con questi filtri" text="Prova a togliere qualche filtro." action="Mostra tutti i luoghi" onAction={() => setFilters(EMPTY_FILTERS)} />
            )}
          </div>
        ) : null}
      </div>
    </Schermata>
  )
}
