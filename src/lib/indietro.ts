// «Indietro» in alto a sinistra e swipe dal bordo: non tornano alla pagina precedente, ma salgono alla
// pagina madre della sezione (es. da un giorno a «Giorni», anche dopo aver scorso tre giorni di fila).
// Per non riempire la cronologia, ogni cambio di pagina ricorda da dove si è arrivati (history.state.from):
// se si arriva proprio dalla madre si torna indietro nella cronologia, altrimenti la si sostituisce.
import { navigate as hashNavigate } from 'wouter/use-hash-location'

/** Percorso attuale senza query («/giorni/d1»). */
export const percorsoAttuale = () => '/' + location.hash.replace(/^#?\/?/, '').split('?')[0]

/** Pagine che si aprono da due schede: «indietro» torna a quella da cui si è arrivati (Budget: da Spese o da Altro). */
const DA_PIU_SCHEDE: Record<string, string[]> = { '/spese/budget': ['/spese', '/altro'] }

/** La pagina madre di un percorso, o `null` per le schede principali (Oggi, Giorni, Luoghi, Spese, Altro).
 *  `da` è la pagina di partenza: per le pagine raggiungibili da due schede decide quale madre usare. */
export function genitore(path: string, da?: string): string | null {
  const p = path.split('?')[0].replace(/\/+$/, '') || '/'
  if (p === '/viaggi') return '/altro'
  const scelte = DA_PIU_SCHEDE[p]
  if (scelte) return da && scelte.includes(da) ? da : scelte[0]
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
  const da = statoDi(history.state).from
  // la madre scritta nella pagina è quella di sempre; se si è arrivati da un'altra scheda valida, si torna lì
  const dove = genitore(percorsoAttuale(), da) ?? madre
  const meta = DA_PIU_SCHEDE[percorsoAttuale()] ? dove : madre
  if (da === meta) history.back()
  else navigateClean(meta, { replace: true })
}
