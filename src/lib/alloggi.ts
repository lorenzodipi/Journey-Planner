// Alloggi (#39): gruppi per città con le notti, orari di check-in/out leggibili, riga della camera.
import { nightsOf } from './stays'
import type { Stay } from '../types'

export interface GruppoCitta {
  city: string
  nights: number
  stays: Stay[]
}

/** «Kyoto · 3 notti»: gli alloggi raggruppati per città, nell'ordine del primo check-in. */
export function perCitta(stays: Stay[]): GruppoCitta[] {
  const out: GruppoCitta[] = []
  for (const s of [...stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.name.localeCompare(b.name, 'it'))) {
    const city = s.city.trim() || 'Senza città'
    const g = out.find((x) => x.city.toLowerCase() === city.toLowerCase())
    if (g) {
      g.stays.push(s)
      g.nights += nightsOf(s)
    } else out.push({ city, nights: nightsOf(s), stays: [s] })
  }
  return out
}

export const notti = (n: number) => `${n} ${n === 1 ? 'notte' : 'notti'}`

const ORA = /^(\d{1,2})[:.](\d{2})$/

/** «15:00» → «dalle 15:00» (check-in) o «entro le 11:00» (check-out); testi già scritti («17:00–22:00», «entro 10:30») restano come sono. */
export function orarioCheck(info: string | undefined, tipo: 'in' | 'out'): string {
  const t = info?.trim() ?? ''
  const m = ORA.exec(t)
  if (!m) return t
  const hhmm = `${m[1].padStart(2, '0')}:${m[2]}`
  return tipo === 'in' ? `dalle ${hhmm}` : `entro le ${hhmm}`
}

/** «4 · Washitsu», «Washitsu», «4» oppure «—». */
export function cameraDi(s: Pick<Stay, 'room' | 'roomType'>): string {
  return [s.room?.trim(), s.roomType?.trim()].filter(Boolean).join(' · ') || '—'
}

/** «Colazione, cena, cucina» in base a ciò che è incluso. */
export function inclusi(s: Pick<Stay, 'breakfast' | 'dinner' | 'kitchen'>): string {
  return [s.breakfast && 'Colazione', s.dinner && 'Cena', s.kitchen && 'Cucina'].filter(Boolean).join(', ')
}
