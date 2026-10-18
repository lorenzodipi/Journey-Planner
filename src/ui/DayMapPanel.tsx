import { useEffect, useState } from 'preact/hooks'
import type { DayRoute } from '../state/dayRoute'
import { TRANSPORT_COLOR } from '../state/dayRoute'
import type { Trip } from '../types'
import { MODE_LABEL } from './TransportForm'

type DayMapComponent = typeof import('./MapView').DayMapView

/** Mappa di un giorno: pin numerati, linee tra le tappe e partenze/arrivi dei mezzi. L'elenco delle tappe sta nella pagina del giorno. */
export function DayMapPanel({ route, center }: { route: DayRoute; center: Trip['center'] }) {
  const [View, setView] = useState<DayMapComponent | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    import('./MapView').then(
      (m) => active && setView(() => m.DayMapView),
      () => active && setLoadError(true),
    )
    return () => {
      active = false
    }
  }, [])

  const { stops, transports, lines, ends, missing } = route

  if (stops.length === 0 && transports.length === 0) {
    return (
      <p class="bg-accent-soft px-4 py-3 text-sm text-pale">
        Nessuna tappa di questo giorno ha ancora una posizione: collega le tappe a luoghi con una posizione sulla mappa, oppure imposta partenza e arrivo di un trasporto.
      </p>
    )
  }

  return (
    <div>
      <div class="h-[170px] overflow-hidden bg-bg">
        {View ? (
          <View stops={stops} lines={lines} ends={ends} center={stops[0] ?? transports[0]?.from ?? center} />
        ) : (
          <p class="grid h-full place-items-center px-6 text-center text-sm text-muted" role="status">
            {loadError ? 'Non riesco a caricare la mappa: serve la connessione la prima volta.' : 'Carico la mappa…'}
          </p>
        )}
      </div>

      {transports.length > 0 && (
        <ul class="space-y-1 border-t-2 border-dashed border-line px-4 py-2.5 text-sm" aria-label="Trasporti sulla mappa">
          {transports.map((t) => (
            <li class="flex items-center gap-3">
              <span
                aria-hidden="true"
                class="h-3 w-3 shrink-0 rotate-45 rounded-[3px]"
                style={{ background: TRANSPORT_COLOR, marginInline: '0.4rem' }}
              />
              <span class="min-w-0 flex-1 truncate">
                {MODE_LABEL[t.mode]}: {t.fromName} → {t.toName}
              </span>
            </li>
          ))}
        </ul>
      )}

      {missing > 0 && (
        <p class="border-t-2 border-dashed border-line px-4 py-2.5 text-xs text-muted">
          {missing} {missing === 1 ? 'tappa non ha' : 'tappe non hanno'} una posizione e non compare sulla mappa.
        </p>
      )}
    </div>
  )
}
