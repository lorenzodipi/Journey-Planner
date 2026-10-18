import { useEffect, useLayoutEffect } from 'preact/hooks'
import { Route, Router, Switch, useLocation } from 'wouter-preact'
import { useHashLocation } from 'wouter-preact/use-hash-location'
import { useAuth } from './lib/auth'
import { useTrips } from './state/trip'
import { Alloggi } from './pages/Alloggi'
import { Altro } from './pages/Altro'
import { Budget } from './pages/Budget'
import { Checklist } from './pages/Checklist'
import { Prenotazioni } from './pages/Prenotazioni'
import { Giorni } from './pages/Giorni'
import { Giorno } from './pages/Giorno'
import { Impostazioni } from './pages/Impostazioni'
import { Login } from './pages/Login'
import { Luoghi } from './pages/Luoghi'
import { Mappa } from './pages/Mappa'
import { Oggi } from './pages/Oggi'
import { Trasporti } from './pages/Trasporti'
import { PrimoViaggio } from './pages/PrimoViaggio'
import { Spese } from './pages/Spese'
import { BottomNav } from './ui/BottomNav'
import { OutboxBanner } from './ui/OutboxBanner'
import { ToastHost } from './ui/ToastHost'
import { EmptyState } from './ui/PageHeader'

/** Ogni cambio di pagina riparte dall'alto (altrimenti resta la posizione della pagina precedente). */
function ScrollToTop() {
  const [location] = useLocation()
  useEffect(() => {
    try {
      history.scrollRestoration = 'manual'
    } catch {
      // ignorato
    }
  }, [])
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location])
  return null
}

export function App() {
  const auth = useAuth()
  const { active: trip, status, error, refresh } = useTrips()

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
        <h1 class="font-display text-2xl font-extrabold">Non riesco a caricare i viaggi</h1>
        <p role="alert" class="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          class="min-h-[52px] rounded-full bg-accent px-6 font-extrabold text-accent-ink"
        >
          Riprova
        </button>
      </main>
    )
  }

  if (!trip) return <PrimoViaggio />

  return (
    <Router hook={useHashLocation}>
      <ScrollToTop />
      <div
        class="mx-auto min-h-dvh max-w-xl"
        style={{ paddingBottom: 'calc(7.25rem + env(safe-area-inset-bottom))' }}
      >
        {auth.status === 'demo' && (
          <p
            class="bg-accent-soft px-4 py-2 text-center text-xs font-bold text-pale"
            style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
          >
            Anteprima demo · dati fittizi
          </p>
        )}
        <OutboxBanner />
        <Switch>
          <Route path="/" component={Oggi} />
          <Route path="/giorni" component={Giorni} />
          <Route path="/giorni/:id" component={Giorno} />
          <Route path="/mappa" component={Mappa} />
          <Route path="/luoghi" component={Luoghi} />
          <Route path="/altro" component={Altro} />
          <Route path="/altro/alloggi" component={Alloggi} />
          <Route path="/altro/trasporti" component={Trasporti} />
          <Route path="/altro/budget" component={Budget} />
          <Route path="/altro/spese" component={Spese} />
          <Route path="/altro/checklist" component={Checklist} />
          <Route path="/altro/prenotazioni" component={Prenotazioni} />
          <Route path="/altro/impostazioni" component={Impostazioni} />
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
