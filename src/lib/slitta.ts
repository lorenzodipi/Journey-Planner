// «Slitta» (al posto dello stato «In ritardo»): quando una tappa di oggi è iniziata da più di 15 minuti ed è ancora da fare,
// la card offre di spostarne l'orario in avanti (da adesso, +15 min, +30 min, +1 h) e, se si vuole, anche quello delle
// tappe dopo. Le tappe con l'orario vincolato o legate a una prenotazione a ora fissa restano dove sono; quelle senza
// orario o già chiuse non si toccano. Nessun cambio automatico: decide chi usa l'app.

import { hhmm, isClosed, statusOf, toMin } from './tappa'
import { prenotazioniFisse } from './vincoli'
import type { DayItem, Trip } from '../types'

export interface Slittamento {
  id: string
  title: string
  prima: string
  dopo: string
  /** orario di fine spostato con l'inizio, se la tappa ne ha uno */
  fine?: { prima: string; dopo: string }
}

export interface Ferma {
  id: string
  title: string
  ora: string
}

export interface PianoSlitta {
  /** le tappe che si spostano, la prima è quella scelta */
  cambi: Slittamento[]
  /** le tappe dopo che restano al loro orario (vincolate o prenotate) */
  ferme: Ferma[]
  /** di quanti minuti */
  minuti: number
}

/** La tappa ha l'orario fissato: vincolato a mano (0032) o legato a una prenotazione a ora fissa. */
export function orarioFisso(trip: Trip, item: DayItem): boolean {
  return item.timeLock === 'locked' || prenotazioniFisse(trip, item.id).length > 0
}

/** «Slitta» si offre: oggi, tappa da fare con orario, iniziata da più di 15 minuti, orario non fissato. */
export function puoSlittare(trip: Trip, item: DayItem, ctx: { isToday: boolean; nowMin: number }): boolean {
  if (!ctx.isToday || statusOf(item) !== 'todo' || orarioFisso(trip, item)) return false
  const s = toMin(item.time)
  return s !== null && ctx.nowMin > s + 15
}

/** Minuti passati dall'inizio della tappa (per «iniziava 25 min fa»), o null. */
export function minutiDiRitardo(item: DayItem, nowMin: number): number | null {
  const s = toMin(item.time)
  return s === null ? null : Math.max(0, nowMin - s)
}

/** Le scelte del foglio: «Da adesso» (se l'ora attuale è dopo l'inizio) e +15, +30, +60 che finiscono dopo adesso, senza passare la mezzanotte. */
export function scelteSlitta(item: DayItem, nowMin: number): { minuti: number; da: 'adesso' | 'piu' }[] {
  const s = toMin(item.time)
  if (s === null) return []
  const ultimo = toMin(item.endTime)
  const coda = ultimo !== null && ultimo > s ? ultimo - s : 0
  const sta = (m: number) => m > 0 && s + m + coda <= 23 * 60 + 59
  const out: { minuti: number; da: 'adesso' | 'piu' }[] = []
  if (sta(nowMin - s)) out.push({ minuti: nowMin - s, da: 'adesso' })
  // +15, +30, +1 h solo se portano la tappa dopo adesso: se no resterebbe comunque in ritardo
  for (const m of [15, 30, 60]) if (sta(m) && s + m > nowMin) out.push({ minuti: m, da: 'piu' })
  return out
}

const sposta = (t: string, m: number) => hhmm((toMin(t) as number) + m)

/**
 * Cosa cambia slittando `item` di `minuti`: la tappa e, con `ancheDopo`, le tappe da fare con orario che vengono dopo nel
 * giorno (non vincolate né prenotate). Una tappa che finirebbe dopo la mezzanotte resta dov'è.
 */
export function pianoSlitta(trip: Trip, items: readonly DayItem[], item: DayItem, minuti: number, ancheDopo: boolean): PianoSlitta {
  const cambi: Slittamento[] = []
  const ferme: Ferma[] = []
  const conta = (i: DayItem) => {
    const s = toMin(i.time)
    if (s === null) return null
    const e = toMin(i.endTime)
    if ((e !== null && e > s ? e : s) + minuti > 23 * 60 + 59) return null
    return {
      id: i.id,
      title: i.title,
      prima: (i.time as string).slice(0, 5),
      dopo: sposta(i.time as string, minuti),
      ...(e !== null && e > s ? { fine: { prima: (i.endTime as string).slice(0, 5), dopo: sposta(i.endTime as string, minuti) } } : {}),
    }
  }
  const primo = conta(item)
  if (primo) cambi.push(primo)
  if (ancheDopo) {
    const da = items.findIndex((i) => i.id === item.id)
    const inizio = toMin(item.time) ?? -1
    for (const i of items.slice(da + 1)) {
      const s = toMin(i.time)
      if (s === null || isClosed(i) || s < inizio) continue
      if (orarioFisso(trip, i)) {
        ferme.push({ id: i.id, title: i.title, ora: (i.time as string).slice(0, 5) })
        continue
      }
      const c = conta(i)
      if (c) cambi.push(c)
      else ferme.push({ id: i.id, title: i.title, ora: (i.time as string).slice(0, 5) })
    }
  }
  return { cambi, ferme, minuti }
}

/** Gli orari di prima, per «Annulla». */
export function annullaSlitta(p: PianoSlitta): { id: string; start: string; end: string | null }[] {
  return p.cambi.map((c) => ({ id: c.id, start: c.prima, end: c.fine?.prima ?? null }))
}

/** Gli orari nuovi da salvare. */
export function orariSlitta(p: PianoSlitta): { id: string; start: string; end: string | null }[] {
  return p.cambi.map((c) => ({ id: c.id, start: c.dopo, end: c.fine?.dopo ?? null }))
}
