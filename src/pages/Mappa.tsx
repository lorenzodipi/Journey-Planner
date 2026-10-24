import '../fw-luoghi.css'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { formatShort } from '../lib/dates'
import { formatDuration, itemDuration } from '../lib/duration'
import { mapsLinkFor } from '../lib/mapsUrl'
import { categoryIcon } from '../lib/categoryIcon'
import { filterPlaces } from '../lib/placeFilter'
import { isJapanTrip } from '../lib/tripLocale'
import { usePlaceFilters } from '../state/placeFilters'
import { useTrip } from '../state/trip'
import type { Place, Trip } from '../types'
import { catSymbol } from '../ui/art'
import { FilterSheet } from '../ui/FilterSheet'
import { FilterG, SearchG } from '../ui/glyphs'
import type { MapPin } from '../ui/MapView'
import { PlaceSheet, type PlaceSheetState } from '../ui/PlaceSheet'
import { NO_CATEGORY_COLOR, PALETTE, colorForCategory } from '../ui/placeMeta'
import { Ic } from '../ui/Sprite'
import { usePlacePhoto } from '../ui/usePlacePhoto'

type Mode = 'category' | 'day'
const UNPLANNED = '#9fb0c8'

type MapViewComponent = typeof import('../ui/MapView').MapView

/** «Giorno 12 · 14:30 · 1 h 30» per il primo giorno in cui il luogo è in programma. */
function dayInfo(trip: Trip, place: Place): string | null {
  for (let i = 0; i < trip.days.length; i++) {
    const it = trip.days[i].items.find((x) => x.placeId === place.id)
    if (!it) continue
    const dur = itemDuration(it, place)
    const more = trip.days.filter((d) => d.items.some((x) => x.placeId === place.id)).length - 1
    return [`Giorno ${i + 1}`, it.time, dur ? formatDuration(dur) : ''].filter(Boolean).join(' · ') + (more > 0 ? ` +${more}` : '')
  }
  return null
}

/** Miniatura del luogo: il disco della categoria e, sopra, la foto di Wikipedia se c'è. */
function Thumb({ place, langs }: { place: Place; langs: string[] }) {
  const photo = usePlacePhoto(place, langs)
  const url = photo.status === 'ready' ? photo.photo.url : null
  const [bad, setBad] = useState<string | null>(null)
  return (
    <span class="thumb" style={{ background: 'var(--tinta-azzurro)' }}>
      <Ic name={catSymbol(categoryIcon(place.category))} size={40} />
      {url && bad !== url && <img src={url} alt="" decoding="async" referrerpolicy="no-referrer" onError={() => setBad(url)} />}
    </span>
  )
}

export function Mappa() {
  const trip = useTrip()
  const [filters, setFilters] = usePlaceFilters('mappa', trip.id)
  const [View, setView] = useState<MapViewComponent | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [mode, setMode] = useState<Mode>('category')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<PlaceSheetState>(null)

  // MapLibre si scarica solo quando si apre questa scheda
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

  // giorno in cui compare per primo ogni luogo (per l'anello "per giorno")
  const dayOf = useMemo(() => {
    const map = new Map<string, number>()
    trip.days.forEach((d, i) => d.items.forEach((it) => it.placeId && !map.has(it.placeId) && map.set(it.placeId, i)))
    return map
  }, [trip.days])

  const pins: MapPin[] = useMemo(
    () =>
      visible.map((p) => {
        const icon = categoryIcon(p.category)
        const day = dayOf.get(p.id)
        return {
          id: p.id,
          lat: p.lat as number,
          lng: p.lng as number,
          name: p.name,
          color: NO_CATEGORY_COLOR,
          icon,
          symbol: catSymbol(icon),
          ring: mode === 'day' ? (day === undefined ? UNPLANNED : PALETTE[day % PALETTE.length]) : undefined,
        }
      }),
    [visible, mode, dayOf],
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

  // pulsanti rapidi per categoria: una alla volta, "Tutti" le toglie
  const cats = trip.categories.filter((c) => withCoords.some((p) => p.categoryId === c.id))
  const onlyCat = filters.categories.length === 1 ? filters.categories[0] : null
  const info = selected ? dayInfo(trip, selected) : null

  return (
    <main class="screen mapscr map-full">
      <div class="mapbg">
        {View ? (
          <View pins={pins} center={trip.center} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        ) : (
          <p class="msg" role="status">
            {loadError ? 'Non riesco a caricare la mappa: serve la connessione la prima volta.' : 'Carico la mappa…'}
          </p>
        )}
      </div>

      {/* ricerca e categorie sopra la mappa */}
      <div class="maptop">
        <label class="fld srch">
          <SearchG />
          <input type="search" value={text} placeholder="Cerca un luogo" aria-label="Cerca sulla mappa" onInput={(e) => setText(e.currentTarget.value)} />
        </label>
        <div class="chips scroll" role="group" aria-label="Categorie">
          <button type="button" class={`chip${filters.categories.length === 0 ? ' on' : ''}`} aria-pressed={filters.categories.length === 0} onClick={() => setFilters({ ...filters, categories: [] })}>
            Tutti
          </button>
          {cats.map((c) => (
            <button
              type="button"
              key={c.id}
              class={`chip${onlyCat === c.label ? ' on' : ''}`}
              aria-pressed={onlyCat === c.label}
              onClick={() => setFilters({ ...filters, categories: onlyCat === c.label ? [] : [c.label] })}
            >
              {c.label}
            </button>
          ))}
          <button type="button" class="rbtn sm" style={{ flexShrink: 0 }} onClick={() => setFilterOpen(true)} aria-label="Filtri e colori">
            <FilterG size={18} />
          </button>
        </div>
      </div>

      {withCoords.length === 0 && (
        <div class="mapnote low">
          <div class="card">
            <p class="b-bold">Nessun luogo con posizione</p>
            <p class="b-sm muted" style={{ marginTop: '2px' }}>
              Aggiungi luoghi dalla scheda Luoghi: cercandoli per nome o incollando un link di Google Maps, compariranno qui.
            </p>
          </div>
        </div>
      )}

      {visible.length === 0 && withCoords.length > 0 && (
        <div class="mapnote mid">
          <p class="card b-sm muted" style={{ textAlign: 'center', padding: '12px 16px' }}>
            Nessun luogo con questi filtri.
          </p>
        </div>
      )}

      {selected && (
        <article class="card mapcard" aria-label={selected.name}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Thumb key={selected.id} place={selected} langs={isJapanTrip(trip) ? ['ja'] : []} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p class="b-bold" style={{ fontSize: '13px', lineHeight: '18px' }}>
                {[selected.city, selected.category].filter(Boolean).join(' · ') || 'Luogo'}
              </p>
              <h2 class="h-md">{selected.name}</h2>
              {info && (
                <p class="b-sm num" style={{ fontWeight: 600 }}>
                  {info}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <a class="btn" style={{ flex: 1, padding: '0 12px', whiteSpace: 'nowrap' }} href={mapsLinkFor(selected)} target="_blank" rel="noopener noreferrer" aria-label={`Apri in Google Maps: ${selected.name}`}>
              <Ic name="i-nav-pin-out" size={28} />
              Apri in Google Maps
            </a>
            <button type="button" class="btn soft" style={{ flexShrink: 0, padding: '0 14px' }} aria-label={`Dettagli di ${selected.name}`} onClick={() => setSheet({ kind: 'detail', placeId: selected.id })}>
              Dettagli
            </button>
          </div>
        </article>
      )}

      <FilterSheet trip={trip} open={filterOpen} filters={filters} onChange={setFilters} onClose={() => setFilterOpen(false)}>
        <fieldset>
          <legend class="mb-2 text-sm font-extrabold">Anello dei pin per</legend>
          <div class="grid grid-cols-2 gap-2">
            {(
              [
                ['category', 'Nessuno'],
                ['day', 'Giorno'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                class={`chip${mode === value ? ' on' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'day' && legend.length > 0 && (
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
    </main>
  )
}
