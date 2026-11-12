// Tutto ciò che l'app tiene sul telefono, da cancellare quando si esce dall'account (o quando entra un altro account):
// così i dati di una persona non finiscono mai nelle schermate di un'altra. Un solo posto, che riconosce le chiavi
// dal prefisso: una chiave nuova (`jp.…`) viene cancellata da sola, senza dover ricordarsi di aggiungerla qui.
import { clearBookingCache } from './bookingFiles'

/** Aspetto dell'app (tema, ora e unità, stile della mappa): sono scelte del telefono, non dati dell'account, e restano. */
export const CHIAVI_DA_TENERE: readonly string[] = ['jp.theme.v1', 'jp.formati.v1', 'jp.mapStyle']

/** Tra le chiavi di localStorage, quelle da cancellare: dell'app (`jp.`) e della sessione (`sb-`), tranne l'aspetto. */
export function chiaviDaCancellare(chiavi: readonly string[]): string[] {
  return chiavi.filter((k) => (k.startsWith('jp.') || k.startsWith('sb-')) && !CHIAVI_DA_TENERE.includes(k))
}

/**
 * Cancella dal telefono ogni dato dell'account: copia dei viaggi, coda delle modifiche non inviate, nome del profilo,
 * ultimo account, percorsi, meteo, foto, documenti offline e loro chiave, file dei biglietti (IndexedDB), stato della
 * sessione, avvisi programmati. L'app non usa cookie. Si può chiamare più volte.
 */
export function cancellaDatiLocali(): void {
  try {
    const tutte = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '')
    for (const k of chiaviDaCancellare(tutte)) localStorage.removeItem(k)
  } catch {
    // storage bloccato: niente da cancellare
  }
  try {
    sessionStorage.clear()
  } catch {
    // ignorato
  }
  clearBookingCache() // file dei biglietti sul telefono (IndexedDB) e la loro chiave di cifratura
  // gli avvisi già programmati sul telefono parlano dei viaggi di chi è uscito
  void import('./notificheDevice').then((m) => m.programma([])).catch(() => undefined)
}
