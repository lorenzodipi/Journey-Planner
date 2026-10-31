// Formato data/ora e unità (#63, SET-002/003): scelte del dispositivo, non del viaggio.
import { useEffect, useState } from 'react'

export interface FormatiPrefs {
  ore: 24 | 12
  distanza: 'km' | 'mi'
  temperatura: 'C' | 'F'
}
export const FORMATI_DEFAULT: FormatiPrefs = { ore: 24, distanza: 'km', temperatura: 'C' }
const KEY = 'jp.formati.v1'
const RIF_KEY = 'jp.riferimento.v1'

export function leggiFormati(): FormatiPrefs {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<FormatiPrefs>
    return {
      ore: r.ore === 12 ? 12 : 24,
      distanza: r.distanza === 'mi' ? 'mi' : 'km',
      temperatura: r.temperatura === 'F' ? 'F' : 'C',
    }
  } catch {
    return { ...FORMATI_DEFAULT }
  }
}

let corrente = leggiFormati()
const ascoltatori = new Set<(p: FormatiPrefs) => void>()

export function scriviFormati(p: FormatiPrefs): void {
  corrente = p
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // vale finché l'app resta aperta
  }
  ascoltatori.forEach((l) => l(p))
}

export function useFormati(): [FormatiPrefs, (p: Partial<FormatiPrefs>) => void] {
  const [p, setP] = useState(corrente)
  useEffect(() => {
    ascoltatori.add(setP)
    return () => void ascoltatori.delete(setP)
  }, [])
  return [p, (n) => scriviFormati({ ...corrente, ...n })]
}

/** «14:30» → «2:30 PM» se l'ora è a 12 ore; altrimenti invariata. Accetta anche stringhe non orarie. */
export function ora(hhmm: string | undefined | null, p: FormatiPrefs = corrente): string {
  if (!hhmm) return ''
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  if (!m || p.ore === 24) return hhmm
  const h = Number(m[1])
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

/** Gradi nell'unità scelta, senza il simbolo «°». */
export function gradiNum(c: number, p: FormatiPrefs = corrente): number {
  return Math.round(p.temperatura === 'F' ? (c * 9) / 5 + 32 : c)
}
export const gradi = (c: number, p: FormatiPrefs = corrente) => `${gradiNum(c, p)}°`

/** Distanza in metri → «850 m» / «1,2 km» o «0,5 mi» / «2 mi». */
export function distanza(m: number, p: FormatiPrefs = corrente): string {
  if (p.distanza === 'mi') {
    const mi = m / 1609.344
    if (mi < 0.1) return `${Math.max(10, Math.round((m * 3.28084) / 10) * 10)} ft`
    return `${mi.toLocaleString('it-IT', { maximumFractionDigits: 1 })} mi`
  }
  if (m < 950) return `${Math.max(10, Math.round(m / 10) * 10)} m`
  return `${(m / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} km`
}

/** Località di riferimento scelta a mano per Oggi (HOME-015), per viaggio. */
export function leggiRiferimento(tripId: string): string | null {
  try {
    return (JSON.parse(localStorage.getItem(RIF_KEY) ?? '{}') as Record<string, string>)[tripId] ?? null
  } catch {
    return null
  }
}
const rifAscoltatori = new Set<() => void>()
export function scriviRiferimento(tripId: string, citta: string | null): void {
  try {
    const all = JSON.parse(localStorage.getItem(RIF_KEY) ?? '{}') as Record<string, string>
    if (citta) all[tripId] = citta
    else delete all[tripId]
    localStorage.setItem(RIF_KEY, JSON.stringify(all))
  } catch {
    // ignorato
  }
  rifAscoltatori.forEach((l) => l())
}
export function useRiferimento(tripId: string): [string | null, (c: string | null) => void] {
  const [c, setC] = useState(() => leggiRiferimento(tripId))
  useEffect(() => {
    const l = () => setC(leggiRiferimento(tripId))
    rifAscoltatori.add(l)
    l()
    return () => void rifAscoltatori.delete(l)
  }, [tripId])
  return [c, (n) => scriviRiferimento(tripId, n)]
}
