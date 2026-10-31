// Notifiche locali (#46): cosa avvisare e quando. La parte che calcola è pura e sta qui; programmarle sul telefono è in `nativeNotifiche.ts`.
import { avvisoPioggia, type OraPrevista } from './oggi'
import { formatMoney } from './money'
import { dateAddDays } from './dates'
import type { NotifichePrefs } from './prefs'
import type { Trip } from '../types'

export interface Avviso {
  /** numero stabile: riprogrammare lo stesso avviso non lo duplica */
  id: number
  at: Date
  title: string
  body: string
  /** pagina da aprire al tocco, es. `/giorni/abc?tappa=xyz` */
  route: string
}

/** Numero positivo (31 bit) stabile da un testo, per gli id delle notifiche. */
export function idStabile(text: string): number {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return Math.abs(h) % 2_000_000_000 || 1
}

/** Differenza in ms tra l'ora «a muro» di un fuso e UTC, a quell'istante. */
function offsetMs(at: Date, tz: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(at).map((x) => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at.getTime()
}

/** L'istante in cui in `tz` sono le `hhmm` del giorno `ymd`. */
export function istanteLocale(ymd: string, hhmm: string, tz: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)
  const wall = Date.UTC(y, m - 1, d, h, mi)
  let t = wall - offsetMs(new Date(wall), tz)
  t = wall - offsetMs(new Date(t), tz)
  return new Date(t)
}

/** Prossima tappa: 30 minuti prima di ogni tappa con orario, nei prossimi `giorni` giorni. Orari nel fuso del viaggio. */
export function avvisiTappe(trip: Trip, now: Date, giorni = 7, anticipoMin = 30): Avviso[] {
  const out: Avviso[] = []
  const limite = now.getTime() + giorni * 86_400_000
  for (const day of trip.days) {
    for (const it of day.items) {
      if (!it.time || !/^\d{1,2}:\d{2}$/.test(it.time)) continue
      const stato = it.status ?? (it.done ? 'done' : 'todo')
      if (stato === 'done' || stato === 'skipped' || stato === 'cancelled') continue
      const start = istanteLocale(day.date, it.time.padStart(5, '0'), trip.timezone)
      const at = new Date(start.getTime() - anticipoMin * 60_000)
      if (at.getTime() <= now.getTime() || at.getTime() > limite) continue
      out.push({ id: idStabile(`tappa:${it.id}`), at, title: `Tra ${anticipoMin} min: ${it.title}`, body: `Alle ${it.time.padStart(5, '0')}`, route: `/giorni/${day.id}?tappa=${it.id}` })
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime())
}

/** Promemoria del check-in online (#58, MOVE-008): all'ora di apertura, per voli e trasporti, nei prossimi `giorni` giorni. */
export function avvisiCheckin(trip: Trip, now: Date, giorni = 30): Avviso[] {
  const limite = now.getTime() + giorni * 86_400_000
  const out: Avviso[] = []
  const add = (key: string, titolo: string, checkinAt: string | undefined, route: string) => {
    const at = checkinAt ? new Date(checkinAt) : null
    if (!at || Number.isNaN(at.getTime()) || at.getTime() <= now.getTime() || at.getTime() > limite) return
    out.push({ id: idStabile(`checkin:${key}`), at, title: `Check-in aperto: ${titolo}`, body: 'Puoi fare il check-in online.', route })
  }
  for (const f of trip.flights) add(f.id, f.title, f.checkinAt, '/altro/voli')
  for (const t of trip.transports) add(t.id, `${t.from} → ${t.to}`, t.checkinAt, '/altro/trasporti')
  return out.sort((a, b) => a.at.getTime() - b.at.getTime())
}

/** Scadenze della checklist: una settimana prima (alle 9:00 del fuso del viaggio) di una voce non fatta che mi riguarda. */
export function avvisiChecklist(trip: Trip, now: Date, meId?: string): Avviso[] {
  const out: Avviso[] = []
  for (const c of trip.checklist) {
    if (!c.dueDate || c.done) continue
    if (c.travelerId && c.travelerId !== meId) continue
    const at = istanteLocale(dateAddDays(c.dueDate, -7), '09:00', trip.timezone)
    if (at.getTime() <= now.getTime()) continue
    out.push({ id: idStabile(`checklist:${c.id}`), at, title: `Tra una settimana: ${c.text}`, body: 'Scade nella checklist del viaggio', route: '/altro/checklist' })
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime())
}

/** Pioggia in arrivo: una al giorno al massimo, un'ora prima dell'inizio (se manca meno, subito). `ore` sono le prossime ore previste. */
export function avvisoPioggiaDelGiorno(ore: OraPrevista[], city: string, now: Date, tz: string): Avviso | null {
  const a = avvisoPioggia(ore.slice(0, 12))
  if (!a) return null
  const wet = (h: OraPrevista) => (h.rain ?? 0) >= 50 || (h.mm ?? 0) >= 0.5
  const first = ore.slice(0, 12).find(wet)
  if (!first) return null
  const start = istanteLocale(first.date, `${String(first.h).padStart(2, '0')}:00`, tz)
  if (start.getTime() <= now.getTime() - 3_600_000) return null
  const at = new Date(Math.max(start.getTime() - 3_600_000, now.getTime() + 10_000))
  return { id: idStabile(`pioggia:${first.date}`), at, title: `${a.title}${city ? ` a ${city}` : ''}`, body: 'Porta l’ombrello', route: '/' }
}

/** Budget: all'80% e al 100% (una volta ciascuno). `gia` è la soglia già notificata (0, 80 o 100). */
export function avvisoBudget(trip: Pick<Trip, 'id' | 'baseCurrency'>, speso: number, limite: number | undefined, gia: number, now: Date): { avviso: Avviso | null; soglia: number } {
  if (!limite || limite <= 0) return { avviso: null, soglia: 0 }
  const pct = (speso / limite) * 100
  const raggiunta = pct >= 100 ? 100 : pct >= 80 ? 80 : 0
  if (raggiunta <= gia) return { avviso: null, soglia: raggiunta }
  const title = raggiunta === 100 ? 'Hai raggiunto il budget' : 'Sei all’80% del budget'
  return { avviso: { id: idStabile(`budget:${trip.id}:${raggiunta}`), at: new Date(now.getTime() + 5_000), title, body: `Speso ${formatMoney(speso, trip.baseCurrency)} su ${formatMoney(limite, trip.baseCurrency)}`, route: '/spese' }, soglia: raggiunta }
}

/** Tutti gli avvisi programmati per le scelte fatte (il budget è a parte: scatta quando si supera la soglia). */
export function pianoAvvisi(trip: Trip, prefs: NotifichePrefs, now: Date, ctx: { meId?: string; ore?: OraPrevista[]; city?: string }): Avviso[] {
  return [
    ...(prefs.tappa ? avvisiTappe(trip, now) : []),
    ...(prefs.checkin ? avvisiCheckin(trip, now) : []),
    ...(prefs.checklist ? avvisiChecklist(trip, now, ctx.meId) : []),
    ...(prefs.pioggia && ctx.ore ? [avvisoPioggiaDelGiorno(ctx.ore, ctx.city ?? '', now, trip.timezone)].filter((x): x is Avviso => !!x) : []),
  ]
}
