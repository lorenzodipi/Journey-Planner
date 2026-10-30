import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import { AuthProvider } from './lib/auth'
import { pingSupabase } from './lib/supabase'
import { initTheme } from './lib/theme'
import { TripProvider } from './state/trip'
import './styles.css'

// Tema chiaro/scuro (la scelta sta in Impostazioni account)
initTheme()

// Service worker: l'app si apre anche senza rete e si aggiorna da sola.
// Nell'app Android/iOS i file sono già dentro il pacchetto: nessun service worker.
if (!__NATIVE__) registerSW({ immediate: true })
else {
  // App Android: gesto/tasto "indietro"; app iOS: swipe dal bordo sinistro
  void import('@capacitor/core').then(({ Capacitor }) => {
    if (Capacitor.getPlatform() === 'ios') void import('./lib/swipeBack').then((m) => m.setupSwipeBack())
    else void import('./lib/nativeBack').then((m) => m.setupNativeBack())
  })
}

// Tiene attivo il progetto Supabase (piano Free) a ogni apertura
pingSupabase()

createRoot(document.getElementById('app') as HTMLElement).render(
  <AuthProvider>
    <TripProvider>
      <App />
    </TripProvider>
  </AuthProvider>
)
