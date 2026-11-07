import { useEffect, useLayoutEffect, useState } from 'react'
import { Redirect, Route, Router, Switch, useLocation } from 'wouter'
import type { ReactNode } from 'react'
import { navigate as hashNavigate, useHashLocation } from 'wouter/use-hash-location'
import { navigateClean } from './lib/indietro'
import { SCEGLI_DOPO_ACCESSO, useAuth } from './lib/auth'
import { useTrips } from './state/trip'
import { AlloggiPage } from './pages/alloggi/AlloggiPage'
import { NotificheHost } from './state/NotificheHost'
import { ViaggiPage } from './pages/viaggi/ViaggiPage'
import { ViaggiatoriPage } from './pages/altro/ViaggiatoriPage'
import { RegistroPage } from './pages/altro/RegistroPage'
import { DocumentiPage } from './pages/documenti/DocumentiPage'
import { AltroPage } from './pages/altro/AltroPage'
import { BudgetPage } from './pages/spese/BudgetPage'
import { Bilancio } from './pages/spese/Bilancio'
import { Dettaglio } from './pages/spese/Dettaglio'
import { SpesePage } from './pages/spese/SpesePage'
import { VoliPage } from './pages/voli/VoliPage'
import { ChecklistPage } from './pages/checklist/ChecklistPage'
import { PrenotazioniPage } from './pages/prenotazioni/PrenotazioniPage'
import { Giorni } from './pages/Giorni'
import { Giorno } from './pages/Giorno'
import { ImpostazioniPage } from './pages/altro/ImpostazioniPage'
import { ProfiloPage } from './pages/altro/ProfiloPage'
import { Login } from './pages/Login'
import { Luoghi } from './pages/Luoghi'
import { Oggi } from './pages/Oggi'
import { TrasportiPage } from './pages/trasporti/TrasportiPage'
import { PrimoViaggio } from './pages/PrimoViaggio'
import { PullToRefresh } from './ui/PullToRefresh'
import { ToastHost } from './ui/ToastHost'
import { BarraAttesa } from './faraway/Attesa'
import { AvvisoHost } from './faraway/AvvisoHost'
import { EmptyState } from './ui/PageHeader'
import { Sprite } from './ui/Sprite'
import { loadActiveId, loadSnapshot } from './lib/cache'
import { SchermataCaricamento, SchermataErrore } from './faraway/Rete'

const useHashLoc = (options?: Parameters<typeof useHashLocation>[0]): [string, typeof hashNavigate] => [useHashLocation(options)[0], navigateClean]
useHashLoc.hrefs = (href: string) => `#${href}`


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
  const { active: trip, status, refresh, receivedInvites } = useTrips()
  // appena fatto l'accesso si sceglie il viaggio; riaprendo l'app senza uscire dall'account si torna dov'eri
  const [daScegliere, setDaScegliere] = useState(() => {
    try {
      return localStorage.getItem(SCEGLI_DOPO_ACCESSO) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    // l'accesso avviene con l'app già aperta: rileggo il segno quando si entra
    if (auth.status !== 'signed-in') return
    try {
      setDaScegliere(localStorage.getItem(SCEGLI_DOPO_ACCESSO) === '1')
    } catch {
      // ignorato
    }
  }, [auth.status])
  useEffect(() => {
    // senza viaggi non c'è nulla da scegliere: il primo viaggio creato si apre direttamente
    if (status !== 'ready' || trip || !daScegliere) return
    try {
      localStorage.removeItem(SCEGLI_DOPO_ACCESSO)
    } catch {
      // ignorato
    }
    setDaScegliere(false)
  }, [status, trip, daScegliere])

  // avvio, errore e caricamento con gli stati del design system (#25, #49)
  const saved = loadSnapshot()
  const title = (saved?.trips.find((t) => t.id === loadActiveId()) ?? saved?.trips[0])?.title ?? 'Faraway'
  const screen = (node: ReactNode) => (
    <Router hook={useHashLoc}>
      <Sprite />
      {node}
      <ToastHost />
      <BarraAttesa />
      <AvvisoHost />
    </Router>
  )
  // nella scelta del viaggio non c'è il resto dell'app, ma il profilo (icona in alto a destra) si apre lo stesso
  const sceltaViaggio = (onChosen: () => void) => (
    <Switch>
      <Route path="/altro/account" component={ProfiloPage} />
      <Route>
        <ViaggiPage onChosen={onChosen} />
      </Route>
    </Switch>
  )
  if (auth.status === 'loading') return screen(<SchermataCaricamento title={title} />)
  if (auth.status === 'unreachable') return screen(<SchermataErrore title={title} onRetry={auth.retry} onSaved={saved ? auth.useSaved : undefined} />)
  if (auth.status === 'signed-out') return <Login />
  if (status === 'loading') return screen(<SchermataCaricamento title={title} />)
  if (status === 'error') return screen(<SchermataErrore title={title} onRetry={() => void refresh()} />)

  if (!trip) {
    return receivedInvites.length > 0 ? (
      screen(sceltaViaggio(() => undefined))
    ) : (
      <>
        <PrimoViaggio />
        <AvvisoHost />
      </>
    )
  }

  // subito dopo l'accesso si sceglie quale viaggio aprire (#43), anche se ce n'è uno solo
  if (auth.status === 'signed-in' && daScegliere) {
    const fatto = () => {
      try {
        localStorage.removeItem(SCEGLI_DOPO_ACCESSO)
      } catch {
        // ignorato
      }
      setDaScegliere(false)
    }
    return screen(sceltaViaggio(fatto))
  }

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
          <Route path="/spese/bilancio" component={Bilancio} />
          <Route path="/altro/budget">
            <Redirect to="/spese" replace />
          </Route>
          <Route path="/altro/spese">
            <Redirect to="/spese/dettaglio" replace />
          </Route>
          <Route path="/viaggi">
            <ViaggiPage />
          </Route>
          <Route path="/altro" component={AltroPage} />
          <Route path="/altro/dati">
            <Redirect to="/altro/impostazioni" replace />
          </Route>
          <Route path="/altro/viaggiatori" component={ViaggiatoriPage} />
          <Route path="/altro/alloggi" component={AlloggiPage} />
          <Route path="/altro/voli" component={VoliPage} />
          <Route path="/altro/trasporti" component={TrasportiPage} />
          <Route path="/altro/checklist" component={ChecklistPage} />
          <Route path="/altro/prenotazioni" component={PrenotazioniPage} />
          <Route path="/altro/documenti" component={DocumentiPage} />
          <Route path="/altro/registro" component={RegistroPage} />
          <Route path="/altro/cerca">
            <Redirect to="/altro" replace />
          </Route>
          <Route path="/altro/impostazioni" component={ImpostazioniPage} />
          <Route path="/altro/account" component={ProfiloPage} />
          <Route>
            <main className="screen legacy">
              <EmptyState title="Pagina non trovata" text="Torna alla scheda Oggi dalla barra in basso." />
            </main>
          </Route>
        </Switch>
      </div>
      <NotificheHost trip={trip} />
      <PullToRefresh />
      <ToastHost />
      <BarraAttesa />
      <AvvisoHost />
    </Router>
  )
}
