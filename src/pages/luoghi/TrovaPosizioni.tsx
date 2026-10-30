// Luoghi senza posizione (senza pin sulla mappa): l'app la cerca da sola su OpenStreetMap, un luogo alla volta,
// e mostra l'avanzamento. Compare solo se c'è qualcosa da fare o un lavoro in corso.
import { missingPosition, startPositionJob, stopPositionJob, usePositionJob } from '../../state/positionJob'
import { useTrips } from '../../state/trips'
import { Barra, Pulsante } from '../../faraway/base'
import { Sv } from '../../faraway/icons'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function TrovaPosizioni() {
  const t = useTrips()
  const job = usePositionJob()
  const trip = t.active
  if (!trip) return null
  const mine = job && job.tripId === trip.id ? job : null
  const missing = missingPosition(trip.places).length
  if (!mine?.running && missing === 0) return null
  const start = () => void startPositionJob({ getTrip: t.getTrip, setPlacePositions: t.setPlacePositions }, trip.id)

  if (mine?.running) {
    return (
      <section className="fa-card pad" style={{ display: 'grid', gap: 12 }} aria-live="polite">
        <div style={{ display: 'grid', gap: 4 }}>
          <h2 className="fa-h3">Cerco le posizioni…</h2>
          <p className="fa-m">
            {mine.done} di {mine.total} · {plural(mine.found, 'trovato', 'trovati')}
            {mine.current ? ` · ora: ${mine.current}` : ''}
          </p>
        </div>
        <Barra value={mine.done} max={Math.max(1, mine.total)} label="Avanzamento della ricerca" />
        <p className="fa-m">Una ricerca al secondo, come chiede OpenStreetMap. Puoi cambiare pagina, ma tieni aperta l'app: i pin compaiono man mano.</p>
        <Pulsante color="secondary" onPress={stopPositionJob}>
          Interrompi
        </Pulsante>
      </section>
    )
  }

  const left = mine && !mine.running ? mine.notFound.length : 0
  return (
    <section className="fa-card pad" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <svg className="ic" width="44" height="44" aria-hidden="true">
          <use href="#i-nav-no-pin" />
        </svg>
        <div style={{ minWidth: 0 }}>
          <div className="fa-b">{plural(missing, 'luogo non è', 'luoghi non sono')} sulla mappa</div>
          <div className="fa-m">
            {mine && !mine.error && left > 0
              ? `Per ${plural(left, 'luogo', 'luoghi')} non ho trovato la posizione: aprilo, tocca Modifica e incolla il link lungo di Google Maps.`
              : "L'app può cercare la posizione da sola partendo da nome, città e indirizzo."}
          </div>
        </div>
      </div>
      {mine?.error ? (
        <span className="fa-help bad" role="alert">
          <Sv name="err" size={16} />
          {mine.error}
        </span>
      ) : null}
      {mine && left > 0 ? (
        <details className="fa-m">
          <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 32 }}>Vedi quali</summary>
          <ul style={{ maxHeight: 160, overflow: 'auto', paddingLeft: 20, listStyle: 'disc' }}>
            {mine.notFound.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <Pulsante color="secondary" iconLeading="search" onPress={start}>
        {mine ? 'Riprova a cercare' : 'Trova le posizioni'}
      </Pulsante>
    </section>
  )
}
