import { useEffect, useLayoutEffect } from 'react'
import { Redirect, Route, Router, Switch, useLocation } from 'wouter'
import type { ComponentType, ReactNode } from 'react'
import { navigate as hashNavigate, useHashLocation } from 'wouter/use-hash-location'
import { useAuth } from './lib/auth'
import { useTrips } from './state/trip'
import { Alloggi } from './pages/Alloggi'
import { Altro } from './pages/Altro'
import { BudgetPage } from './pages/spese/BudgetPage'
import { Dettaglio } from './pages/spese/Dettaglio'
import { SpesePage } from './pages/spese/SpesePage'
import { VoliPage } from './pages/voli/VoliPage'
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
import { BottomNav } from './ui/BottomNav'
import { PullToRefresh } from './ui/PullToRefresh'
import { OutboxBanner } from './ui/OutboxBanner'
import { ToastHost } from './ui/ToastHost'
import { EmptyState } from './ui/PageHeader'
import { Sprite } from './ui/Sprite'
import { loadActiveId, loadSnapshot } from './lib/cache'
import { SchermataCaricamento, SchermataErrore } from './faraway/Rete'

// La query delle rotte (?vista=mappa) sta in location.search: wouter la lascia alla pagina dopo se il
// nuovo indirizzo non ha «?». Qui ogni cambio di pagina la riscrive (vuota se non c'è).
const navigateClean: typeof hashNavigate = (to, options) => hashNavigate(to.includes('?') ? to : `${to}?`, options)
const useHashLoc = (options?: Parameters<typeof useHashLocation>[0]): [string, typeof hashNavigate] => [useHashLocation(options)[0], navigateClean]
useHashLoc.hrefs = (href: string) => `#${href}`

/** Pagine non ancora rifatte col design system Faraway: CSS di prima e barra di prima (#26). */
function legacy<P extends object>(Page: ComponentType<P>) {
  return function Legacy(props: P) {
    return (
      <div className="legacy">
        <OutboxBanner />
        <Page {...props} />
        <BottomNav />
      </div>
    )
  }
}
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
  const { active: trip, status, refresh } = useTrips()

  // avvio, errore e caricamento con gli stati del design system (#25, #49)
  const saved = loadSnapshot()
  const title = (saved?.trips.find((t) => t.id === loadActiveId()) ?? saved?.trips[0])?.title ?? 'Faraway'
  const screen = (node: ReactNode) => (
    <Router hook={useHashLoc}>
      <Sprite />
      {node}
    </Router>
  )
  if (auth.status === 'loading') return screen(<SchermataCaricamento title={title} />)
  if (auth.status === 'unreachable') return screen(<SchermataErrore title={title} onRetry={auth.retry} onSaved={saved ? auth.useSaved : undefined} />)
  if (auth.status === 'signed-out') return <Login />
  if (status === 'loading') return screen(<SchermataCaricamento title={title} />)
  if (status === 'error') return screen(<SchermataErrore title={title} onRetry={() => void refresh()} />)

  if (!trip) return <PrimoViaggio />

  return (
    <Router hook={useHashLoc}>
      <ScrollToTop />
      <Sprite />
      <div>
        {auth.status === 'demo' && (
          <p className="cap" style={{ textAlign: 'center', padding: 'calc(4px + env(safe-area-inset-top)) 16px 4px', background: 'var(--azzurro-soft)', color: 'var(--azzurro-ink)', fontWeight: 600 }}>
            Anteprima demo · dati fittizi
          </p>
        )}
        <Switch>
          <Route path="/" component={Oggi} />
          <Route path="/giorni" component={Giorni} />
          <Route path="/giorni/:id" component={Giorno} />
          <Route path="/luoghi" component={Luoghi} />
          <Route path="/mappa">
            <Redirect to="/luoghi?vista=mappa" replace />
          </Route>
          <Route path="/spese" component={SpesePage} />
          <Route path="/spese/budget" component={BudgetPage} />
          <Route path="/spese/dettaglio" component={Dettaglio} />
          <Route path="/altro/budget">
            <Redirect to="/spese" replace />
          </Route>
          <Route path="/altro/spese">
            <Redirect to="/spese/dettaglio" replace />
          </Route>
          <Route path="/altro" component={OldAltro} />
          <Route path="/altro/alloggi" component={OldAlloggi} />
          <Route path="/altro/voli" component={VoliPage} />
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
