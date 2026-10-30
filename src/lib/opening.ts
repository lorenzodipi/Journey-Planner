// Orari strutturati dei luoghi (#33): per ogni giorno della settimana le fasce di apertura,
// i giorni chiusi e una nota libera. Il vecchio testo `opening_hours` resta come ripiego.
import { parseYmd } from './dates'

export interface Fascia {
  from: string // "HH:MM"
  to: string
}

/** Giorni ISO: 1 = lunedì … 7 = domenica. Un giorno assente o vuoto = chiuso. */
export interface OpeningSpec {
  w: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, Fascia[]>>
  note?: string
}

export const WEEKDAYS: { n: 1 | 2 | 3 | 4 | 5 | 6 | 7; short: string; long: string }[] = [
  { n: 1, short: 'Lun', long: 'lunedì' },
  { n: 2, short: 'Mar', long: 'martedì' },
  { n: 3, short: 'Mer', long: 'mercoledì' },
  { n: 4, short: 'Gio', long: 'giovedì' },
  { n: 5, short: 'Ven', long: 'venerdì' },
  { n: 6, short: 'Sab', long: 'sabato' },
  { n: 7, short: 'Dom', long: 'domenica' },
]

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const valid = (f: Fascia) => /^\d{2}:\d{2}$/.test(f.from) && /^\d{2}:\d{2}$/.test(f.to)

/** Legge lo spec dal database (jsonb) scartando ciò che non è valido. */
export function cleanSpec(raw: unknown): OpeningSpec | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as { w?: Record<string, unknown>; note?: unknown }
  const w: OpeningSpec['w'] = {}
  for (const d of WEEKDAYS) {
    const list = r.w?.[String(d.n)]
    if (Array.isArray(list)) {
      const ok = list.filter((x): x is Fascia => !!x && typeof x === 'object' && valid(x as Fascia)).map((x) => ({ from: x.from, to: x.to }))
      if (ok.length > 0) w[d.n] = ok
    }
  }
  const note = typeof r.note === 'string' && r.note.trim() ? r.note.trim() : undefined
  if (Object.keys(w).length === 0 && !note) return undefined
  return { w, ...(note ? { note } : {}) }
}

export const isoWeekday = (ymd: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 => (((parseYmd(ymd).getDay() + 6) % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7

/** «Aperto fino alle 15:00» / «Apre alle 17:30» / «Chiuso oggi» / «Chiuso a quest'ora», all'ora `atMin` del giorno `ymd`. */
export function openingFor(spec: OpeningSpec | undefined, ymd: string, atMin: number): { text: string; closed: boolean } | null {
  if (!spec || Object.keys(spec.w).length === 0) return null
  const fasce = (spec.w[isoWeekday(ymd)] ?? []).slice().sort((a, b) => a.from.localeCompare(b.from))
  if (fasce.length === 0) return { text: 'Chiuso oggi', closed: true }
  for (const f of fasce) {
    const a = toMin(f.from)
    let b = toMin(f.to)
    if (b <= a) b += 1440 // aperto oltre la mezzanotte
    if (atMin >= a && atMin < b) return { text: `Aperto fino alle ${f.to}`, closed: false }
    if (atMin < a) return { text: `Apre alle ${f.from}`, closed: false }
  }
  return { text: "Chiuso a quest'ora", closed: true }
}

const sameFasce = (a: Fascia[] | undefined, b: Fascia[] | undefined) => JSON.stringify(a ?? []) === JSON.stringify(b ?? [])
const fasceText = (f: Fascia[]) => f.map((x) => `${x.from}–${x.to}`).join(' e ')

/** «Gio–Mar · 11:30–15:00 e 17:30–21:00 · Chiuso il mercoledì» (gruppi di giorni consecutivi con gli stessi orari). */
export function formatOpening(spec: OpeningSpec | undefined): string | null {
  if (!spec) return null
  const open = WEEKDAYS.filter((d) => (spec.w[d.n]?.length ?? 0) > 0)
  if (open.length === 0) return spec.note ?? null
  // gruppi di giorni con gli stessi orari, partendo dal giorno dopo un giorno chiuso (così «Gio–Mar» resta unito)
  const firstClosed = WEEKDAYS.findIndex((d) => !(spec.w[d.n]?.length))
  const start = firstClosed < 0 ? 0 : (firstClosed + 1) % 7
  const order = Array.from({ length: 7 }, (_, i) => WEEKDAYS[(start + i) % 7])
  const groups: { days: typeof WEEKDAYS; f: Fascia[] }[] = []
  for (const d of order) {
    const f = spec.w[d.n]
    if (!f?.length) continue
    const last = groups[groups.length - 1]
    const prevDay = last?.days[last.days.length - 1]
    const consecutive = prevDay && (prevDay.n % 7) + 1 === d.n
    if (last && consecutive && sameFasce(last.f, f)) last.days.push(d)
    else groups.push({ days: [d], f })
  }
  const parts = groups.map((g) => `${g.days.length === 7 ? 'Tutti i giorni' : g.days.length > 1 ? `${g.days[0].short}–${g.days[g.days.length - 1].short}` : g.days[0].short} · ${fasceText(g.f)}`)
  const closed = WEEKDAYS.filter((d) => !(spec.w[d.n]?.length))
  if (closed.length > 0 && closed.length < 7) parts.push(`Chiuso ${closed.length === 1 ? `il ${closed[0].long}` : closed.map((d) => d.long).join(', ')}`)
  if (spec.note) parts.push(spec.note)
  return parts.join(' · ')
}
