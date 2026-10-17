import { useMemo, useState } from 'preact/hooks'
import { useTrip } from '../state/trip'
import type { PlaceStatus } from '../types'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'

const statusLabel: Record<PlaceStatus, string> = {
  idea: 'Idea',
  planned: 'Pianificato',
  done: 'Fatto',
  skipped: 'Saltato',
}

const statusStyle: Record<PlaceStatus, string> = {
  idea: 'bg-accent-soft text-accent',
  planned: 'bg-secondary/15 text-secondary',
  done: 'bg-ok/15 text-ok',
  skipped: 'bg-line text-muted',
}

export function Luoghi() {
  const trip = useTrip()
  const [city, setCity] = useState<string>('Tutte')

  const cities = useMemo(() => ['Tutte', ...Array.from(new Set(trip.places.map((p) => p.city)))], [trip.places])
  const visible = trip.places.filter((p) => city === 'Tutte' || p.city === city)

  return (
    <>
      <PageHeader title="Luoghi" subtitle="La tua wishlist, divisa per città" />

      <div
        class="no-scrollbar -mt-1 mb-3 flex gap-2 overflow-x-auto px-4 pb-1"
        role="tablist"
        aria-label="Filtra per città"
      >
        {cities.map((c) => (
          <button
            type="button"
            role="tab"
            aria-selected={c === city}
            onClick={() => setCity(c)}
            class={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
              c === city ? 'bg-accent text-accent-ink' : 'bg-surface text-muted shadow-card'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div class="space-y-2 px-4">
        {visible.length === 0 && <EmptyState title="Nessun luogo" text="Qui compariranno i luoghi che aggiungi." />}
        {visible.map((p) => (
          <Card class="rise !p-3">
            <div class="flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <h2 class="truncate font-medium">{p.name}</h2>
                <p class="truncate text-xs text-muted">
                  {p.category} · {p.city}
                  {p.note ? ` · ${p.note}` : ''}
                </p>
              </div>
              <span class={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[p.status]}`}>
                {statusLabel[p.status]}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
