// Giorni raggruppati come nel mock Fa-08: giorni consecutivi nella stessa città, i giorni di volo
// («Milano → Osaka») e l'ultimo giorno di rientro («Rientro»). Una città che torna più tardi
// forma un gruppo nuovo.
import { dateInZone } from './flights'
import { parseYmd } from './dates'
import type { Day, Trip } from '../types'

export type CellState = 'past' | 'today' | 'free' | 'future'

export interface DayCell {
  day: Day
  state: CellState
  /** Riga principale: titolo del giorno, prima tappa o città. */
  label: string
  /** Riga di stato: «Fatto», «Oggi», «Volo», «Libero», «3 tappe». */
  status: string
  statusIcon: 'g-check' | 'g-clock' | 'g-plus' | 'g-pin'
  flight: boolean
}

export interface DayGroup {
  kind: 'city' | 'travel' | 'return'
  title: string
  meta: string
  cells: DayCell[]
}

const dm = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })
const clean = (s: string) => s.replace('.', '')

/** Il giorno ha un volo che parte o arriva in quella data (ora locale degli aeroporti). */
export function flightOn(trip: Pick<Trip, 'flights'>, ymd: string): boolean {
  return trip.flights.some((f) => f.legs.some((l) => dateInZone(l.departAt, l.fromTz) === ymd || dateInZone(l.arriveAt, l.toTz) === ymd))
}

export function rangeText(first: string, last: string): string {
  const a = parseYmd(first)
  const b = parseYmd(last)
  if (first === last) return clean(dm.format(a))
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${clean(dm.format(b))}`
  return `${clean(dm.format(a))} – ${clean(dm.format(b))}`
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function cellFor(trip: Pick<Trip, 'flights'>, day: Day, today: string, travelRole: 'out' | 'in' | null): DayCell {
  const flight = flightOn(trip, day.date)
  const n = day.items.length
  const first = day.items.find((i) => i.time) ?? day.items[0]
  const label = day.title || first?.title || (travelRole === 'out' ? 'Partenza' : travelRole === 'in' ? 'Arrivo' : '') || day.city || 'Giorno'
  if (day.date < today) return { day, state: 'past', label, status: 'Fatto', statusIcon: 'g-check', flight }
  if (day.date === today) return { day, state: 'today', label, status: 'Oggi', statusIcon: 'g-clock', flight }
  if (flight && n === 0) return { day, state: 'future', label, status: 'Volo', statusIcon: 'g-clock', flight }
  if (n === 0 && !day.title) return { day, state: 'free', label: day.city || label, status: 'Libero', statusIcon: 'g-plus', flight }
  return { day, state: 'future', label, status: plural(n, 'tappa', 'tappe'), statusIcon: 'g-pin', flight }
}

/** Raggruppa i giorni del viaggio (in ordine di data). `today` = data di oggi nel fuso del viaggio. */
export function groupDays(trip: Pick<Trip, 'days' | 'flights'>, today: string): DayGroup[] {
  const days = [...trip.days].sort((a, b) => a.date.localeCompare(b.date))
  const groups: DayGroup[] = []
  const lastIdx = days.length - 1
  let i = 0
  while (i <= lastIdx) {
    const d = days[i]
    // ultimi giorni con un volo (anche la partenza del giorno prima): rientro
    const finali = days.slice(i)
    if (i > 0 && flightOn(trip, days[lastIdx].date) && finali.every((x, k) => flightOn(trip, x.date) && (k === finali.length - 1 || x.items.length === 0))) {
      const prevCity = days[i - 1]?.city || ''
      const cells = finali.map((x, k) => {
        const cell = cellFor(trip, x, today, k === 0 && finali.length > 1 ? 'out' : null)
        if (k === finali.length - 1 && !x.title && x.items.length === 0) cell.label = prevCity && x.city && prevCity !== x.city ? `${prevCity} → ${x.city}` : prevCity ? `${prevCity} → casa` : 'Volo di rientro'
        return cell
      })
      groups.push({ kind: 'return', title: 'Rientro', meta: `${plural(finali.length, 'giorno', 'giorni')} · ${rangeText(d.date, days[lastIdx].date)}`, cells })
      break
    }
    // giorni di volo consecutivi (partenza e arrivo del giorno dopo)
    if (flightOn(trip, d.date) && d.items.length === 0) {
      let j = i
      while (j + 1 < lastIdx && flightOn(trip, days[j + 1].date) && days[j + 1].items.length === 0) j++
      const span = days.slice(i, j + 1)
      const before = days[i - 1]?.city
      const fromCity = before || span[0].city || ''
      const after = days[j + 1]?.city
      const toCity = after || span[span.length - 1].city || ''
      const cells = span.map((x, k) => cellFor(trip, x, today, span.length > 1 ? (k === 0 ? 'out' : k === span.length - 1 ? 'in' : null) : 'out'))
      groups.push({
        kind: 'travel',
        title: fromCity && toCity && fromCity !== toCity ? `${fromCity} → ${toCity}` : toCity || fromCity || 'In viaggio',
        meta: `${plural(span.length, 'giorno', 'giorni')} · ${rangeText(span[0].date, span[span.length - 1].date)}`,
        cells,
      })
      i = j + 1
      continue
    }
    // giorni consecutivi nella stessa città
    const city = (d.city || '').trim()
    let j = i
    while (j + 1 <= lastIdx && (days[j + 1].city || '').trim().toLowerCase() === city.toLowerCase() && !(j + 1 === lastIdx && flightOn(trip, days[j + 1].date)) && !(flightOn(trip, days[j + 1].date) && days[j + 1].items.length === 0)) j++
    const span = days.slice(i, j + 1)
    const cells = span.map((x) => cellFor(trip, x, today, null))
    const free = cells.filter((c) => c.state === 'free').length
    groups.push({
      kind: 'city',
      title: city || 'Da definire',
      meta: `${plural(span.length, 'giorno', 'giorni')} · ${rangeText(span[0].date, span[span.length - 1].date)}${free > 0 ? ` · ${plural(free, 'libero', 'liberi')}` : ''}`,
      cells,
    })
    i = j + 1
  }
  return groups
}
