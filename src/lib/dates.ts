// Le date del viaggio sono "YYYY-MM-DD" (giorni di calendario, senza fuso).
// Le trattiamo sempre come date locali per evitare slittamenti di un giorno.

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toYmd(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function todayYmd(now: Date = new Date()): string {
  return toYmd(now)
}

/** La data `n` giorni dopo (o prima, se negativo). */
export function dateAddDays(ymd: string, n: number): string {
  const d = parseYmd(ymd)
  d.setDate(d.getDate() + n)
  return toYmd(d)
}

/** Giorni di calendario tra due date (b - a). */
export function daysBetween(aYmd: string, bYmd: string): number {
  const a = parseYmd(aYmd)
  const b = parseYmd(bYmd)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

const dayFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const longFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

export const formatDay = (ymd: string) => dayFmt.format(parseYmd(ymd))
export const formatDayLong = (ymd: string) => longFmt.format(parseYmd(ymd))
export const formatShort = (ymd: string) => shortFmt.format(parseYmd(ymd))
