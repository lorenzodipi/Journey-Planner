import { useState } from 'preact/hooks'
import { countActive, filterPlaces } from '../lib/placeFilter'
import { GROUP_LABEL, SORT_LABEL, DEFAULT_VIEW, isDefaultView, viewPlaces } from '../lib/placeView'
import { usePlaceFilters } from '../state/placeFilters'
import { usePlaceView } from '../state/placeView'
import { useTrip, useTrips } from '../state/trip'
import { TrashButton } from '../ui/ConfirmDialog'
import { useDeleter } from '../ui/useDeleter'
import { FilterBar } from '../ui/FilterBar'
import { FilterSheet } from '../ui/FilterSheet'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { PlaceDisc, CategoryTag } from '../ui/PlaceDisc'
import { SearchIcon } from '../ui/Icons'
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
  const counts = {
    all: trip.places.length,
    todo: trip.places.filter((p) => p.status === 'idea' || p.status === 'planned').length,
    done: trip.places.filter((p) => p.status === 'done').length,
  }

  return (
    <>
      <PageHeader title="Luoghi" jp="場所" />

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
              return (
                <li>
                  <Ticket stub={<PlaceDisc category={p.category} color={color} />} stubWidth={78}>
                    <button
                      type="button"
                      onClick={() => setSheet({ kind: 'detail', placeId: p.id })}
                      aria-label={`Apri ${p.name}`}
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
                  </Ticket>
                </li>
              )
            })}
            </ul>
          </section>
        ))}
      </div>
      {delDialog}

      <Fab label="Luogo" onClick={() => setSheet({ kind: 'new' })} />

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
