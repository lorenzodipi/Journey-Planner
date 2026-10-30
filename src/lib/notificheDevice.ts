// Notifiche locali sul dispositivo (#46): permesso, programmazione e tocco. Nell'app Android/iOS usa
// `@capacitor/local-notifications`; sul web la Notification API (gli avvisi futuri partono finché l'app è aperta).
import type { Avviso } from './notifiche'

export type PermessoNotifiche = 'granted' | 'denied' | 'prompt' | 'unsupported'
export type EsitoPermesso = { ok: true } | { ok: false; motivo: string }

const webOk = () => typeof Notification !== 'undefined'

export async function statoPermesso(): Promise<PermessoNotifiche> {
  try {
    if (__NATIVE__) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const r = await LocalNotifications.checkPermissions()
      return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'prompt'
    }
    if (!webOk()) return 'unsupported'
    return Notification.permission === 'default' ? 'prompt' : Notification.permission
  } catch {
    return 'unsupported'
  }
}

/** Chiede il permesso (dopo la spiegazione, solo al primo interruttore). */
export async function attivaNotifica(): Promise<EsitoPermesso> {
  const stato = await statoPermesso()
  if (stato === 'granted') return { ok: true }
  if (stato === 'unsupported') return { ok: false, motivo: 'Questo browser non mostra le notifiche. Sull’iPhone servono l’app o la PWA installata.' }
  if (stato === 'denied') return { ok: false, motivo: 'Le notifiche sono bloccate: riattivale dalle impostazioni del telefono.' }
  try {
    if (__NATIVE__) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const r = await LocalNotifications.requestPermissions()
      return r.display === 'granted' ? { ok: true } : { ok: false, motivo: 'Senza il permesso non posso avvisarti.' }
    }
    const r = await Notification.requestPermission()
    return r === 'granted' ? { ok: true } : { ok: false, motivo: 'Senza il permesso non posso avvisarti.' }
  } catch {
    return { ok: false, motivo: 'Non sono riuscito a chiedere il permesso.' }
  }
}

const timers = new Map<number, ReturnType<typeof setTimeout>>()
let apri: ((route: string) => void) | null = null

function mostraWeb(a: Avviso): void {
  try {
    const n = new Notification(a.title, { body: a.body, tag: String(a.id) })
    n.onclick = () => {
      window.focus()
      apri?.(a.route)
      n.close()
    }
  } catch {
    // Android Chrome vuole il service worker
    void navigator.serviceWorker?.ready.then((r) => r.showNotification(a.title, { body: a.body, tag: String(a.id), data: { route: a.route } }))
  }
}

/** Sostituisce gli avvisi programmati con questi (cancella e riprogramma). */
export async function programma(avvisi: Avviso[]): Promise<void> {
  try {
    if (__NATIVE__) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
      if (avvisi.length) await LocalNotifications.schedule({ notifications: avvisi.map((a) => ({ id: a.id, title: a.title, body: a.body, schedule: { at: a.at, allowWhileIdle: true }, extra: { route: a.route } })) })
      return
    }
    for (const t of timers.values()) clearTimeout(t)
    timers.clear()
    if (!webOk() || Notification.permission !== 'granted') return
    for (const a of avvisi) {
      const ms = a.at.getTime() - Date.now()
      if (ms > 0 && ms < 2_000_000_000) timers.set(a.id, setTimeout(() => mostraWeb(a), ms))
    }
  } catch {
    // le notifiche sono un di più: un errore non deve fermare l'app
  }
}

/** Mostra un avviso adesso (budget). */
export async function mostraOra(a: Avviso): Promise<void> {
  try {
    if (__NATIVE__) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.schedule({ notifications: [{ id: a.id, title: a.title, body: a.body, schedule: { at: new Date(Date.now() + 1500) }, extra: { route: a.route } }] })
    } else if (webOk() && Notification.permission === 'granted') mostraWeb(a)
  } catch {
    // vedi sopra
  }
}

/** Al tocco su una notifica apre la pagina giusta. Restituisce la funzione per smettere di ascoltare. */
export function ascoltaTocchi(navigate: (route: string) => void): () => void {
  apri = navigate
  let handle: { remove: () => Promise<void> } | null = null
  let stop = false
  if (__NATIVE__) {
    void import('@capacitor/local-notifications').then(async ({ LocalNotifications }) => {
      const h = await LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
        const route = (e.notification.extra as { route?: string } | undefined)?.route
        if (route) navigate(route)
      })
      if (stop) void h.remove()
      else handle = h
    })
  }
  return () => {
    stop = true
    apri = null
    void handle?.remove()
  }
}
