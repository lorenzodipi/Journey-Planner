// Scelte del dispositivo (#45, #46, #47): notifiche e lingua. Non sono del viaggio: stanno solo su questo telefono.
import { useEffect, useState } from 'react'
import { t } from '../i18n'

export type NotificaTipo = 'tappa' | 'pioggia' | 'checklist' | 'budget' | 'checkin'
export type NotifichePrefs = Record<NotificaTipo, boolean>

const NOTIF_KEY = 'jp.notif.v1'
export const NOTIFICHE_DEFAULT: NotifichePrefs = { tappa: false, pioggia: false, checklist: false, budget: false, checkin: false }

export const NOTIFICHE_TESTI: { tipo: NotificaTipo; titolo: string; testo: string }[] = [
  { tipo: 'tappa', titolo: t('Prossima tappa'), testo: t('Un avviso 30 minuti prima') },
  { tipo: 'pioggia', titolo: t('Pioggia in arrivo'), testo: t('Quando serve l’ombrello') },
  { tipo: 'checklist', titolo: t('Scadenze della checklist'), testo: t('Una settimana prima') },
  { tipo: 'checkin', titolo: t('Check-in online'), testo: t('Quando si apre il check-in di voli e trasporti') },
  { tipo: 'budget', titolo: t('Budget'), testo: t('All’80% e al 100% del limite') },
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

