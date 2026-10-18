import { dateInZone, formatInZone } from './flights'
import { tzOffsetMinutes, minutesOfDay } from './sun'
import type { Day, DayItem, Trip, TransportMode } from '../types'

// Cosa serve alla schermata "Oggi": giorno corrente nel fuso del viaggio, prossima tappa,
// eventi logistici del giorno (voli, check-in/out, spostamenti) e ora della destinazione.

export const tripToday = (trip: Pick<Trip, 'timezone'>, now: Date = new Date()): string => dateInZone(now.toISOString(), trip.timezone)

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Prossima tappa con un orario: quella in corso (iniziata da meno di un'ora) o la prima ancora da fare. */
export function nextItem(day: Pick<Day, 'items'>, nowMin: number): { item: DayItem; status: 'now' | 'next' } | null {
  const timed = day.items.filter((i) => i.time && !i.done).sort((a, b) => toMin(a.time as string) - toMin(b.time as string))
  for (const item of timed) {
    const start = toMin(item.time as string)
    const end = item.endTime ? toMin(item.endTime) : start + 60
    if (nowMin >= start && nowMin < end) return { item, status: 'now' }
    if (start > nowMin) return { item, status: 'next' }
  }
  return null
}

export interface DayEvent {
  at: string // istante ISO, per ordinare
  time: string // HH:MM nell'ora locale del posto indicato
  title: string
  sub?: string
  // dettagli usati dalla pagina del giorno
  kind?: 'flight' | 'stay' | 'transport'
  endTime?: string // ora di arrivo, nell'ora locale del posto di arrivo
  mode?: TransportMode
  flag?: { text: string; ok: boolean }
  /** L'elemento da cui nasce l'evento: serve per aprirlo e modificarlo dalla pagina del giorno. */
  ref?: { type: 'flight' | 'stay' | 'transport'; id: string }
}

/** Voli, check-in/out e trasporti del giorno `ymd` (giorno di calendario della destinazione). */
export function eventsForDay(trip: Pick<Trip, 'timezone' | 'flights' | 'stays' | 'transports'>, ymd: string): DayEvent[] {
  const out: DayEvent[] = []
  for (const f of trip.flights) {
    for (const leg of f.legs) {
      const code = leg.flightNumber ? `${leg.flightNumber} · ` : ''
      if (dateInZone(leg.departAt, leg.fromTz) === ymd) {
        out.push({ at: leg.departAt, time: formatInZone(leg.departAt, leg.fromTz), title: `Volo da ${leg.from}`, sub: `${code}${leg.from} → ${leg.to}`, kind: 'flight', ref: { type: 'flight', id: f.id }, endTime: formatInZone(leg.arriveAt, leg.toTz) })
      }
      if (dateInZone(leg.arriveAt, leg.toTz) === ymd) {
        out.push({ at: leg.arriveAt, time: formatInZone(leg.arriveAt, leg.toTz), title: `Arrivo a ${leg.to}`, sub: `${code}${leg.from} → ${leg.to}`, kind: 'flight', ref: { type: 'flight', id: f.id } })
      }
    }
  }
  for (const s of trip.stays) {
    // check-in/out non hanno un orario esatto: il check-out va in testa, il check-in in coda, con le indicazioni in sottotitolo
    if (s.checkIn === ymd) out.push({ at: `${ymd}T23:00:00.000Z`, time: '', title: `Check-in · ${s.name}`, sub: s.checkInInfo ?? s.city, kind: 'stay', ref: { type: 'stay', id: s.id } })
    if (s.checkOut === ymd) out.push({ at: `${ymd}T00:00:00.000Z`, time: '', title: `Check-out · ${s.name}`, sub: s.checkOutInfo ?? s.city, kind: 'stay', ref: { type: 'stay', id: s.id } })
  }
  for (const t of trip.transports) {
    if (t.departAt && dateInZone(t.departAt, trip.timezone) === ymd) {
      out.push({
        at: t.departAt,
        time: formatInZone(t.departAt, trip.timezone),
        title: `${t.from} → ${t.to}`,
        sub: t.refCode ? `Codice ${t.refCode}` : undefined,
        kind: 'transport',
        ref: { type: 'transport', id: t.id },
        mode: t.mode,
        endTime: t.arriveAt ? formatInZone(t.arriveAt, trip.timezone) : undefined,
        flag: t.bought ? { text: 'Biglietto acquistato', ok: true } : { text: 'Biglietto non acquistato', ok: false },
      })
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at))
}

/** Ora locale della destinazione e scarto in ore rispetto al fuso del dispositivo (0 = stesso fuso). */
export function destinationClock(timeZone: string, deviceTz: string, now: Date = new Date()): { time: string; diffHours: number } {
  const diff = (tzOffsetMinutes(now, timeZone) - tzOffsetMinutes(now, deviceTz)) / 60
  const min = minutesOfDay(now, timeZone)
  return {
    time: `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`,
    diffHours: diff,
  }
}

export const formatDiffHours = (h: number): string => `${h > 0 ? '+' : '−'}${Math.abs(h)} h`
