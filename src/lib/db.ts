import { supabase } from './supabase'
import { t } from '../i18n'

// Client del database e messaggi d'errore comprensibili, condivisi dai moduli api.

export function client() {
  if (!supabase) throw new Error('Supabase non è configurato.')
  if (!navigator.onLine) throw new Error('Sei offline: la modifica non è stata salvata. Riprova con la connessione.')
  return supabase
}

/** Messaggi comprensibili al posto degli errori grezzi del database. */
export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error ?? '')
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code ?? '') : ''
  if (/abort|timed? ?out/i.test(message)) return t('Il server non risponde. Controlla la connessione e riprova.')
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) return t('Connessione assente o instabile. Riprova.')
  if (/row-level security|permission denied/i.test(message) || code === '42501') return t('Non hai il permesso per questa operazione.')
  if (/jwt expired|invalid jwt|refresh token|not authenticated|auth session missing/i.test(message)) return t('La sessione è scaduta: esci e rientra, poi riprova.')
  if (/could not find the (function|'quantity' column)/i.test(message)) return t('Manca un aggiornamento del database: esegui il file supabase/migrations/0006_traveler_accounts.sql nel SQL Editor di Supabase.')
  if (/expenses_source_unique/i.test(message)) return t('Questa voce ha già la sua spesa collegata.')
  if (/duplicate key/i.test(message) || code === '23505') return t('Esiste già un elemento uguale.')
  if (/trips_dates_ok/i.test(message)) return t('La data di fine non può essere prima di quella di inizio.')
  // messaggi dell'app che nominano il database (migrazioni, file JSON): passano così come sono
  if (/migrazion|migration|un JSON valido|valid JSON/i.test(message)) return message
  // gli altri errori tecnici non si mostrano mai così come sono: restano nella console, qui un messaggio chiaro
  if (/violates foreign key/i.test(message) || code === '23503') return t('Un elemento collegato non c\'è più. Ricarica la pagina e riprova.')
  if (/violates (check|not-null) constraint|value too long|out of range/i.test(message) || /^23/.test(code)) return t('Un dato non è valido e non ho salvato niente. Controlla i campi e riprova.')
  if (ERRORE_TECNICO.test(message) || /^(22|42|PGRST)/.test(code)) return t('Qualcosa non è andato e non ho salvato niente. Riprova; se succede ancora, segnalalo.')
  return message.trim() || t('Qualcosa non è andato e non ho salvato niente. Riprova; se succede ancora, segnalalo.')
}

/** Testi tipici degli errori di Postgres, PostgREST e JavaScript: mai da mostrare a chi usa l'app. */
const ERRORE_TECNICO =
  /invalid input syntax|syntax error|malformed|does not exist|schema cache|could not find|relation |column |function |operator |violates|null value|unexpected token|is not a function|undefined is not|cannot read propert|typeerror|referenceerror|json|pgrst|uuid|\bsql\b|constraint|internal server error|bad request|status code/i
