// Calendario mensile per il selettore di date: funzioni pure, provate nei test.
// Le date sono sempre testi «YYYY-MM-DD» (nessun fuso: sono giorni del calendario).

const YMD = /^\d{4}-\d{2}-\d{2}$/

export const isYmd = (v: string | undefined | null): v is string => !!v && YMD.test(v)

const pad = (n: number) => String(n).padStart(2, '0')
export const toYmd = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`

/** Giorni del mese in settimane da lunedì a domenica; `null` dove la cella è fuori dal mese. `month` va da 0 a 11. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1))
  const offset = (first.getUTCDay() + 6) % 7 // lunedì = 0
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: (string | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => toYmd(year, month, i + 1))]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Il giorno non si può scegliere: prima del minimo o dopo il massimo. */
export function isDayBlocked(ymd: string, min?: string, max?: string): boolean {
  return (isYmd(min) && ymd < min) || (isYmd(max) && ymd > max)
}

/** Mese successivo o precedente di (anno, mese). */
export function shiftMonth(year: number, month: number, step: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month + step, 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
}

/** Mese (anno, mese) da mostrare aprendo il calendario: quello della data scelta, altrimenti del minimo, altrimenti di oggi. */
export function startMonth(value: string, min: string | undefined, today: string): { year: number; month: number } {
  const pick = isYmd(value) ? value : isYmd(min) && today < min ? min : today
  return { year: Number(pick.slice(0, 4)), month: Number(pick.slice(5, 7)) - 1 }
}

/** Il mese sta del tutto prima del minimo (non c'è nulla da scegliere tornando indietro). */
export function monthBeforeMin(year: number, month: number, min?: string): boolean {
  return isYmd(min) && toYmd(year, month, 1) < `${min.slice(0, 7)}-01`
}

export function monthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month, 1)))
}

export function longDay(ymd: string): string {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`))
}

export function shortDay(ymd: string): string {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`))
}

export const WEEKDAYS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
