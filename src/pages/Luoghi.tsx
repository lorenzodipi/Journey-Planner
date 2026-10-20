import { useState } from 'preact/hooks'
import { isJapanTrip } from '../lib/tripLocale'
import { countActive, filterPlaces } from '../lib/placeFilter'
import { GROUP_LABEL, SORT_LABEL, DEFAULT_VIEW, isDefaultView, viewPlaces } from '../lib/placeView'
import { usePlaceFilters } from '../state/placeFilters'
import { usePlaceView } from '../state/placeView'
import { useTrip, useTrips } from '../state/trip'
import { TrashButton } from '../ui/ConfirmDialog'
import { useDeleter } from '../ui/useDeleter'
import { useHideNav } from '../ui/useHideNav'
import { FilterBar } from '../ui/FilterBar'
import { FilterSheet } from '../ui/FilterSheet'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { PlaceDisc, CategoryTag } from '../ui/PlaceDisc'
import { MinusIcon, SearchIcon, TickIcon, TrashIcon } from '../ui/Icons'
import { Fab, Ticket } from '../ui/Ticket'
import { PlaceSheet, type PlaceSheetState } from '../ui/PlaceSheet'
import { STATUS_LABEL, STATUS_STYLE, categoryColor } from '../ui/placeMeta'

export function Luoghi() {
  const trip = useTrip()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
  const [filters, setFilters] = usePlaceFilters('luoghi', trip.id)
  const [view, setView] = usePlaceView(trip.id)
  const [text, setText] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sheet, setSheet] = useState<PlaceSheetState>(null)
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  useHideNav(selecting)

  const visible = filterPlaces(trip.places, filters, text)
  const dayIndexOf = (placeId: string) => {
    const i = trip.days.findIndex((d) => d.items.some((it) => it.placeId === placeId))
    return i < 0 ? undefined : i
  }
  const groups = viewPlaces(visible, view, { dayIndex: dayIndexOf, categoryOrder: trip.categories.map((c) => c.label) })
  const narrowed = Boolean(text.trim()) || countActive(filters) > 0

  const dayOf = (placeId: string) => {
    const i = dayIndexOf(placeId)
    return i === undefined ? 'da assegnare' : `giorno ${i + 1}`
  }
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

  const counts = {
    all: trip.places.length,
    todo: trip.places.filter((p) => p.status === 'idea' || p.status === 'planned').length,
    done: trip.places.filter((p) => p.status === 'done').length,
  }

  return (
    <>
      {selecting ? (
        <header class="px-5 pb-3" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
          <div class="flex min-h-11 items-center justify-between">
            <button type="button" onClick={stopSelecting} class="inline-flex min-h-11 items-center gap-2 text-[15px] font-extrabold text-pale">
              <span aria-hidden="true">‹</span>
              Annulla
            </button>
          </div>
          <h1 class="font-display text-[28px] font-extrabold leading-tight" aria-live="polite">
            {chosen.length === 0 ? 'Tocca i luoghi' : chosen.length === 1 ? '1 selezionato' : `${chosen.length} selezionati`}
          </h1>
          <p class="mt-0.5 text-sm text-muted">tocca i luoghi per sceglierli</p>
        </header>
      ) : (
        <PageHeader
          title="Luoghi"
          jp={isJapanTrip(trip) ? '場所' : undefined}
          aside={
            visible.length > 0 ? (
              <button type="button" onClick={() => setSelecting(true)} class="min-h-11 text-sm font-extrabold text-pale">
                Seleziona
              </button>
            ) : undefined
          }
        />
      )}

      {trip.places.length > 0 && (
        <div class="space-y-3 px-5 pb-3.5">
          <label class="relative block">
            <SearchIcon size={20} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={text}
              placeholder="Cerca un luogo"
              aria-label="Cerca nei tuoi luoghi"
              onInput={(e) => setText(e.currentTarget.value)}
              class="min-h-[52px] w-full rounded-2xl border-2 border-line bg-surface pl-11 pr-4 text-base"
            />
          </label>
          <FilterBar filters={filters} onChange={setFilters} onOpen={() => setFilterOpen(true)} counts={counts} />
          {!isDefaultView(view) && (
            <div class="no-scrollbar flex gap-2 overflow-x-auto">
              {view.groupBy !== DEFAULT_VIEW.groupBy && (
                <button
                  type="button"
                  onClick={() => setView({ ...view, groupBy: DEFAULT_VIEW.groupBy })}
                  aria-label="Togli il raggruppamento"
                  class="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-line px-3 text-sm font-extrabold"
                >
                  Raggruppa: {GROUP_LABEL[view.groupBy]}
                  <span aria-hidden="true">✕</span>
                </button>
              )}
              {view.sortBy !== DEFAULT_VIEW.sortBy && (
                <button
                  type="button"
                  onClick={() => setView({ ...view, sortBy: DEFAULT_VIEW.sortBy })}
                  aria-label="Togli l'ordinamento"
                  class="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-line px-3 text-sm font-extrabold"
                >
                  Ordina: {SORT_LABEL[view.sortBy]}
                  <span aria-hidden="true">✕</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div class="px-5 pb-24">
        {trip.places.length === 0 && (
          <EmptyState
            title="Nessun luogo ancora"
            text="Tocca + per aggiungere i posti che vuoi visitare: cerca per nome oppure incolla un link di Google Maps."
          />
        )}
        {trip.places.length > 0 && visible.length === 0 && (
          <EmptyState title="Nessun risultato" text="Prova a togliere qualche filtro o a cambiare la ricerca." />
        )}
        {narrowed && visible.length > 0 && (
          <p class="mb-2 text-xs text-muted">
            {visible.length} di {trip.places.length}
          </p>
        )}
        {selecting && visible.length > 0 && (
          <button
            type="button"
            role="checkbox"
            aria-checked={allSelected ? true : chosen.length > 0 ? 'mixed' : false}
            aria-label={allSelected ? `Deseleziona tutti i ${visible.length} luoghi` : `Seleziona tutti i ${visible.length} luoghi`}
            onClick={() => setSel(allSelected ? new Set() : new Set(visible.map((p) => p.id)))}
            class="mb-4 flex min-h-14 w-full items-center gap-3.5 rounded-[14px] border-2 border-line bg-surface-2 px-4 text-left"
          >
            <span class={`grid size-7 shrink-0 place-items-center rounded-lg border-2 text-white ${chosen.length > 0 ? 'border-accent bg-accent' : 'border-line'}`}>
              {allSelected ? <TickIcon size={16} /> : chosen.length > 0 ? <MinusIcon size={16} /> : null}
            </span>
            <span class="flex-1 text-base font-extrabold">{allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}</span>
            <span class="text-sm font-extrabold text-pale">
              {chosen.length} su {visible.length}
            </span>
          </button>
        )}
        {groups.map((g) => (
          <section key={g.key} class={g.title ? 'mt-4 first:mt-0' : ''}>
            {g.title && (
              <h2 class="mb-2 flex items-baseline gap-2 px-0.5 font-display text-lg font-extrabold">
                {g.title}
                <span class="text-sm font-normal tabular-nums text-muted">{g.places.length}</span>
              </h2>
            )}
            <ul class="space-y-3">
            {g.places.map((p) => {
              const color = categoryColor(trip, p)
              const picked = selecting && sel.has(p.id)
              return (
                <li key={p.id}>
                  <Ticket
                    tone={picked ? 'accent' : 'line'}
                    stub={
                      selecting ? (
                        <button type="button" role="checkbox" aria-checked={picked} aria-label={`Seleziona: ${p.name}`} onClick={() => toggleSel(p.id)} class="grid size-11 place-items-center">
                          <span class={`grid size-7 place-items-center rounded-lg border-2 text-white ${picked ? 'border-accent bg-accent' : 'border-line'}`}>{picked && <TickIcon size={16} />}</span>
                        </button>
                      ) : (
                        <PlaceDisc category={p.category} color={color} />
                      )
                    }
                    stubWidth={78}
                  >
                    <button
                      type="button"
                      onClick={() => (selecting ? toggleSel(p.id) : setSheet({ kind: 'detail', placeId: p.id }))}
                      aria-label={selecting ? `Seleziona: ${p.name}` : `Apri ${p.name}`}
                      class="min-w-0 flex-1 py-0.5 text-left"
                    >
                      <span class="block truncate text-[17px] font-extrabold leading-tight">{p.name}</span>
                      <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {p.category && <CategoryTag label={p.category} color={color} />}
                        <span class="text-[13px] text-muted">
                          {[p.city, dayOf(p.id)].filter(Boolean).join(' · ')}
                          {p.lat == null ? ' · senza posizione' : ''}
                        </span>
                        {p.status !== 'idea' && (
                          <span class={`rounded-md border-2 px-1.5 text-xs font-extrabold leading-snug ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                        )}
                      </span>
                    </button>
                    {!selecting && (
                    <TrashButton
                      label={`Elimina ${p.name}`}
                      onClick={() => {
                        const used = trip.days.reduce((n, d) => n + d.items.filter((i) => i.placeId === p.id).length, 0)
                        void del({
                          title: `Eliminare «${p.name}»?`,
                          text: used > 0 ? `Resta in ${used} ${used === 1 ? 'tappa' : 'tappe'} dei giorni, ma senza più il luogo collegato. Puoi annullare subito dopo.` : undefined,
                          done: 'Luogo eliminato',
                          run: () => t.setPlaceDeleted(p.id, true),
                          undo: () => t.setPlaceDeleted(p.id, false),
                        })
                      }}
                    />
                    )}
                  </Ticket>
                </li>
              )
            })}
            </ul>
          </section>
        ))}
      </div>
      {delDialog}

      {selecting ? (
        <div class="fixed inset-x-5 z-30" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            disabled={chosen.length === 0}
            onClick={() => void deleteChosen()}
            class="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full border-2 border-transparent bg-danger text-base font-extrabold text-bg shadow-[0_8px_20px_rgb(0_0_0/0.45)] disabled:cursor-not-allowed disabled:border-danger disabled:bg-[#47303f] disabled:text-[#c49aa5] disabled:shadow-none"
          >
            <TrashIcon size={22} />
            {chosen.length === 0 ? 'Elimina' : chosen.length === 1 ? 'Elimina 1 luogo' : `Elimina ${chosen.length} luoghi`}
          </button>
        </div>
      ) : (
        <Fab label="Luogo" onClick={() => setSheet({ kind: 'new' })} />
      )}

      <FilterSheet
        trip={trip}
        open={filterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
        view={view}
        onViewChange={setView}
      />
      <PlaceSheet trip={trip} state={sheet} onChange={setSheet} />
    </>
  )
}
