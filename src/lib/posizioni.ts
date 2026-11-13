// Posizione di scorrimento di ogni pagina. Aprendo una pagina nuova si riparte dall'alto; tornando indietro
// («Indietro» in alto, tasto o gesto di sistema, tasto del browser) la pagina madre si ritrova dov'era.
// Le posizioni stanno solo in memoria: dopo un riavvio dell'app si riparte dall'alto.

const posizioni = new Map<string, number>()
/** Istante dell'ultimo «Indietro»: vale per il prossimo cambio di pagina, non oltre un secondo. */
let ritornoAlle = 0
const FINESTRA_RITORNO_MS = 1000
const TENTATIVI = 40 // ~650 ms: la pagina può ricevere i dati o caricarsi dopo essere comparsa

/** Percorso della pagina senza query («/giorni/d1»). */
const percorso = () => '/' + location.hash.replace(/^#?\/?/, '').split('?')[0]

/** Chiamata quando si sta tornando indietro (bottone, tasto di sistema, cronologia del browser). */
export function segnaRitorno(adesso = Date.now()): void {
  ritornoAlle = adesso
}

/** Vero se il cambio di pagina in corso è un «Indietro»; consuma il segnale. */
export function eUnRitorno(adesso = Date.now()): boolean {
  const si = ritornoAlle > 0 && adesso - ritornoAlle <= FINESTRA_RITORNO_MS
  ritornoAlle = 0
  return si
}

export function ricordaPosizione(path: string, y: number): void {
  posizioni.set(path, Math.max(0, Math.round(y)))
}

export function posizioneDi(path: string): number {
  return posizioni.get(path) ?? 0
}

/** Ascolta lo scorrimento e la cronologia del browser. Restituisce la funzione che toglie gli ascoltatori. */
export function seguiPosizioni(): () => void {
  const alloScroll = () => ricordaPosizione(percorso(), window.scrollY)
  const allaCronologia = () => segnaRitorno()
  window.addEventListener('scroll', alloScroll, { passive: true })
  window.addEventListener('popstate', allaCronologia)
  return () => {
    window.removeEventListener('scroll', alloScroll)
    window.removeEventListener('popstate', allaCronologia)
  }
}

/**
 * Porta la pagina a `y` (0 = in cima). Se la pagina non è ancora abbastanza alta riprova per un attimo; si ferma
 * se la persona tocca o scorre. Restituisce la funzione che annulla i tentativi.
 */
export function vaiA(y: number): () => void {
  const vai = () => window.scrollTo({ top: y, left: 0, behavior: 'instant' })
  vai()
  if (y <= 0 || Math.abs(window.scrollY - y) <= 1) return () => {}
  let frame = 0
  let n = 0
  const ferma = () => {
    cancelAnimationFrame(frame)
    for (const e of EVENTI_UTENTE) window.removeEventListener(e, ferma, true)
  }
  const passo = () => {
    vai()
    if (Math.abs(window.scrollY - y) <= 1 || ++n >= TENTATIVI) return ferma()
    frame = requestAnimationFrame(passo)
  }
  for (const e of EVENTI_UTENTE) window.addEventListener(e, ferma, { capture: true, passive: true })
  frame = requestAnimationFrame(passo)
  return ferma
}
const EVENTI_UTENTE = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const

/** Cambio di pagina: se si torna indietro ritrova la posizione che la pagina aveva, altrimenti riparte dall'alto. */
export function alCambioDiPagina(): () => void {
  return vaiA(eUnRitorno() ? posizioneDi(percorso()) : 0)
}
