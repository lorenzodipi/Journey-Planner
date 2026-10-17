import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// URL e chiave "anon/publishable" sono pubbliche per progettazione:
// la sicurezza è garantita dalla Row Level Security sul database.
// La service_role / secret key non deve MAI comparire in questo progetto.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true, // la sessione resta salvata: l'app si apre anche offline
          autoRefreshToken: true,
          detectSessionInUrl: false, // login con password, nessun redirect
        },
      })
    : null

/**
 * Piccola lettura a ogni apertura dell'app: tiene attivo il progetto (piano Free:
 * pausa dopo 7 giorni di inattività). È un aiuto in più rispetto al keep-alive
 * schedulato su GitHub Actions. Errori e offline vengono ignorati.
 */
export function pingSupabase(): void {
  if (!supabase || !navigator.onLine) return
  void supabase
    .from('health')
    .select('ok')
    .limit(1)
    .then(
      () => undefined,
      () => undefined,
    )
}
