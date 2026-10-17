import { supabase } from './supabase'

// Client del database e messaggi d'errore comprensibili, condivisi dai moduli api.

export function client() {
  if (!supabase) throw new Error('Supabase non è configurato.')
  if (!navigator.onLine) throw new Error('Sei offline: la modifica non è stata salvata. Riprova con la connessione.')
  return supabase
}

/** Messaggi comprensibili al posto degli errori grezzi del database. */
export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error)
  if (/abort|timed? ?out/i.test(message)) return 'Il server non risponde. Controlla la connessione e riprova.'
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Connessione assente o instabile. Riprova.'
  if (/row-level security|permission denied/i.test(message)) return 'Non hai il permesso per questa operazione.'
  if (/could not find the (function|'quantity' column)/i.test(message)) return 'Manca un aggiornamento del database: esegui il file supabase/migrations/0006_traveler_accounts.sql nel SQL Editor di Supabase.'
  if (/duplicate key/i.test(message)) return 'Esiste già un elemento uguale.'
  if (/trips_dates_ok/i.test(message)) return 'La data di fine non può essere prima di quella di inizio.'
  return message
}
