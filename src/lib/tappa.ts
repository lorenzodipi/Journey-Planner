// Tappe del giorno (#32): registro degli stati, riepilogo, spostamenti stimati tra tappe,
// testi della card aperta. Tutto puro: si prova nei test.
import { distanceM, transportBetween, type TransportLine } from './dayRoute'
import { itemDuration } from './duration'
import type { DayItem, ItemStatus, Place } from '../types'
import { comeCiSiMuove, durata, impostazioniViaggio, spostamento, type Impostazioni, type Spostamento } from './spostamenti'

export interface TappaStato {
  value: ItemStatus
  label: string
  hint: string
  /** classe del cerchio nel menu (s-todo, s-done…) */
  cls: string
  /** simbolo del glifo */
  icon: string
}

/** Registro degli stati: aggiungerne uno è una riga (compare nel menu, che scorre dopo sei voci). */
export const TAPPA_STATI: TappaStato[] = [
  { value: 'todo', label: 'Da fare', hint: 'Non ancora iniziata', cls: 's-todo', icon: 'g-clock' },
  { value: 'done', label: 'Fatta', hint: 'Completata', cls: 's-done', icon: 'g-check' },
  { value: 'skipped', label: 'Saltata', hint: 'Non la farete', cls: 's-skip', icon: 'g-minus' },
  { value: 'late', label: 'In ritardo', hint: 'Slitta rispetto al programma', cls: 's-late', icon: 'g-clock' },
  { value: 'postponed', label: 'Rimandata', hint: 'Spostata a un altro giorno', cls: 's-moved', icon: 'g-pencil' },
  { value: 'cancelled', label: 'Annullata', hint: 'Il luogo è chiuso o la prenotazione è saltata', cls: 's-cancel', icon: 'g-close' },
]

export const statoOf = (s: ItemStatus | undefined): TappaStato => TAPPA_STATI.find((x) => x.value === (s ?? 'todo')) ?? TAPPA_STATI[0]

/** Stato effettivo (le tappe vecchie hanno solo `done`). */
export const statusOf = (i: Pick<DayItem, 'status' | 'done'>): ItemStatus => i.status ?? (i.done ? 'done' : 'todo')

const CLOSED: ItemStatus[] = ['done', 'skipped', 'cancelled', 'postponed']
export const isClosed = (i: Pick<DayItem, 'status' | 'done'>) => CLOSED.includes(statusOf(i))

export const toMin = (hhmm: string | undefined): number | null => {
  if (!hhmm || !/^\d{2}:\d{2}/.test(hhmm)) return null
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
}
export const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Durata leggibile: «45 min», «1 h 30», «2 h». */
export { durata }

/** Fine prevista della tappa (minuti dalla mezzanotte), da ora di fine o durata. */
export function endMin(item: DayItem, place: Pick<Place, 'visitMinutes'> | undefined): number | null {
  const s = toMin(item.time)
  if (s === null) return null
  const e = toMin(item.endTime)
  if (e !== null && e > s) return e
  const d = itemDuration(item, place)
  return d ? s + d : null
}

export type Fase = 'done' | 'skip' | 'now' | 'next' | 'past'

/**
 * Posizione della tappa rispetto all'ora attuale (solo nel giorno di oggi, solo dagli orari: niente GPS).
 * `now` = l'intervallo contiene l'ora attuale; `next` = futura; `past` = da fare ma già passata.
 */
export function fase(item: DayItem, place: Pick<Place, 'visitMinutes'> | undefined, ctx: { isToday: boolean; isPast: boolean; nowMin: number }): Fase {
  const st = statusOf(item)
  if (st === 'done') return 'done'
  if (st === 'skipped' || st === 'cancelled' || st === 'postponed') return 'skip'
  if (ctx.isPast) return 'past'
  if (!ctx.isToday) return 'next'
  const s = toMin(item.time)
  if (s === null) return 'next'
  const e = endMin(item, place) ?? s + 1
  if (ctx.nowMin >= s && ctx.nowMin < e) return 'now'
  return ctx.nowMin < s ? 'next' : 'past'
}

/** Suggerimento «In ritardo?»: oggi, passati 15 min dall'inizio, ancora da fare. Nessun cambio automatico. */
export function forseInRitardo(item: DayItem, ctx: { isToday: boolean; nowMin: number }): boolean {
  if (!ctx.isToday || statusOf(item) !== 'todo') return false
  const s = toMin(item.time)
  return s !== null && ctx.nowMin > s + 15
}

/** «2 di 5 tappe chiuse · 1 saltata» e «Prossima: 15:30». */
export function riepilogo(items: DayItem[], ctx: { isToday: boolean; nowMin: number }): { line: string; next: string | null; closed: number; total: number } {
  const total = items.length
  const closed = items.filter(isClosed).length
  const skipped = items.filter((i) => statusOf(i) === 'skipped').length
  const cancelled = items.filter((i) => statusOf(i) === 'cancelled').length
  const parts = [`${closed} di ${total} ${total === 1 ? 'tappa chiusa' : 'tappe chiuse'}`]
  if (skipped) parts.push(`${skipped} ${skipped === 1 ? 'saltata' : 'saltate'}`)
  if (cancelled) parts.push(`${cancelled} ${cancelled === 1 ? 'annullata' : 'annullate'}`)
  const upcoming = items.filter((i) => !isClosed(i) && toMin(i.time) !== null && (!ctx.isToday || (toMin(i.time) as number) > ctx.nowMin))
  const next = upcoming.sort((a, b) => (toMin(a.time) as number) - (toMin(b.time) as number))[0]
  return { line: parts.join(' · '), next: next?.time ?? null, closed, total }
}

// ---------------------------------------------------------------- spostamenti

export type { Spostamento } from './spostamenti'

/**
 * Spostamento tra due posizioni con le impostazioni del viaggio (lib/spostamenti.ts): a piedi i tratti brevi, poi il mezzo
 * del viaggio («Con i mezzi» se non è scelto). Se tra le due tappe c'è un trasporto inserito, si usa quello.
 */
export function stimaSpostamento(a: { lat: number; lng: number }, b: { lat: number; lng: number }, transports: TransportLine[] = [], imp: Impostazioni = impostazioniViaggio({})): Spostamento {
  const via = transportBetween(a, b, transports)
  return spostamento(distanceM(a, b), { via: via?.mode, imp })
}

/** «5 tappe · 7,4 km» e «1 h 35 tra autobus e a piedi» dalla somma degli spostamenti. */
export function riepilogoPercorso(stops: number, legs: Spostamento[]): { title: string; sub: string } {
  const km = legs.reduce((s, l) => s + l.meters, 0) / 1000
  const mins = legs.reduce((s, l) => s + l.minutes, 0)
  const how = comeCiSiMuove(legs.map((l) => l.mode))
  const kmText = km.toLocaleString('it-IT', { maximumFractionDigits: 1, minimumFractionDigits: km < 10 ? 1 : 0 })
  return { title: `${stops} ${stops === 1 ? 'tappa' : 'tappe'}${legs.length ? ` · ${kmText} km` : ''}`, sub: legs.length ? `${durata(mins)} ${how}`.trim() : '' }
}

// ---------------------------------------------------------------- testi della card aperta

const clock = (iso: string, timeZone: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(new Date(iso))

/** Prima riga della card aperta (orario) e seconda riga (quando / come è andata). */
export function rigaOrario(item: DayItem, place: Pick<Place, 'visitMinutes'> | undefined, ctx: { isToday: boolean; nowMin: number; timeZone: string }): { main: string; sub: string | null } | null {
  const s = toMin(item.time)
  const e = endMin(item, place)
  const st = statusOf(item)
  const range = s !== null ? (e !== null ? `${hhmm(s)} – ${hhmm(e)}` : hhmm(s)) : null
  if (st === 'done' && item.statusChangedAt) {
    const at = clock(item.statusChangedAt, ctx.timeZone)
    const doneMin = toMin(at) as number
    const planned = e !== null && s !== null ? e - s : null
    let sub: string | null = null
    if (s !== null && planned) {
      const actual = doneMin - s
      const diff = actual - planned
      sub = Math.abs(diff) <= 5 ? `${durata(planned)}, come previsto` : `${durata(Math.abs(diff))} ${diff > 0 ? 'più' : 'meno'} del previsto`
    }
    return { main: `Fatta alle ${at}`, sub }
  }
  if ((st === 'skipped' || st === 'cancelled') && item.statusChangedAt) {
    return { main: s !== null ? `Era previsto alle ${hhmm(s)}` : statoOf(st).label, sub: `${statoOf(st).label} alle ${clock(item.statusChangedAt, ctx.timeZone)}` }
  }
  if (!range) return null
  if (ctx.isToday && s !== null && s > ctx.nowMin) return { main: range, sub: `Tra ${durata(s - ctx.nowMin)}` }
  return { main: range, sub: null }
}
