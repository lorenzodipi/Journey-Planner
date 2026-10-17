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

/** Nomi dei viaggiatori: tolti vuoti e spazi, controllati i doppioni. */
export function cleanTravelerNames(names: string[]): { names: string[]; error: string | null } {
  const cleaned = names.map((n) => n.trim()).filter(Boolean)
  if (cleaned.length === 0) return { names: [], error: 'Aggiungi almeno un viaggiatore.' }
  const lower = cleaned.map((n) => n.toLowerCase())
  if (new Set(lower).size !== lower.length) return { names: cleaned, error: 'Due viaggiatori hanno lo stesso nome.' }
  return { names: cleaned, error: null }
}
