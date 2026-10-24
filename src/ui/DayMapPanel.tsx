import { useEffect, useState } from 'preact/hooks'
import type { DayRoute } from '../state/dayRoute'
import { TRANSPORT_COLOR } from '../state/dayRoute'
import type { Trip } from '../types'
import { MODE_LABEL } from './TransportForm'

type DayMapComponent = typeof import('./MapView').DayMapView

/** Mappa di un giorno (riquadro `.map` del Design System v3): pin, linee tra le tappe e partenze/arrivi dei mezzi. L'elenco delle tappe sta nella pagina del giorno. */
export function DayMapPanel({
  route,
  center,
  selectedId,
  onSelect,
  height = 260,
}: {
  route: DayRoute
  center: Trip['center']
  selectedId?: string | null
  onSelect?: (stopId: string) => void
  height?: number
}) {
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
      <p class="card b-sm muted">
        Nessuna tappa di questo giorno ha ancora una posizione: collega le tappe a luoghi con una posizione sulla mappa, oppure imposta partenza e arrivo di un trasporto.
      </p>
    )
  }

  return (
    <div>
      <div class="map" style={{ height: `${height}px`, border: '1.5px solid var(--border-strong)' }}>
        {View ? (
          <View stops={stops} lines={lines} ends={ends} center={stops[0] ?? transports[0]?.from ?? center} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <p class="b-sm muted" style={{ display: 'grid', height: '100%', placeItems: 'center', padding: '0 24px', textAlign: 'center' }} role="status">
            {loadError ? 'Non riesco a caricare la mappa: serve la connessione la prima volta.' : 'Carico la mappa…'}
          </p>
        )}
      </div>

      {transports.length > 0 && (
        <ul class="b-sm" style={{ display: 'grid', gap: '6px', marginTop: '10px' }} aria-label="Trasporti sulla mappa">
          {transports.map((t) => (
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span aria-hidden="true" style={{ width: '12px', height: '12px', flexShrink: 0, transform: 'rotate(45deg)', borderRadius: '3px', background: TRANSPORT_COLOR, marginInline: '4px' }} />
              <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {MODE_LABEL[t.mode]}: {t.fromName} → {t.toName}
              </span>
            </li>
          ))}
        </ul>
      )}

      {missing > 0 && (
        <p class="cap muted" style={{ marginTop: '8px' }}>
          {missing} {missing === 1 ? 'tappa non ha' : 'tappe non hanno'} una posizione e non compare sulla mappa.
        </p>
      )}
    </div>
  )
}
