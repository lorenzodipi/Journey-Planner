import { startPositionJob, stopPositionJob, missingPosition, usePositionJob } from '../state/positionJob'
import { useTrips } from '../state/trips'
import { FormError, PrimaryButton, SecondaryButton } from './Field'
import { Card } from './PageHeader'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Luoghi senza posizione = senza pallino sulla mappa. Qui l'app li cerca da sola (OpenStreetMap, un luogo
 * alla volta) e mostra l'avanzamento. Compare solo se c'è qualcosa da fare o un lavoro in corso.
 */
export function FindPositions() {
  const t = useTrips()
  const job = usePositionJob()
  const trip = t.active
  if (!trip) return null
  const mine = job && job.tripId === trip.id ? job : null
  const missing = missingPosition(trip.places).length
  if (!mine?.running && missing === 0) return null

  const start = () => void startPositionJob({ getTrip: t.getTrip, setPlacePositions: t.setPlacePositions }, trip.id)

  if (mine?.running) {
    const pct = mine.total > 0 ? Math.round((mine.done / mine.total) * 100) : 0
    return (
      <Card>
        <h2 class="font-display text-lg font-extrabold">Cerco le posizioni…</h2>
        <p class="mt-1 text-[13px] leading-snug text-muted" aria-live="polite">
          {mine.done} di {mine.total} · {plural(mine.found, 'trovato', 'trovati')}
          {mine.current && <span> · ora: {mine.current}</span>}
        </p>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Avanzamento della ricerca">
          <div class="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p class="mt-3 text-xs leading-snug text-muted">
          Una ricerca al secondo, come chiede OpenStreetMap: ci vuole qualche minuto. Puoi cambiare pagina, ma tieni aperta l'app. I pallini compaiono sulla mappa man mano.
        </p>
        <div class="mt-3">
          <SecondaryButton onClick={stopPositionJob}>Interrompi</SecondaryButton>
        </div>
      </Card>
    )
  }

  const left = mine && !mine.running ? mine.notFound.length : 0
  return (
    <Card>
      <h2 class="font-display text-lg font-extrabold">{plural(missing, 'luogo non è', 'luoghi non sono')} sulla mappa</h2>
      <p class="mt-1 text-[13px] leading-snug text-muted">
        {mine && !mine.error && left > 0
          ? `Per ${plural(left, 'luogo', 'luoghi')} non ho trovato la posizione. Aprilo, tocca Modifica e incolla un link di Google Maps (quello lungo, dalla barra del browser): il pallino compare subito.`
          : 'Senza posizione non hanno il pallino. L\'app può cercarla da sola partendo da nome, città e indirizzo.'}
      </p>
      {mine?.error && (
        <div class="mt-3">
          <FormError message={mine.error} />
        </div>
      )}
      {mine && left > 0 && (
        <details class="mt-3 text-sm">
          <summary class="min-h-6 cursor-pointer font-extrabold text-pale">Vedi quali</summary>
          <ul class="mt-2 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5">
            {mine.notFound.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </details>
      )}
      <form
        class="mt-3"
        onSubmit={(e) => {
          e.preventDefault()
          start()
        }}
      >
        <PrimaryButton>{mine ? 'Riprova a cercare' : 'Trova le posizioni'}</PrimaryButton>
      </form>
    </Card>
  )
}
