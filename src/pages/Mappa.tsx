import { useEffect, useMemo, useState } from 'preact/hooks'
import { mapsLinkFor } from '../lib/mapsUrl'
import { filterPlaces } from '../lib/placeFilter'
import { formatShort } from '../lib/dates'
import { usePlaceFilters } from '../state/placeFilters'
import { useTrip } from '../state/trip'
import { FilterBar } from '../ui/FilterBar'
import { FilterSheet } from '../ui/FilterSheet'
import { categoryIcon } from '../lib/categoryIcon'
import type { MapPin } from '../ui/MapView'
import { EmptyState } from '../ui/PageHeader'
import { PlaceSheet, type PlaceSheetState } from '../ui/PlaceSheet'
import { NO_CATEGORY_COLOR, PALETTE, STATUS_LABEL, STATUS_STYLE, categoryColor, colorForCategory } from '../ui/placeMeta'

type Mode = 'category' | 'day'
const UNPLANNED = '#8a8f94'

type MapViewComponent = typeof import('../ui/MapView').MapView

export function Mappa() {
  const trip = useTrip()
  const [filters, setFilters] = usePlaceFilters(trip.id)
  const [View, setView] = useState<MapViewComponent | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [mode, setMode] = useState<Mode>('category')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<PlaceSheetState>(null)

  // Leaflet si scarica solo quando si apre questa scheda
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

  const withCoords = trip.places.filter((p) => p.lat != null && p.lng != null)
  const missing = trip.places.length - withCoords.length
  const visible = useMemo(() => filterPlaces(withCoords, filters), [trip.places, filters])

  // giorno in cui compare per primo ogni luogo (per il colore "per giorno")
  const dayOf = useMemo(() => {
    const map = new Map<string, number>()
    trip.days.forEach((d, i) => d.items.forEach((it) => it.placeId && !map.has(it.placeId) && map.set(it.placeId, i)))
    return map
  }, [trip.days])

  const colorOf = (placeId: string, categoryColorValue: string) => {
    if (mode === 'category') return categoryColorValue
    const day = dayOf.get(placeId)
    return day === undefined ? UNPLANNED : PALETTE[day % PALETTE.length]
  }

  const pins: MapPin[] = useMemo(
    () =>
      visible.map((p) => ({
        id: p.id,
        lat: p.lat as number,
        lng: p.lng as number,
        name: p.name,
        color: colorOf(p.id, categoryColor(trip, p)),
        icon: categoryIcon(p.category),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, trip.categories, mode, dayOf],
  )

  const selected = trip.places.find((p) => p.id === selectedId && visible.some((v) => v.id === p.id))

  // legenda dei colori, mostrata nel pannello dei filtri
  const legend: { label: string; color: string }[] =
    mode === 'category'
      ? [
          ...trip.categories
            .filter((c) => visible.some((p) => p.categoryId === c.id))
            .map((c) => ({ label: c.label, color: colorForCategory(trip, c.id) })),
          ...(visible.some((p) => !p.categoryId) ? [{ label: 'Senza categoria', color: NO_CATEGORY_COLOR }] : []),
        ]
      : [
          ...trip.days
            .map((d, i) => ({ d, i }))
            .filter(({ i }) => visible.some((p) => dayOf.get(p.id) === i))
            .map(({ d, i }) => ({ label: `Giorno ${i + 1} · ${formatShort(d.date)}`, color: PALETTE[i % PALETTE.length] })),
          ...(visible.some((p) => !dayOf.has(p.id)) ? [{ label: 'Non ancora in un giorno', color: UNPLANNED }] : []),
        ]

  return (
    <div class="flex flex-col" style={{ height: 'calc(100dvh - 5.5rem - env(safe-area-inset-bottom))' }}>
      <header class="shrink-0 px-4 pb-2" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
        <div class="mb-2 flex items-baseline justify-between gap-3 px-1">
          <h1 class="font-display text-2xl font-semibold leading-tight">Mappa</h1>
          <p class="truncate text-xs text-muted">
            {visible.length} {visible.length === 1 ? 'luogo' : 'luoghi'}
            {missing > 0 ? ` · ${missing} senza posizione` : ''}
          </p>
        </div>
        <FilterBar filters={filters} onChange={setFilters} onOpen={() => setFilterOpen(true)} label="Filtri e colori" />
      </header>

      <div class="relative mx-3 mb-2 min-h-0 flex-1 overflow-hidden rounded-card bg-surface shadow-card">
        {withCoords.length === 0 ? (
          <div class="grid h-full place-items-center px-4">
            <EmptyState
              title="Nessun luogo con posizione"
              text="Aggiungi luoghi dalla scheda Luoghi: cercandoli per nome o incollando un link di Google Maps, compariranno qui."
            />
          </div>
        ) : View ? (
          <View pins={pins} center={trip.center} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        ) : (
          <p class="grid h-full place-items-center px-6 text-center text-sm text-muted" role="status">
            {loadError ? 'Non riesco a caricare la mappa: serve la connessione la prima volta.' : 'Carico la mappa…'}
          </p>
        )}

        {visible.length === 0 && withCoords.length > 0 && (
          <p class="pointer-events-none absolute inset-x-6 top-4 z-[1000] rounded-2xl bg-surface/95 px-4 py-3 text-center text-sm text-muted shadow-card">
            Nessun luogo con questi filtri.
          </p>
        )}

        {selected && (
          <div class="absolute inset-x-3 bottom-3 z-[1000] rounded-2xl bg-surface p-3 shadow-card">
            <div class="flex items-start gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{selected.name}</p>
                <p class="truncate text-xs text-muted">{[selected.category, selected.city].filter(Boolean).join(' · ')}</p>
              </div>
              {selected.status !== 'idea' && (
                <span class={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              )}
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSheet({ kind: 'detail', placeId: selected.id })}
                class="min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink"
              >
                Dettagli
              </button>
              <a
                href={mapsLinkFor(selected)}
                target="_blank"
                rel="noopener noreferrer"
                class="grid min-h-11 place-items-center rounded-full border border-line px-4 text-sm font-medium"
              >
                Apri in Maps
              </a>
            </div>
          </div>
        )}
      </div>

      <FilterSheet trip={trip} open={filterOpen} filters={filters} onChange={setFilters} onClose={() => setFilterOpen(false)}>
        <fieldset>
          <legend class="mb-2 text-sm font-medium">Colora i pin per</legend>
          <div class="grid grid-cols-2 gap-2">
            {(
              [
                ['category', 'Categoria'],
                ['day', 'Giorno'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                class={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                  mode === value ? 'border-accent bg-accent text-accent-ink' : 'border-line'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {legend.length > 0 && (
            <ul class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {legend.map((l) => (
                <li class="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true" class="h-3 w-3 shrink-0 rounded-full" style={{ background: l.color }} />
                  <span class="truncate">{l.label}</span>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </FilterSheet>

      <PlaceSheet trip={trip} state={sheet} onChange={setSheet} />
    </div>
  )
}
