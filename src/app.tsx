import { useEffect, useLayoutEffect } from 'react'
import { Redirect, Route, Router, Switch, useLocation } from 'wouter'
import type { ComponentType } from 'react'
import { useHashLocation } from 'wouter/use-hash-location'
import { useAuth } from './lib/auth'
import { useTrips } from './state/trip'
import { Alloggi } from './pages/Alloggi'
import { Altro } from './pages/Altro'
import { Budget } from './pages/Budget'
import { Checklist } from './pages/Checklist'
import { Prenotazioni } from './pages/Prenotazioni'
import { Giorni } from './pages/Giorni'
import { Giorno } from './pages/Giorno'
import { Account } from './pages/Account'
import { Impostazioni } from './pages/Impostazioni'
import { Login } from './pages/Login'
import { Luoghi } from './pages/Luoghi'
import { Oggi } from './pages/Oggi'
import { Trasporti } from './pages/Trasporti'
import { PrimoViaggio } from './pages/PrimoViaggio'
import { Spese } from './pages/Spese'
import { BottomNav } from './ui/BottomNav'
import { PullToRefresh } from './ui/PullToRefresh'
import { OutboxBanner } from './ui/OutboxBanner'
import { ToastHost } from './ui/ToastHost'
import { EmptyState } from './ui/PageHeader'
import { Sprite } from './ui/Sprite'

/** Pagine non ancora rifatte col design system Faraway: CSS di prima e barra di prima (#26). */
function legacy<P extends object>(Page: ComponentType<P>) {
  return function Legacy(props: P) {
    return (
      <div className="legacy">
        <Page {...props} />
        <BottomNav />
      </div>
    )
  }
}
const OldLuoghi = legacy(Luoghi)
const OldBudget = legacy(Budget)
const OldSpese = legacy(Spese)
const OldAltro = legacy(Altro)
const OldAlloggi = legacy(Alloggi)
const OldTrasporti = legacy(Trasporti)
const OldChecklist = legacy(Checklist)
const OldPrenotazioni = legacy(Prenotazioni)
const OldImpostazioni = legacy(Impostazioni)
const OldAccount = legacy(Account)

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
      <div className="grid min-h-dvh place-items-center text-muted" role="status">
        Caricamento…
      </div>
    )
  }

  if (auth.status === 'signed-out') return <Login />

  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center text-muted" role="status">
        Carico i tuoi viaggi…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <main className="mx-auto grid min-h-dvh max-w-sm place-content-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl font-extrabold">Non riesco a caricare i viaggi</h1>
        <p role="alert" className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="min-h-[52px] rounded-full bg-accent px-6 font-extrabold text-accent-ink"
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
      <Sprite />
      <div>
        {auth.status === 'demo' && (
          <p className="cap" style={{ textAlign: 'center', padding: 'calc(4px + env(safe-area-inset-top)) 16px 4px', background: 'var(--azzurro-soft)', color: 'var(--azzurro-ink)', fontWeight: 600 }}>
            Anteprima demo · dati fittizi
          </p>
        )}
        <OutboxBanner />
        <Switch>
          <Route path="/" component={Oggi} />
          <Route path="/giorni" component={Giorni} />
          <Route path="/giorni/:id" component={Giorno} />
          <Route path="/luoghi" component={OldLuoghi} />
          <Route path="/mappa">
            <Redirect to="/luoghi?vista=mappa" replace />
          </Route>
          <Route path="/spese" component={OldBudget} />
          <Route path="/spese/dettaglio" component={OldSpese} />
          <Route path="/altro/budget">
            <Redirect to="/spese" replace />
          </Route>
          <Route path="/altro/spese">
            <Redirect to="/spese/dettaglio" replace />
          </Route>
          <Route path="/altro" component={OldAltro} />
          <Route path="/altro/alloggi" component={OldAlloggi} />
          <Route path="/altro/trasporti" component={OldTrasporti} />
          <Route path="/altro/checklist" component={OldChecklist} />
          <Route path="/altro/prenotazioni" component={OldPrenotazioni} />
          <Route path="/altro/impostazioni" component={OldImpostazioni} />
          <Route path="/altro/account" component={OldAccount} />
          <Route>
            <main className="screen legacy">
              <EmptyState title="Pagina non trovata" text="Torna alla scheda Oggi dalla barra in basso." />
            </main>
          </Route>
        </Switch>
      </div>
      <PullToRefresh />
      <ToastHost />
    </Router>
  )
}
