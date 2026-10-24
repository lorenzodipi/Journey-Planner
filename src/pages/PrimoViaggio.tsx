import { useAuth } from '../lib/auth'
import { useTrips } from '../state/trip'
import { ART } from '../ui/art'
import { ChevronLeftG } from '../ui/glyphs'
import { TripForm } from '../ui/TripForm'

/** Schermata mostrata quando l'utente non ha ancora nessun viaggio (Fw3-NuovoViaggio). */
export function PrimoViaggio() {
  const trips = useTrips()
  const auth = useAuth()

  return (
    <main class="screen">
      <div style={{ paddingTop: '8px' }}>
        <img class="sym" src={ART.symbol} alt="" width="52" height="63" style={{ marginBottom: '20px' }} />
        <h1 class="d-lg">Dove si va?</h1>
        <p class="b-sm muted" style={{ marginTop: '8px' }}>
          Dai un nome al viaggio e scegli le date. Il resto lo aggiungi dopo.
        </p>
      </div>
      <TripForm onSubmit={trips.createTrip} onDone={() => undefined} />
      <div style={{ textAlign: 'center' }}>
        <button type="button" class="btn danger" onClick={() => void auth.signOut()}>
          <ChevronLeftG />
          Esci dall’account
        </button>
      </div>
    </main>
  )
}
