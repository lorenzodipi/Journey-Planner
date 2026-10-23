import { useEffect, useMemo, useState } from 'preact/hooks'
import { mapsLinkFor } from '../lib/mapsUrl'
import { filterPlaces } from '../lib/placeFilter'
import { formatShort } from '../lib/dates'
import { placeDayLine } from '../lib/placeDays'
import { isJapanTrip } from '../lib/tripLocale'
import { usePlaceFilters } from '../state/placeFilters'
import { useTrip } from '../state/trip'
import { CalendarIcon, FilterIcon, PinIcon, SearchIcon } from '../ui/Icons'
import { CategoryTag } from '../ui/PlaceDisc'
import { PlacePhotoStub } from '../ui/PlacePhotoStub'
import { StatusPill } from '../ui/StatusPill'
import { Ticket } from '../ui/Ticket'
import { FilterSheet } from '../ui/FilterSheet'
import { categoryIcon } from '../lib/categoryIcon'
import type { MapPin } from '../ui/MapView'
import { PlaceSheet, type PlaceSheetState } from '../ui/PlaceSheet'
import { NO_CATEGORY_COLOR, PALETTE, categoryColor, colorForCategory } from '../ui/placeMeta'

type Mode = 'category' | 'day'
const UNPLANNED = '#9fb0c8'

type MapViewComponent = typeof import('../ui/MapView').MapView

export function Mappa() {
  const trip = useTrip()
  const [filters, setFilters] = usePlaceFilters('mappa', trip.id)
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
  const [text, setText] = useState('')
  const visible = useMemo(() => filterPlaces(withCoords, filters, text), [trip.places, filters, text])

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

  const dayLine = selected ? placeDayLine(selected.id, trip.days) : null
  const selectedColor = selected ? categoryColor(trip, selected) : NO_CATEGORY_COLOR
  // pulsanti rapidi per categoria: una alla volta, "Tutti" le toglie
  const cats = trip.categories.filter((c) => withCoords.some((p) => p.categoryId === c.id))
  const onlyCat = filters.categories.length === 1 ? filters.categories[0] : null

  return (
    <div class="map-full fixed inset-0 z-0 bg-bg">
      {View ? (
        <View pins={pins} center={trip.center} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
      ) : (
        <p class="grid h-full place-items-center px-6 text-center text-sm text-muted" role="status">
          {loadError ? 'Non riesco a caricare la mappa: serve la connessione la prima volta.' : 'Carico la mappa…'}
        </p>
      )}

      {/* ricerca e categorie sopra la mappa */}
      <div class="pointer-events-none absolute inset-x-3.5 z-10 space-y-2.5" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
        <label class="pointer-events-auto relative block">
          <SearchIcon size={20} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={text}
            placeholder="Cerca sulla mappa"
            aria-label="Cerca sulla mappa"
            onInput={(e) => setText(e.currentTarget.value)}
            class="min-h-[52px] w-full rounded-2xl border-2 border-line bg-bg pl-11 pr-4 text-base shadow-[0_6px_16px_rgb(0_0_0/0.35)]"
          />
        </label>
        <div class="no-scrollbar pointer-events-auto flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            aria-pressed={filters.categories.length === 0}
            onClick={() => setFilters({ ...filters, categories: [] })}
            class={`min-h-11 shrink-0 rounded-full border-2 px-4 text-sm font-extrabold ${filters.categories.length === 0 ? 'border-accent bg-accent text-white' : 'border-line bg-bg text-ink'}`}
          >
            Tutti
          </button>
          {cats.map((c) => (
            <button
              type="button"
              key={c.id}
              aria-pressed={onlyCat === c.label}
              onClick={() => setFilters({ ...filters, categories: onlyCat === c.label ? [] : [c.label] })}
              class={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-3.5 text-sm font-extrabold ${onlyCat === c.label ? 'border-accent bg-accent text-white' : 'border-line bg-bg text-ink'}`}
            >
              <span aria-hidden="true" class="size-2.5 rounded-full" style={{ background: colorForCategory(trip, c.id) }} />
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-label="Filtri e colori"
            class="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border-2 border-line bg-bg text-ink"
          >
            <FilterIcon size={20} />
          </button>
        </div>
      </div>

      {withCoords.length === 0 && (
        <div class="pointer-events-none absolute inset-x-3.5 z-10" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
          <div class="rounded-2xl border-2 border-line bg-bg px-4 py-3 shadow-[0_6px_16px_rgb(0_0_0/0.35)]">
            <p class="text-base font-extrabold">Nessun luogo con posizione</p>
            <p class="mt-0.5 text-sm text-muted">Aggiungi luoghi dalla scheda Luoghi: cercandoli per nome o incollando un link di Google Maps, compariranno qui.</p>
          </div>
        </div>
      )}

      {visible.length === 0 && withCoords.length > 0 && (
        <p class="pointer-events-none absolute inset-x-6 z-10 rounded-2xl border-2 border-line bg-bg px-4 py-3 text-center text-sm text-muted" style={{ top: 'calc(8.75rem + env(safe-area-inset-top))' }}>
          Nessun luogo con questi filtri.
        </p>
      )}

      {selected && (
        <div class="absolute inset-x-3.5 z-10" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
          <Ticket
            tone="accent"
            stubWidth={76}
            stubFill
            stub={<PlacePhotoStub key={selected.id} place={selected} color={selectedColor} langs={isJapanTrip(trip) ? ['ja'] : []} />}
          >
            <div class="min-w-0 flex-1 pr-2">
              <p class="line-clamp-2 text-xl font-extrabold leading-tight">{selected.name}</p>
              {selected.city && (
                <p class="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                  <PinIcon size={12} class="shrink-0" />
                  <span class="min-w-0">{selected.city}</span>
                </p>
              )}
              {(selected.category || selected.status !== 'idea') && (
                <p class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {selected.category && <CategoryTag label={selected.category} color={selectedColor} />}
                  <StatusPill status={selected.status} />
                </p>
              )}
              {dayLine && (
                <p class="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
                  <CalendarIcon size={12} class="shrink-0" />
                  <span class="min-w-0">{dayLine}</span>
                </p>
              )}
              <div class="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSheet({ kind: 'detail', placeId: selected.id })}
                  class="min-h-11 flex-1 rounded-xl bg-accent px-3 text-sm font-extrabold text-accent-ink"
                >
                  {dayLine ? 'Dettagli' : 'Aggiungi a un giorno'}
                </button>
                <a
                  href={mapsLinkFor(selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="grid min-h-11 place-items-center rounded-xl border-2 border-line px-4 text-sm font-extrabold"
                >
                  Vai
                </a>
              </div>
            </div>
          </Ticket>
        </div>
      )}

      <FilterSheet trip={trip} open={filterOpen} filters={filters} onChange={setFilters} onClose={() => setFilterOpen(false)}>
        <fieldset>
          <legend class="mb-2 text-sm font-extrabold">Colora i pin per</legend>
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
                class={`min-h-11 rounded-full border-2 px-4 text-sm font-extrabold ${
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
          {missing > 0 && (
            <p class="mt-3 text-xs text-muted">
              {missing} {missing === 1 ? 'luogo non ha' : 'luoghi non hanno'} una posizione e non {missing === 1 ? 'compare' : 'compaiono'} sulla mappa.
            </p>
          )}
        </fieldset>
      </FilterSheet>

      <PlaceSheet trip={trip} state={sheet} onChange={setSheet} />
    </div>
  )
}
