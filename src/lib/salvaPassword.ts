// Dopo l'accesso, nell'app Android, propone di salvare email e password nel gestore delle password del telefono.
// Nella WebView il riquadro di Android non compare da solo (l'accesso non cambia pagina): lo chiede il plugin
// SalvaPassword (android/app/src/main/java/.../SalvaPassword.java). Sul sito ci pensa il browser; su iOS serve un
// dominio associato all'app, che con SideStore non si può avere (docs/APP_NATIVA.md).
import { Capacitor, registerPlugin } from '@capacitor/core'

interface SalvaPasswordPlugin {
  salva(opzioni: { username: string; password: string }): Promise<{ salvata: boolean }>
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
