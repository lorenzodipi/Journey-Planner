import { useTrip } from '../state/trip'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'

export function Mappa() {
  const trip = useTrip()
  const withCoords = trip.places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

  return (
    <>
      <PageHeader title="Mappa" subtitle={`${withCoords.length} luoghi con posizione`} />
      <div class="space-y-3 px-4">
        <EmptyState
          title="La mappa arriva nello Sprint 2"
          text="Pin per tipologia, colore per giorno e filtri. Verrà caricata a parte per non appesantire l’avvio dell’app."
        />
        <Card>
          <h2 class="font-display mb-1 text-lg font-semibold">Luoghi che compariranno</h2>
          <ul class="divide-y divide-line text-sm">
            {withCoords.map((p) => (
              <li class="flex items-center justify-between gap-3 py-2">
                <span class="truncate">{p.name}</span>
                <span class="shrink-0 tabular-nums text-xs text-muted">
                  {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
