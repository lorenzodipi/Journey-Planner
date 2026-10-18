// Tasto/gesto "indietro" dell'app Android. Capacitor non lo gestisce da solo: senza questo
// il gesto non fa nulla o chiude l'app. Si importa SOLO dentro `if (__NATIVE__)`.
import { App } from '@capacitor/app'
import { topDialog } from '../ui/dialogStack'

const isHome = () => {
  const h = location.hash.replace(/^#/, '')
  return h === '' || h === '/'
}

export function setupNativeBack(): void {
  void App.addListener('backButton', () => {
    // 1) un pannello aperto (nuova tappa, modifica…) si chiude per primo
    // (il più in alto è quello aperto per ultimo: una conferma o un selettore si chiudono prima del pannello sotto)
    const top = topDialog()
    if (top) {
      top.close()
      return
    }
    // 2) altrimenti torna alla pagina precedente; se non ce n'è, va a "Oggi"
    if (!isHome()) {
      const before = location.hash
      history.back()
      setTimeout(() => {
        if (location.hash === before) location.hash = '#/'
      }, 200)
      return
    }
    // 3) già su "Oggi": esce dall'app
    void App.exitApp()
  })
}
