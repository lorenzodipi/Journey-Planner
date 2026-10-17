import { parseYmd, toYmd } from './dates'

// I giorni di un viaggio derivano dalle date di inizio e fine. Quando le date
// cambiano non cancelliamo nulla: i giorni fuori intervallo vengono nascosti
// (soft delete) e tornano con tutti i loro dati se l'intervallo si allarga di nuovo.

/** Tutte le date "YYYY-MM-DD" da `start` a `end` inclusi. Vuoto se l'intervallo è invalido. */
export function enumerateDates(start: string, end: string, maxDays = 400): string[] {
  const a = parseYmd(start)
  const b = parseYmd(end)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return []
  const out: string[] = []
  const cursor = new Date(a)
  while (cursor <= b && out.length < maxDays) {
    out.push(toYmd(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export interface ExistingDay {
  id: string
  date: string
  deleted: boolean
}

export interface DayPlan {
  /** date per cui va creata una nuova riga */
  create: string[]
  /** id di righe nascoste da riattivare (la data è tornata nell'intervallo) */
  restore: string[]
  /** id di righe attive da nascondere (la data è uscita dall'intervallo) */
  hide: string[]
}

/** Confronta i giorni esistenti con il nuovo intervallo e dice cosa fare. */
export function planDays(existing: ExistingDay[], start: string, end: string): DayPlan {
  const wanted = new Set(enumerateDates(start, end))
  const byDate = new Map(existing.map((d) => [d.date, d]))

  const create: string[] = []
  const restore: string[] = []
  for (const date of wanted) {
    const row = byDate.get(date)
    if (!row) create.push(date)
    else if (row.deleted) restore.push(row.id)
  }

  const hide = existing.filter((d) => !d.deleted && !wanted.has(d.date)).map((d) => d.id)
  return { create, restore, hide }
}
