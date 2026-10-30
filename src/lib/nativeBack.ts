// Tasto/gesto "indietro" dell'app Android. Capacitor non lo gestisce da solo: senza questo
// il gesto non fa nulla o chiude l'app. Si importa SOLO dentro `if (__NATIVE__)`.
import { App } from '@capacitor/app'
import { topDialog } from '../ui/dialogStack'

const isHome = () => {
  const h = location.hash.replace(/^#/, '')
  return h === '' || h === '/'
}

/**
 * «Indietro» dell'app, uguale per il tasto Android e per lo swipe dal bordo di iOS.
 * Restituisce `false` se non c'è nulla a cui tornare (già su «Oggi», nessun pannello aperto).
 */
export function goBack(): boolean {
  // 1) un pannello aperto (nuova tappa, modifica…) si chiude per primo
  // (il più in alto è quello aperto per ultimo: una conferma o un selettore si chiudono prima del pannello sotto)
  const top = topDialog()
  if (top) {
    top.close()
    return true
  }
  // 2) poi una card aperta in linea si richiude
  if (document.documentElement.hasAttribute('data-card-open')) {
    window.dispatchEvent(new Event('fa:close-card'))
    return true
  }
  // 3) altrimenti torna alla pagina precedente; se non ce n'è, va a "Oggi"
  if (!isHome()) {
    const before = location.hash
    history.back()
    setTimeout(() => {
      if (location.hash === before) location.hash = '#/'
    }, 200)
    return true
  }
  return false
}

export function setupNativeBack(): void {
  void App.addListener('backButton', () => {
    // 3) già su "Oggi": esce dall'app
    if (!goBack()) void App.exitApp()
  })
}
