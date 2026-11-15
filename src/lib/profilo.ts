// Profilo (#45, mock Fa-47): numeri e distintivi calcolati dai dati, senza tabelle nuove.
import { countryByCode } from './countries'
import type { Trip } from '../types'
import { t as tt } from '../i18n'

export interface NumeriProfilo {
  viaggi: number
  luoghi: number
  paesi: number
  cibo: number
}

const CIBO = /cibo|ristorant|trattoria|osteria|pizzer|street ?food|food|caff|bar\b|dolci/i

/** Paesi distinti dei viaggi (dai paesi del viaggio #35; senza, dalla destinazione). */
export function paesiVisitati(trips: readonly Pick<Trip, 'countries' | 'destination'>[]): string[] {
  const set = new Set<string>()
  for (const t of trips) {
    const codes = (t.countries ?? []).map((c) => c.country.toUpperCase()).filter(Boolean)
    if (codes.length) codes.forEach((c) => set.add(c))
    else if (t.destination.trim()) set.add(t.destination.trim().toLowerCase())
  }
  return [...set]
}

export function numeriProfilo(trips: readonly Trip[]): NumeriProfilo {
  const luoghi = trips.reduce((n, t) => n + t.places.filter((p) => p.status === 'done').length, 0)
  const cibo = trips.reduce(
    (n, t) => n + t.places.filter((p) => p.status === 'done' && CIBO.test(p.category)).length + t.days.reduce((m, d) => m + d.items.filter((i) => i.kind === 'meal' && i.status === 'done').length, 0),
    0,
  )
  return { viaggi: trips.length, luoghi, paesi: paesiVisitati(trips).length, cibo }
}

export interface Distintivo {
  id: 'esploratore' | 'curioso' | 'buongustaio'
  titolo: string
  regola: string
  have: number
  need: number
  preso: boolean
  /** «Ti mancano 2 paesi» */
  mancano: string
}

const manca = (n: number, one: string, many: string) => tt('Ti {v0} {n} {v2}', { v0: n === 1 ? tt('manca') : tt('mancano'), n, v2: n === 1 ? one : many })

export function distintivi(n: NumeriProfilo): Distintivo[] {
  const mk = (id: Distintivo['id'], titolo: string, regola: string, have: number, need: number, one: string, many: string): Distintivo => ({
    id,
    titolo,
    regola,
    have: Math.min(have, need),
    need,
    preso: have >= need,
    mancano: have >= need ? tt('Preso') : manca(need - have, one, many),
  })
  return [
    mk('esploratore', tt('Esploratore'), tt('3 paesi diversi'), n.paesi, 3, tt('paese'), tt('paesi')),
    mk('curioso', tt('Curioso'), tt('50 luoghi visitati'), n.luoghi, 50, tt('luogo'), tt('luoghi')),
    mk('buongustaio', tt('Buongustaio'), tt('20 tappe o luoghi di cibo'), n.cibo, 20, tt('tappa'), tt('tappe')),
  ]
}

/** «Viaggiatore dal 2024 · Italia» (anno di creazione dell'account · paese di partenza dell'ultimo viaggio). */
export function sottotitoloProfilo(createdAt: string | undefined, trips: readonly Pick<Trip, 'originCountry' | 'startDate'>[]): string {
  const anno = createdAt && !Number.isNaN(Date.parse(createdAt)) ? new Date(createdAt).getFullYear() : null
  const ultimo = [...trips].filter((t) => t.originCountry).sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
  const paese = ultimo ? countryByCode(ultimo.originCountry)?.name : undefined
  return [anno ? tt('Viaggiatore dal {anno}', { anno }) : tt('Viaggiatore'), paese].filter(Boolean).join(' · ')
}
