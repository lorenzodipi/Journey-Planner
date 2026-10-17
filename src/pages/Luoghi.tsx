import { useState } from 'preact/hooks'
import { countActive, filterPlaces } from '../lib/placeFilter'
import { usePlaceFilters } from '../state/placeFilters'
import { useTrip } from '../state/trip'
import { FilterBar } from '../ui/FilterBar'
import { FilterSheet } from '../ui/FilterSheet'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { PlaceSheet, type PlaceSheetState } from '../ui/PlaceSheet'
import { STATUS_LABEL, STATUS_STYLE, categoryColor } from '../ui/placeMeta'

export function Luoghi() {
  const trip = useTrip()
  const [filters, setFilters] = usePlaceFilters(trip.id)
  const [text, setText] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sheet, setSheet] = useState<PlaceSheetState>(null)

  const visible = filterPlaces(trip.places, filters, text)
  const narrowed = Boolean(text.trim()) || countActive(filters) > 0

  return (
    <>
      <PageHeader title="Luoghi" subtitle={`${trip.places.length} nella tua wishlist`} />

      {trip.places.length > 0 && (
        <div class="space-y-2 px-4 pb-3">
          <input
            type="search"
            value={text}
            placeholder="Cerca per nome, città o categoria"
            aria-label="Cerca nei tuoi luoghi"
            onInput={(e) => setText(e.currentTarget.value)}
            class="min-h-12 w-full rounded-2xl border border-line bg-surface px-4"
          />
          <FilterBar filters={filters} onChange={setFilters} onOpen={() => setFilterOpen(true)} />
        </div>
      )}

      <div class="px-4 pb-20">
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
          <p class="mb-1 px-1 text-xs text-muted">
            {visible.length} di {trip.places.length}
          </p>
        )}
        {visible.length > 0 && (
          <ul class="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
            {visible.map((p) => (
              <li>
                <button
                  type="button"
                  onClick={() => setSheet({ kind: 'detail', placeId: p.id })}
                  class="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span aria-hidden="true" class="h-3 w-3 shrink-0 rounded-full" style={{ background: categoryColor(trip, p) }} />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-medium">{p.name}</span>
                    <span class="block truncate text-xs text-muted">
                      {[p.category, p.city].filter(Boolean).join(' · ')}
                      {p.lat == null ? ' · senza posizione' : ''}
                    </span>
                  </span>
                  {p.status !== 'idea' && (
                    <span class={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setSheet({ kind: 'new' })}
        aria-label="Aggiungi luogo"
        class="fixed right-4 z-20 flex min-h-14 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-ink shadow-card"
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
      >
        <span aria-hidden="true" class="text-2xl leading-none">+</span>
        Luogo
      </button>

      <FilterSheet trip={trip} open={filterOpen} filters={filters} onChange={setFilters} onClose={() => setFilterOpen(false)} />
      <PlaceSheet trip={trip} state={sheet} onChange={setSheet} />
    </>
  )
}
