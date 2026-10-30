import type { Category, ChecklistItem, Expense, PlaceStatus, ItemStatus } from '../types'

// Coda delle modifiche fatte senza rete (o con rete instabile).
// Ogni voce contiene le scritture da inviare (`ops`) e come si vede la modifica nell'app
// finché non è partita (`local`). Le scritture sono idempotenti (id creati sul telefono,
// upsert): se un invio va a metà e riparte, non nascono duplicati. Vale l'ultima scrittura.

export type Op =
  | { k: 'upsert'; table: string; row: Record<string, unknown> }
  | { k: 'update'; table: string; id: string; patch: Record<string, unknown> }
  /** Stessa modifica su più righe, in una sola richiesta (es. eliminare 100 voci selezionate). */
  | { k: 'updateMany'; table: string; ids: string[]; patch: Record<string, unknown> }
  | { k: 'expenseShares'; tripId: string; expenseId: string; travelerIds: string[] }

/** Come la modifica appare nell'app prima dell'invio. */
export type Local =
  /** `category`: la categoria creata insieme alla spesa (se il nome non esisteva ancora) */
  | { t: 'expense.save'; tripId: string; expense: Expense; category?: Category }
  | { t: 'expense.deleted'; id: string; deleted: boolean }
  | { t: 'checklist.save'; tripId: string; item: ChecklistItem }
  | { t: 'checklist.done'; id: string; done: boolean }
  | { t: 'checklist.count'; id: string; count: number; done: boolean }
  | { t: 'checklist.deleted'; id: string; deleted: boolean }
  | { t: 'checklist.deletedMany'; ids: string[]; deleted: boolean }
  | { t: 'item.done'; id: string; done: boolean }
  | { t: 'item.status'; id: string; status: ItemStatus; at: string }
  | { t: 'place.status'; id: string; status: PlaceStatus }

export interface Entry {
  id: string
  at: number
  label: string
  ops: Op[]
  local: Local
  /** presente se il server ha rifiutato la modifica in modo definitivo */
  error?: string
  /** già inviata: resta nella vista finché i dati ricaricati dal server non la includono */
  sent?: boolean
}

const KEY = 'jp.outbox.v1'

export function loadQueue(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as Entry[]) : []
  } catch {
    return []
  }
}

export function saveQueue(entries: Entry[]): void {
  try {
    if (entries.length === 0) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // storage pieno o bloccato: la coda resta comunque in memoria finché l'app è aperta
  }
}

export function clearQueue(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignorato
  }
}

/** Errori che passano da soli (rete, server, sessione scaduta): si riprova più tardi. */
export function isTransient(error: unknown): boolean {
  const e = error as { message?: string; status?: number } | null
  const message = String(e?.message ?? error ?? '')
  const status = typeof e?.status === 'number' ? e.status : undefined
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (status !== undefined && (status === 0 || status === 401 || status === 408 || status === 429 || status >= 500)) return true
  return /failed to fetch|networkerror|network request|load failed|abort|timed? ?out|offline|jwt|fetch/i.test(message)
}

export interface FlushResult {
  sent: string[]
  failed: { id: string; error: string }[]
  /** true se si è fermato per un problema temporaneo (restano voci da inviare) */
  stopped: boolean
}

/**
 * Invia le voci in ordine. Un errore temporaneo ferma tutto (l'ordine conta: es. "crea" prima di "elimina");
 * un errore definitivo segna solo quella voce e prosegue.
 */
export async function flushQueue(entries: Entry[], exec: (op: Op) => Promise<void>): Promise<FlushResult> {
  const result: FlushResult = { sent: [], failed: [], stopped: false }
  for (const entry of entries) {
    if (entry.error || entry.sent) continue
    try {
      for (const op of entry.ops) await exec(op)
      result.sent.push(entry.id)
    } catch (e) {
      if (isTransient(e)) {
        result.stopped = true
        return result
      }
      result.failed.push({ id: entry.id, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return result
}
