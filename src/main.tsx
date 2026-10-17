import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import { AuthProvider } from './lib/auth'
import { pingSupabase } from './lib/supabase'
import { TripProvider } from './state/trip'
import './styles.css'

// Service worker: l'app si apre anche senza rete e si aggiorna da sola
registerSW({ immediate: true })

// Tiene attivo il progetto Supabase (piano Free) a ogni apertura
pingSupabase()

render(
  <AuthProvider>
    <TripProvider>
      <App />
    </TripProvider>
  </AuthProvider>,
  document.getElementById('app') as HTMLElement,
)
