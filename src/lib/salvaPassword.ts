// Gestore delle password del telefono, nell'app Android (plugin SalvaPassword, android/app/src/main/java/.../SalvaPassword.java).
// Dopo l'accesso propone di salvare email e password: nella WebView il riquadro di Android non compare da solo
// (l'accesso non cambia pagina). Alla pagina di accesso apre il riquadro con le password salvate: il suggerimento
// sulla tastiera non le propone, perché nella WebView i campi sono di «localhost» e non dell'app.
// Sul sito ci pensa il browser; su iOS serve un dominio associato all'app, che con SideStore non si può avere
// (docs/APP_NATIVA.md).
import { Capacitor, registerPlugin } from '@capacitor/core'

interface SalvaPasswordPlugin {
  salva(opzioni: { username: string; password: string }): Promise<{ salvata: boolean }>
  recupera(): Promise<{ trovata: boolean; username?: string; password?: string }>
}

const plugin = registerPlugin<SalvaPasswordPlugin>('SalvaPassword')

/** Vero solo nell'app Android con il plugin presente (una versione vecchia dell'app non ce l'ha). */
export function puoSalvarePassword(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('SalvaPassword')
}

/** Propone di salvare la password; se l'utente dice di no o qualcosa non va, non succede niente. */
export async function proponiSalvaPassword(username: string, password: string): Promise<void> {
  if (!puoSalvarePassword() || !username || !password) return
  try {
    await plugin.salva({ username, password })
  } catch {
    // ignorato: salvare la password è un di più
  }
}

/** Apre il riquadro di Android con le password salvate per l'app; null se non ce ne sono o se viene chiuso. */
export async function chiediPasswordSalvata(): Promise<{ email: string; password: string } | null> {
  if (!puoSalvarePassword()) return null
  try {
    const r = await plugin.recupera()
    return r.trovata && r.username && r.password ? { email: r.username, password: r.password } : null
  } catch {
    // app di prima, senza «recupera»: si scrive a mano
    return null
  }
}
