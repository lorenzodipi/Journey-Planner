// Partecipanti e inviti (#44, FRD TRIP-004/005/006/013): stati, validazione e testi.
import type { StatoInvito, Traveler, Trip, TripInvite } from '../types'
import { t } from '../i18n'

export const STATO_INVITO: Record<StatoInvito, string> = { inviato: t('Inviato'), accettato: t('Accettato'), rifiutato: t('Rifiutato'), scaduto: t('Scaduto') }

/** «Scaduto» anche se il server non ha ancora aggiornato la riga: un invito aperto dopo i 7 giorni non vale più. */
export function statoInvito(i: Pick<TripInvite, 'status' | 'expiresAt'>, now: Date = new Date()): StatoInvito {
  return i.status === 'inviato' && Date.parse(i.expiresAt) < now.getTime() ? 'scaduto' : i.status
}

/** Controlla l'email di un invito: formato, già partecipante, già invitata e in attesa. `null` se va bene. */
export function erroreInvito(emailRaw: string, trip: Pick<Trip, 'travelers' | 'invites' | 'viewers'>, now: Date = new Date()): string | null {
  const email = emailRaw.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t('Scrivi un indirizzo email valido.')
  if (trip.travelers.some((p) => p.email?.toLowerCase() === email)) return t('Questa persona è già nel viaggio.')
  if ((trip.viewers ?? []).some((v) => v.email?.toLowerCase() === email)) return t('Questa persona vede già il viaggio.')
  if ((trip.invites ?? []).some((i) => i.email === email && statoInvito(i, now) === 'inviato')) return t('Hai già invitato questo indirizzo: aspetta che risponda o annulla l’invito.')
  return null
}

/** Ruolo mostrato a destra della persona. */
export const ruoloTesto = (p: Pick<Traveler, 'role'>): string => (p.role === 'owner' ? t('Creatore') : p.role ? t('Partecipante') : '')

/** Numero complessivo: «3 persone» (+ «1 invito in attesa»). */
export function riepilogoPartecipanti(trip: Pick<Trip, 'travelers' | 'invites' | 'viewers'>, now: Date = new Date()): string {
  const n = trip.travelers.length
  const v = trip.viewers?.length ?? 0
  const att = (trip.invites ?? []).filter((i) => statoInvito(i, now) === 'inviato').length
  return `${n} ${n === 1 ? t('persona') : t('persone')}${v ? ` · ${v} ${v === 1 ? t('visualizzatore') : t('visualizzatori')}` : ''}${att ? ` · ${att} ${att === 1 ? t('invito in attesa') : t('inviti in attesa')}` : ''}`
}

/** Inviti da mostrare: prima quelli in attesa, poi gli altri dal più recente; gli accettati sono già tra le persone. */
export function invitiVisibili(trip: Pick<Trip, 'invites'>, now: Date = new Date()): (TripInvite & { stato: StatoInvito })[] {
  return (trip.invites ?? [])
    .map((i) => ({ ...i, stato: statoInvito(i, now) }))
    .filter((i) => i.stato !== 'accettato')
    .sort((a, b) => (a.stato === 'inviato' ? 0 : 1) - (b.stato === 'inviato' ? 0 : 1) || b.createdAt.localeCompare(a.createdAt))
}

/** «Scade tra 3 giorni» / «Scade domani» / «Scade oggi». */
export function scadenzaTesto(expiresAt: string, now: Date = new Date()): string {
  const g = Math.ceil((Date.parse(expiresAt) - now.getTime()) / 86_400_000)
  return g <= 0 ? t('Scade oggi') : g === 1 ? t('Scade domani') : t('Scade tra {g} giorni', { g })
}
