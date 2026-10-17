import type { ThemeName } from '../types'
import type { TripInput } from './tripApi'

export const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 }

export interface Preset {
  id: string
  label: string
  destination: string
  timezone: string
  theme: ThemeName
  localCurrency: string
  center: { lat: number; lng: number }
}

// Punti di partenza per un nuovo viaggio: tema, fuso, valuta e centro mappa.
// Tutto resta modificabile. La ricerca luoghi (Sprint 2) calcolerà il centro dalla destinazione.
export const PRESETS: Preset[] = [
  { id: 'japan', label: 'Giappone', destination: 'Giappone', timezone: 'Asia/Tokyo', theme: 'japan', localCurrency: 'JPY', center: { lat: 35.6812, lng: 139.7671 } },
  { id: 'iceland', label: 'Islanda', destination: 'Islanda', timezone: 'Atlantic/Reykjavik', theme: 'iceland', localCurrency: 'ISK', center: { lat: 64.1466, lng: -21.9426 } },
  { id: 'other', label: 'Altro', destination: '', timezone: 'Europe/Rome', theme: 'default', localCurrency: '', center: DEFAULT_CENTER },
]

export const TRAVELER_COLORS = ['#c8402f', '#264653', '#2a9d8f', '#e9a23b', '#7b5ea7', '#3a86c8']

export const THEME_LABELS: Record<ThemeName, string> = {
  default: 'Neutro',
  japan: 'Giappone',
  iceland: 'Islanda',
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return tz.trim().length > 0
  } catch {
    return false
  }
}

const YMD = /^\d{4}-\d{2}-\d{2}$/

/** Ritorna il messaggio d'errore da mostrare, oppure null se i dati sono validi. */
export function validateTrip(input: TripInput): string | null {
  if (!input.title.trim()) return 'Dai un nome al viaggio.'
  if (!YMD.test(input.startDate) || !YMD.test(input.endDate)) return 'Scegli le date di inizio e di fine.'
  if (input.endDate < input.startDate) return 'La data di fine non può essere prima di quella di inizio.'
  if (!isValidTimezone(input.timezone)) return 'Il fuso orario non è valido (esempio: Asia/Tokyo).'
  if (input.localCurrency && !/^[A-Za-z]{3}$/.test(input.localCurrency.trim())) {
    return 'La valuta locale è un codice di 3 lettere (esempio: JPY).'
  }
  if (!/^[A-Za-z]{3}$/.test(input.baseCurrency.trim())) return 'La valuta base è un codice di 3 lettere (esempio: EUR).'
  return null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface PersonDraft {
  email: string
  name: string
}

/** Nome di partenza per chi viene aggiunto con la sola email: la parte prima della chiocciola. */
export function nameFromEmail(email: string): string {
  const local = email.trim().split('@')[0] ?? ''
  const clean = local.replace(/[._-]+/g, ' ').trim()
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : ''
}

/**
 * Chi viaggia: il proprio nome più gli altri, che vanno scritti con l'email di un account esistente
 * (niente persone inventate). Righe vuote ignorate, email in minuscolo, doppioni rifiutati.
 */
export function cleanPeople(
  selfName: string,
  others: PersonDraft[],
  ownEmail?: string,
): { self: string; others: PersonDraft[]; error: string | null } {
  const self = selfName.trim()
  const out: PersonDraft[] = []
  const fail = (error: string) => ({ self, others: out, error })
  if (!self) return fail('Scrivi il tuo nome.')

  const seen = new Set<string>(ownEmail ? [ownEmail.trim().toLowerCase()] : [])
  const names = new Set<string>([self.toLowerCase()])
  for (const o of others) {
    const email = o.email.trim().toLowerCase()
    const name = o.name.trim()
    if (!email && !name) continue
    if (!email) return fail('Per ogni persona serve l’email del suo account.')
    if (!EMAIL.test(email)) return fail(`«${o.email.trim()}» non è un indirizzo email valido.`)
    if (seen.has(email)) return fail(`«${email}» compare due volte (o sei tu).`)
    seen.add(email)
    const label = name || nameFromEmail(email)
    if (names.has(label.toLowerCase())) return fail(`Due persone si chiamano «${label}»: cambia uno dei nomi.`)
    names.add(label.toLowerCase())
    out.push({ email, name: label })
  }
  return { self, others: out, error: null }
}
