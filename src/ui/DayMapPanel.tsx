import { useEffect, useRef, useState } from 'react'
import { Foglio } from '../faraway/Foglio'
import { Sv } from '../faraway/icons'
import { Loader } from '../faraway/Loader'
import type { DayRoute } from '../state/dayRoute'
import { TRANSPORT_COLOR } from '../state/dayRoute'
import type { Trip } from '../types'
import { MODE_LABEL } from '../lib/mezzi'
import { t as tt } from '../i18n'

type DayMapComponent = typeof import('./MapView').DayMapView
type PuntoMappa = Parameters<DayMapComponent>[0]['stops'][number]

/** La mappa del giorno a schermo intero: un foglio a tutta altezza (tasto indietro ed Esc la chiudono) con la stessa mappa. Toccando un pin si evidenzia e compare il nome della tappa. */
function MappaGrande({ View, stops, route, center, selectedId, onClose }: { View: DayMapComponent; stops: PuntoMappa[]; route: DayRoute; center: Trip['center']; selectedId?: string | null; onClose: () => void }) {
  const [sel, setSel] = useState<string | null>(selectedId ?? null)
  const scelta = stops.find((x) => x.id === sel)
  const comandi = useRef<{ locate: () => void } | null>(null)
  return (
    <Foglio open title={tt('Mappa del giorno')} onClose={onClose} full className="fa-mgrande">
      <div className="fa-dmg">
        <View stops={stops} lines={route.lines} ends={route.ends} center={center} selectedId={sel} onSelect={setSel} apiRef={comandi} />
        {scelta ? <span className="fa-mapchip">{`${scelta.n} · ${scelta.name}`}</span> : null}
        <div className="fa-mapctl giu">
          <button type="button" className="fa-ib" aria-label={tt('La mia posizione')} onClick={() => comandi.current?.locate()}>
            <Sv name="pin" size={22} />
          </button>
          <button type="button" className="fa-ib" aria-label={tt('Riduci la mappa')} onClick={onClose}>
            <Sv name="riduci" size={22} />
          </button>
        </div>
      </div>
    </Foglio>
  )
}

/** Mappa di un giorno (riquadro `.map` del Design System v3): pin, linee tra le tappe e partenze/arrivi dei mezzi. L'elenco delle tappe sta nella pagina del giorno. */
export function DayMapPanel({
  route,
  center,
  selectedId,
  onSelect,
  height = 260,
  bare = false,
  stopState,
}: {
  route: DayRoute
  center: Trip['center']
  selectedId?: string | null
  onSelect?: (stopId: string) => void
  height?: number
  /** Dentro una card del design system: niente bordo né elenco dei trasporti. */
  bare?: boolean
  /** Stato di ogni tappa (per id) per il colore dei pin. */
  stopState?: Map<string, 'done' | 'skip' | 'now' | 'next'>
}) {
  const [View, setView] = useState<DayMapComponent | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [grande, setGrande] = useState(false)
  const comandi = useRef<{ locate: () => void } | null>(null)

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
    if (bare)
      return (
        <p className="fa-m" style={{ padding: '16px 16px 0' }}>
          {tt('Nessuna tappa ha ancora una posizione: collega le tappe a luoghi con una posizione per vederle sulla mappa.')}
        </p>
      )
    return (
      <p className="card b-sm muted">
        {tt('Nessuna tappa di questo giorno ha ancora una posizione: collega le tappe a luoghi con una posizione sulla mappa, oppure imposta partenza e arrivo di un trasporto.')}
      </p>
    )
  }

  const punti = stopState ? stops.map((x) => ({ ...x, state: stopState.get(x.id) })) : stops
  const centro = stops[0] ?? transports[0]?.from ?? center

  return (
    <div>
      <div className="map" style={bare ? { height: `${height}px`, borderRadius: 0 } : { height: `${height}px`, border: '1.5px solid var(--border-strong)' }}>
        {View ? (
          <>
            <View stops={punti} lines={lines} ends={ends} center={centro} selectedId={selectedId} onSelect={onSelect} apiRef={comandi} />
            <div className="fa-mapctl giu">
              <button type="button" className="fa-ib" aria-label={tt('La mia posizione')} onClick={() => comandi.current?.locate()}>
                <Sv name="pin" size={22} />
              </button>
              <button type="button" className="fa-ib" aria-label={tt('Apri la mappa a schermo intero')} aria-haspopup="dialog" onClick={() => setGrande(true)}>
                <Sv name="espandi" size={22} />
              </button>
            </div>
          </>
        ) : (
          <p className="b-sm muted" style={{ display: 'grid', height: '100%', placeItems: 'center', padding: '0 24px', textAlign: 'center' }} role="status">
            {loadError ? tt('Non riesco a caricare la mappa: serve la connessione la prima volta.') : <Loader size={32} label={tt('Caricamento della mappa')} />}
          </p>
        )}
      </div>
      {grande && View ? <MappaGrande View={View} stops={punti} route={route} center={centro} selectedId={selectedId} onClose={() => setGrande(false)} /> : null}

      {!bare && transports.length > 0 && (
        <ul className="b-sm" style={{ display: 'grid', gap: '6px', marginTop: '10px' }} aria-label={tt('Trasporti sulla mappa')}>
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

      {!bare && missing > 0 && (
        <p className="cap muted" style={{ marginTop: '8px' }}>
          {tt('{missing} {v1} una posizione e non compare sulla mappa.', { missing, v1: missing === 1 ? tt('tappa non ha') : tt('tappe non hanno') })}
        </p>
      )}
    </div>
  )
}
