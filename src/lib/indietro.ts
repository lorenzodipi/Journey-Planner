// «Indietro» in alto a sinistra e swipe dal bordo: non tornano alla pagina precedente, ma salgono alla
// pagina madre della sezione (es. da un giorno a «Giorni», anche dopo aver scorso tre giorni di fila).
// Per non riempire la cronologia, ogni cambio di pagina ricorda da dove si è arrivati (history.state.from):
// se si arriva proprio dalla madre si torna indietro nella cronologia, altrimenti la si sostituisce.
import { navigate as hashNavigate } from 'wouter/use-hash-location'

/** Percorso attuale senza query («/giorni/d1»). */
export const percorsoAttuale = () => '/' + location.hash.replace(/^#?\/?/, '').split('?')[0]

/** La pagina madre di un percorso, o `null` per le schede principali (Oggi, Giorni, Luoghi, Spese, Altro). */
export function genitore(path: string): string | null {
  const p = path.split('?')[0].replace(/\/+$/, '') || '/'
  if (p === '/viaggi') return '/altro'
  const m = p.match(/^\/(giorni|spese|altro|luoghi)\/[^/]+/)
  return m ? `/${m[1]}` : null
}

interface Stato {
  from?: string
}
const statoDi = (s: unknown): Stato => (s && typeof s === 'object' ? (s as Stato) : {})

/**
 * Navigazione dell'app. La query delle rotte (?vista=mappa) sta in location.search: wouter la lascia alla pagina
 * dopo se il nuovo indirizzo non ha «?», quindi qui la si riscrive sempre (vuota se non c'è).
 * Con `push` ricorda la pagina di partenza; con `replace` tiene quella che c'era.
 */
export const navigateClean: typeof hashNavigate = (to, options) => {
  const from = options?.replace ? statoDi(history.state).from : percorsoAttuale()
  hashNavigate(to.includes('?') ? to : `${to}?`, { ...options, state: { ...statoDi(options?.state), from } })
}

/** Sale alla pagina madre: indietro nella cronologia se si arriva da lì, altrimenti la sostituisce a quella attuale. */
export function tornaSu(madre: string): void {
  if (statoDi(history.state).from === madre) history.back()
  else navigateClean(madre, { replace: true })
}
