import { useEffect } from 'preact/hooks'
import { Route, Router, Switch } from 'wouter-preact'
import { useHashLocation } from 'wouter-preact/use-hash-location'
import { useAuth } from './lib/auth'
import { useTrips } from './state/trip'
import { Altro } from './pages/Altro'
import { Giorni } from './pages/Giorni'
import { Login } from './pages/Login'
import { Luoghi } from './pages/Luoghi'
import { Mappa } from './pages/Mappa'
import { Oggi } from './pages/Oggi'
import { PrimoViaggio } from './pages/PrimoViaggio'
import { BottomNav } from './ui/BottomNav'
import { ToastHost } from './ui/ToastHost'
import { EmptyState } from './ui/PageHeader'

export function App() {
  const auth = useAuth()
  const { active: trip, status, error, stale, refresh } = useTrips()

  // Il tema cambia con il viaggio attivo
  const theme = trip?.theme ?? 'default'
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  if (auth.status === 'loading') {
    return (
      <div class="grid min-h-dvh place-items-center text-muted" role="status">
        Caricamento…
      </div>
    )
  }

  if (auth.status === 'signed-out') return <Login />

  if (status === 'loading') {
    return (
      <div class="grid min-h-dvh place-items-center text-muted" role="status">
        Carico i tuoi viaggi…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <main class="mx-auto grid min-h-dvh max-w-sm place-content-center gap-4 px-6 text-center">
        <h1 class="font-display text-2xl font-semibold">Non riesco a caricare i viaggi</h1>
        <p role="alert" class="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          class="min-h-12 rounded-full bg-accent px-6 font-semibold text-accent-ink"
        >
          Riprova
        </button>
      </main>
    )
  }

  if (!trip) return <PrimoViaggio />

  return (
    <Router hook={useHashLocation}>
      <div
        class="mx-auto min-h-dvh max-w-xl"
        style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        {auth.status === 'demo' && (
          <p
            class="bg-accent-soft px-4 py-2 text-center text-xs font-medium text-accent"
            style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
          >
            Anteprima demo · dati fittizi
          </p>
        )}
        {stale && auth.status === 'signed-in' && (
          <p
            class="bg-accent-soft px-4 py-2 text-center text-xs font-medium text-accent"
            style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
          >
            Dati salvati sul telefono · le modifiche richiedono la connessione
          </p>
        )}
        <Switch>
          <Route path="/" component={Oggi} />
          <Route path="/giorni" component={Giorni} />
          <Route path="/mappa" component={Mappa} />
          <Route path="/luoghi" component={Luoghi} />
          <Route path="/altro" component={Altro} />
          <Route>
            <div class="px-4 pt-10">
              <EmptyState title="Pagina non trovata" text="Torna alla scheda Oggi dalla barra in basso." />
            </div>
          </Route>
        </Switch>
      </div>
      <BottomNav />
      <ToastHost />
    </Router>
  )
}
