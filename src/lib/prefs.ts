// Scelte del dispositivo (#45, #46, #47): notifiche e lingua. Non sono del viaggio: stanno solo su questo telefono.
import { useEffect, useState } from 'react'

export type NotificaTipo = 'tappa' | 'pioggia' | 'checklist' | 'budget' | 'checkin'
export type NotifichePrefs = Record<NotificaTipo, boolean>

const NOTIF_KEY = 'jp.notif.v1'
export const NOTIFICHE_DEFAULT: NotifichePrefs = { tappa: false, pioggia: false, checklist: false, budget: false, checkin: false }

export const NOTIFICHE_TESTI: { tipo: NotificaTipo; titolo: string; testo: string }[] = [
  { tipo: 'tappa', titolo: 'Prossima tappa', testo: 'Un avviso 30 minuti prima' },
  { tipo: 'pioggia', titolo: 'Pioggia in arrivo', testo: 'Quando serve l’ombrello' },
  { tipo: 'checklist', titolo: 'Scadenze della checklist', testo: 'Una settimana prima' },
  { tipo: 'checkin', titolo: 'Check-in online', testo: 'Quando si apre il check-in di voli e trasporti' },
  { tipo: 'budget', titolo: 'Budget', testo: 'All’80% e al 100% del limite' },
]

export function leggiNotifiche(): NotifichePrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '{}') as Partial<NotifichePrefs>
    return { ...NOTIFICHE_DEFAULT, ...Object.fromEntries(Object.entries(raw).filter(([k, v]) => k in NOTIFICHE_DEFAULT && typeof v === 'boolean')) }
  } catch {
    return { ...NOTIFICHE_DEFAULT }
  }
}

const listeners = new Set<(p: NotifichePrefs) => void>()

export function scriviNotifiche(p: NotifichePrefs): void {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(p))
  } catch {
    // ignorato: la scelta vale finché l'app resta aperta
  }
  listeners.forEach((l) => l(p))
}

export function useNotifichePrefs(): [NotifichePrefs, (tipo: NotificaTipo, on: boolean) => void] {
  const [prefs, setPrefs] = useState<NotifichePrefs>(leggiNotifiche)
  useEffect(() => {
    listeners.add(setPrefs)
    return () => void listeners.delete(setPrefs)
  }, [])
  return [prefs, (tipo, on) => scriviNotifiche({ ...leggiNotifiche(), [tipo]: on })]
}

/** Lingue dell'interfaccia: aggiungerne una = aggiungere un file in `src/i18n` (#47). Per ora solo l'italiano. */
export const LINGUE: { code: string; nome: string }[] = [{ code: 'it', nome: 'Italiano' }]
