// Luoghi senza posizione (senza pin sulla mappa): l'app la cerca da sola su OpenStreetMap, un luogo alla volta,
// e mostra l'avanzamento. Compare solo se c'è qualcosa da fare o un lavoro in corso.
import { Loader } from '../../faraway/Loader'
import { missingPosition, startPositionJob, stopPositionJob, usePositionJob } from '../../state/positionJob'
import { useTrips } from '../../state/trips'
import { Barra, Pulsante } from '../../faraway/base'
import { Sv } from '../../faraway/icons'
import { t as tt } from '../../i18n'

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
      <section className="fa-card pad" style={{ display: 'grid', gap: 16 }} aria-live="polite">
        <div style={{ display: 'grid', gap: 8 }}>
          <h2 className="fa-h3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Loader size={20} label={tt('Ricerca in corso')} />{tt('Posizioni dei luoghi')}</h2>
          <p className="fa-m">
            {tt('{done} di {total} · {v2}{v3}', { done: mine.done, total: mine.total, v2: plural(mine.found, tt('trovato'), tt('trovati')), v3: mine.current ? tt(' · ora: {current}', { current: mine.current }) : '' })}
          </p>
        </div>
        <Barra value={mine.done} max={Math.max(1, mine.total)} label={tt('Avanzamento della ricerca')} />
        <p className="fa-m">{tt('Una ricerca al secondo, come chiede OpenStreetMap. Puoi cambiare pagina, ma tieni aperta l\'app: i pin compaiono man mano.')}</p>
        <Pulsante color="secondary" onPress={stopPositionJob}>
          {tt('Interrompi')}
        </Pulsante>
      </section>
    )
  }

  const left = mine && !mine.running ? mine.notFound.length : 0
  return (
    <section className="fa-card pad" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <svg className="ic" width="44" height="44" aria-hidden="true">
          <use href="#i-nav-no-pin" />
        </svg>
        <div style={{ minWidth: 0 }}>
          <div className="fa-b">{tt('{v0} sulla mappa', { v0: plural(missing, tt('luogo non è'), tt('luoghi non sono')) })}</div>
          <div className="fa-m">
            {mine && !mine.error && left > 0
              ? tt('Per {v0} non ho trovato la posizione: aprilo, tocca Modifica e incolla il link lungo di Google Maps.', { v0: plural(left, tt('luogo'), tt('luoghi')) })
              : tt('L\'app può cercare la posizione da sola partendo da nome, città e indirizzo.')}
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
          <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 32 }}>{tt('Vedi quali')}</summary>
          <ul style={{ maxHeight: 160, overflow: 'auto', paddingLeft: 24, listStyle: 'disc' }}>
            {mine.notFound.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <Pulsante color="secondary" iconLeading="search" onPress={start}>
        {mine ? tt('Riprova a cercare') : tt('Trova le posizioni')}
      </Pulsante>
    </section>
  )
}
