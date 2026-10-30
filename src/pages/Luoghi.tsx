import '../fw-luoghi.css'
import { useMemo, useRef, useState } from 'react'
import { formatDuration } from '../lib/duration'
import { mapsLinkFor } from '../lib/mapsUrl'
import { countActive, filterPlaces, toggleValue } from '../lib/placeFilter'
import { DEFAULT_VIEW, GROUP_LABEL, SORT_LABEL, isDefaultView, viewPlaces } from '../lib/placeView'
import { minutesOfDay } from '../lib/sun'
import { nextItem, tripToday } from '../lib/today'
import { usePlaceFilters } from '../state/placeFilters'
import { usePlaceView } from '../state/placeView'
import { useTrip, useTrips } from '../state/trip'
import type { Place } from '../types'
import { ART } from '../ui/art'
import { CatIc } from '../ui/CatIc'
import { FilterSheet } from '../ui/FilterSheet'
import { FindPositions } from '../ui/FindPositions'
import { CheckG, CloseG, ClockG, FilterG, MinusG, PlusG, SearchG, TrashG } from '../ui/glyphs'
import { MapsPill } from '../ui/MapsPill'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { PlaceSheet, type PlaceSheetState } from '../ui/PlaceSheet'
import { useDeleter } from '../ui/useDeleter'
import { useHideNav } from '../ui/useHideNav'

/** Stato del luogo come nel mock: Fatto, Ora, Giorno N, Idea, Saltato. */
function StatusSp({ place, dayNo, now }: { place: Place; dayNo: number | undefined; now: boolean }) {
  if (place.status === 'done')
    return (
      <span className="sp vi">
        <CheckG size={14} sw={3} />
        Fatto
      </span>
    )
  if (place.status === 'skipped')
    return (
      <span className="sp bad">
        <CloseG size={14} sw={2.6} />
        Saltato
      </span>
    )
  if (now)
    return (
      <span className="sp now">
        <ClockG size={14} sw={2.4} />
        Ora
      </span>
    )
  const text = dayNo != null ? `Giorno ${dayNo}` : place.status === 'planned' ? 'Pianificato' : 'Idea'
  return (
    <span className="sp idle">
      <MinusG size={14} sw={2.6} />
      {text}
    </span>
  )
}

export function Luoghi() {
  const trip = useTrip()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
  const [filters, setFilters] = usePlaceFilters('luoghi', trip.id)
  const [view, setView] = usePlaceView(trip.id)
  const [text, setText] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sheet, setSheet] = useState<PlaceSheetState>(null)
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)
  useHideNav(selecting)

  const visible = filterPlaces(trip.places, filters, text)
  const dayIndexOf = (placeId: string) => {
    const i = trip.days.findIndex((d) => d.items.some((it) => it.placeId === placeId))
    return i < 0 ? undefined : i
  }
  const groups = viewPlaces(visible, view, { dayIndex: dayIndexOf, categoryOrder: trip.categories.map((c) => c.label) })

  // il luogo della tappa in corso adesso (stato «Ora»)
  const nowPlaceId = useMemo(() => {
    const now = new Date()
    const day = trip.days.find((d) => d.date === tripToday(trip, now))
    const cur = day ? nextItem(day, minutesOfDay(now, trip.timezone)) : null
    return cur?.status === 'now' ? cur.item.placeId : undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.days, trip.timezone])

  // si agisce solo sui luoghi che si vedono nell'elenco (con filtri e ricerca applicati)
  const chosen = visible.filter((p) => sel.has(p.id))
  const allSelected = visible.length > 0 && chosen.length === visible.length

  function stopSelecting() {
    setSelecting(false)
    setSel(new Set())
  }
  function toggleSel(id: string) {
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  async function deleteChosen() {
    const list = chosen
    if (list.length === 0) return
    const used = list.reduce((n, p) => n + trip.days.reduce((m, d) => m + d.items.filter((i) => i.placeId === p.id).length, 0), 0)
    const ok = await del({
      title: list.length === 1 ? `Eliminare «${list[0].name}»?` : `Eliminare ${list.length} luoghi?`,
      text: used > 0 ? `Restano in ${used} ${used === 1 ? 'tappa' : 'tappe'} dei giorni, ma senza più il luogo collegato. Puoi annullare subito dopo.` : 'Puoi annullare subito dopo.',
      done: list.length === 1 ? 'Luogo eliminato' : `${list.length} luoghi eliminati`,
      confirmLabel: list.length === 1 ? 'Elimina' : `Elimina ${list.length} luoghi`,
      run: () => t.setPlacesDeleted(list.map((p) => p.id), true), // una sola richiesta per tutti
      undo: () => t.setPlacesDeleted(list.map((p) => p.id), false),
    })
    if (ok) stopSelecting()
  }

  // chip delle città (con il numero di luoghi) e delle categorie
  const cities = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of trip.places) if (p.city) m.set(p.city, (m.get(p.city) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))
  }, [trip.places])
  const cats = useMemo(() => {
    const used = new Set(trip.places.map((p) => p.category))
    const labels = trip.categories.map((c) => c.label).filter((l) => used.has(l))
    for (const u of used) if (u && !labels.includes(u)) labels.push(u)
    return labels
  }, [trip.places, trip.categories])
  const pickOne = (list: string[], v: string) => (list.length === 1 && list[0] === v ? [] : [v])

  const activeFilters = countActive(filters)
  const oneCity = filters.cities.length === 1 ? filters.cities[0] : null
  const subtitle = `${visible.length} ${visible.length === 1 ? 'luogo' : 'luoghi'}${oneCity ? ` a ${oneCity}` : ''}`

  function toggleSearch() {
    const next = !searchOpen
    setSearchOpen(next)
    if (next) setTimeout(() => searchRef.current?.focus(), 0)
    else setText('')
  }

  const header = selecting ? (
    <PageHeader
      title={chosen.length === 0 ? 'Tocca i luoghi' : chosen.length === 1 ? '1 selezionato' : `${chosen.length} selezionati`}
      subtitle="tocca i luoghi per sceglierli"
      actions={
        <button type="button" className="btn soft sm" onClick={stopSelecting}>
          Annulla
        </button>
      }
    />
  ) : (
    <PageHeader
      title="Luoghi"
      subtitle={subtitle}
      actions={
        <>
          <button type="button" className="rbtn" aria-label="Cerca un luogo" aria-pressed={searchOpen} onClick={toggleSearch}>
            <SearchG />
          </button>
          <button type="button" className={`rbtn${activeFilters > 0 ? ' pri' : ''}`} aria-label={activeFilters > 0 ? `Filtra, ${activeFilters} attivi` : 'Filtra'} onClick={() => setFilterOpen(true)}>
            <FilterG />
          </button>
          {visible.length > 0 && (
            <button type="button" className="rbtn" aria-label="Seleziona luoghi" onClick={() => setSelecting(true)}>
              <CheckG />
            </button>
          )}
        </>
      }
    />
  )

  return (
    <main className="screen">
      {header}

      {!selecting && searchOpen && trip.places.length > 0 && (
        <label className="fld srch">
          <SearchG />
          <input ref={searchRef} type="search" value={text} placeholder="Cerca un luogo" aria-label="Cerca nei tuoi luoghi" onChange={(e) => setText(e.currentTarget.value)} />
        </label>
      )}

      {!selecting && <FindPositions />}

      {trip.places.length > 0 && (
        <>
          {cities.length > 1 && (
            <div className="chips scroll" role="group" aria-label="Città">
              <button type="button" className={`chip${filters.cities.length === 0 ? ' on' : ''}`} aria-pressed={filters.cities.length === 0} onClick={() => setFilters({ ...filters, cities: [] })}>
                Tutti <span className="n">{trip.places.length}</span>
              </button>
              {cities.map(([c, n]) => (
                <button type="button" key={c} className={`chip${filters.cities.includes(c) ? ' on' : ''}`} aria-pressed={filters.cities.includes(c)} onClick={() => setFilters({ ...filters, cities: pickOne(filters.cities, c) })}>
                  {c} <span className="n">{n}</span>
                </button>
              ))}
            </div>
          )}
          {cats.length > 0 && (
            <div className="chips scroll" role="group" aria-label="Categorie">
              <button type="button" className={`chip${filters.categories.length === 0 ? ' on' : ''}`} aria-pressed={filters.categories.length === 0} onClick={() => setFilters({ ...filters, categories: [] })}>
                Tutte
              </button>
              {cats.map((c) => (
                <button
                  type="button"
                  key={c || 'none'}
                  className={`chip${filters.categories.includes(c) ? ' on' : ''}`}
                  aria-pressed={filters.categories.includes(c)}
                  onClick={() => setFilters({ ...filters, categories: pickOne(filters.categories, c) })}
                >
                  {c || 'Senza categoria'}
                </button>
              ))}
            </div>
          )}
          {(filters.statuses.length > 0 || !isDefaultView(view)) && (
            <div className="chips scroll" aria-label="Filtri attivi">
              {filters.statuses.map((s) => (
                <button type="button" key={s} className="chip on" aria-label={`Togli filtro stato ${s}`} onClick={() => setFilters({ ...filters, statuses: toggleValue(filters.statuses, s) })}>
                  {{ idea: 'Idea', planned: 'Pianificato', done: 'Fatto', skipped: 'Saltato' }[s]}
                  <CloseG size={14} sw={2.6} />
                </button>
              ))}
              {view.groupBy !== DEFAULT_VIEW.groupBy && (
                <button type="button" className="chip on" aria-label="Togli il raggruppamento" onClick={() => setView({ ...view, groupBy: DEFAULT_VIEW.groupBy })}>
                  Raggruppa: {GROUP_LABEL[view.groupBy]}
                  <CloseG size={14} sw={2.6} />
                </button>
              )}
              {view.sortBy !== DEFAULT_VIEW.sortBy && (
                <button type="button" className="chip on" aria-label="Togli l'ordinamento" onClick={() => setView({ ...view, sortBy: DEFAULT_VIEW.sortBy })}>
                  Ordina: {SORT_LABEL[view.sortBy]}
                  <CloseG size={14} sw={2.6} />
                </button>
              )}
            </div>
          )}
        </>
      )}

      {trip.places.length === 0 && (
        <EmptyState title="Nessun luogo ancora" text="Aggiungi i posti che vuoi visitare: cerca per nome oppure incolla un link di Google Maps." art={ART.vuotoLuoghi} />
      )}
      {trip.places.length > 0 && visible.length === 0 && <EmptyState title="Nessun risultato" text="Prova a togliere qualche filtro o a cambiare la ricerca." art={ART.vuotoLuoghi} />}

      {selecting && visible.length > 0 && (
        <div className="rows">
          <button
            type="button"
            className="selall"
            role="checkbox"
            aria-checked={allSelected ? true : chosen.length > 0 ? 'mixed' : false}
            aria-label={allSelected ? `Deseleziona tutti i ${visible.length} luoghi` : `Seleziona tutti i ${visible.length} luoghi`}
            onClick={() => setSel(allSelected ? new Set() : new Set(visible.map((p) => p.id)))}
          >
            <span className={`cb${chosen.length > 0 ? ' on' : ''}`}>{allSelected ? <CheckG size={16} sw={3} /> : chosen.length > 0 ? <MinusG size={16} sw={3} /> : null}</span>
            <span className="grow">{allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}</span>
            <span className="b-bold num">
              {chosen.length} su {visible.length}
            </span>
          </button>
        </div>
      )}

      {groups.length > 0 && (
        <div className="lst">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.title || 'Luoghi'}>
              {g.title && (
                <div className="sec-t">
                  <h2 className="h-md">{g.title}</h2>
                  <span className="b-bold num">{g.places.length}</span>
                </div>
              )}
              <div className="rows">
                {g.places.map((p) => {
                  const picked = selecting && sel.has(p.id)
                  const di = dayIndexOf(p.id)
                  const meta = [p.category, p.visitMinutes ? formatDuration(p.visitMinutes) : ''].filter(Boolean).join(' · ') || p.city
                  const open = () => (selecting ? toggleSel(p.id) : setSheet({ kind: 'detail', placeId: p.id }))
                  return (
                    <div className={`prow${picked ? ' cur' : ''}`} key={p.id}>
                      {selecting ? (
                        <button type="button" className="hit" role="checkbox" aria-checked={picked} aria-label={`Seleziona: ${p.name}`} onClick={() => toggleSel(p.id)}>
                          <span className={`cb${picked ? ' on' : ''}`}>{picked && <CheckG size={16} sw={3} />}</span>
                        </button>
                      ) : (
                        <CatIc category={p.category} />
                      )}
                      <button type="button" className="grow" onClick={open} aria-label={selecting ? `Seleziona: ${p.name}` : `Apri ${p.name}`}>
                        <span className="pt2">{p.name}</span>
                        <span className="pm">{meta}</span>
                        <span className="pills">
                          <StatusSp place={p} dayNo={di != null ? di + 1 : undefined} now={nowPlaceId === p.id} />
                          {(p.lat == null || p.lng == null) && <span className="sp warn">Non sulla mappa</span>}
                        </span>
                      </button>
                      {!selecting && <MapsPill kind="btn" href={mapsLinkFor(p)} label={p.name} />}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {!selecting && (
        <div className="cta">
          <button type="button" className="btn block" onClick={() => setSheet({ kind: 'new' })}>
            <PlusG />
            Aggiungi luogo
          </button>
        </div>
      )}
      {delDialog}

      {selecting && (
        <div className="selbar">
          <button type="button" className="btn del block" disabled={chosen.length === 0} onClick={() => void deleteChosen()}>
            <TrashG />
            {chosen.length === 0 ? 'Elimina' : chosen.length === 1 ? 'Elimina 1 luogo' : `Elimina ${chosen.length} luoghi`}
          </button>
        </div>
      )}

      <FilterSheet trip={trip} open={filterOpen} filters={filters} onChange={setFilters} onClose={() => setFilterOpen(false)} view={view} onViewChange={setView} />
      <PlaceSheet trip={trip} state={sheet} onChange={setSheet} />
    </main>
  )
}
