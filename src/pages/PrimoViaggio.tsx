import { useAuth } from '../lib/auth'
import { useTrips } from '../state/trip'
import { TripForm } from '../ui/TripForm'

/** Schermata mostrata quando l'utente non ha ancora nessun viaggio. */
export function PrimoViaggio() {
  const trips = useTrips()
  const auth = useAuth()

  return (
    <main
      class="mx-auto min-h-dvh max-w-xl px-5 pb-10"
      style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}
    >
      <span
        aria-hidden="true"
        class="mb-5 block h-12 w-12 rounded-full"
        style={{ background: 'linear-gradient(145deg, var(--accent), var(--secondary))' }}
      />
      <h1 class="font-display text-3xl font-semibold leading-tight">Il tuo primo viaggio</h1>
      <p class="mb-6 mt-1 text-muted">Bastano nome, date e chi viaggia: il resto lo aggiungi strada facendo.</p>
      <TripForm onSubmit={trips.createTrip} onDone={() => undefined} />
      <button
        type="button"
        onClick={() => void auth.signOut()}
        class="mt-6 min-h-11 w-full text-sm font-medium text-muted"
      >
        Esci
      </button>
    </main>
  )
}
