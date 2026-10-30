import type { ChecklistItem, ChecklistKind } from '../types'

export const KIND_LABEL: Record<ChecklistKind, string> = {
  todo: 'Da fare',
  packing: 'Valigia',
  docs: 'Documenti',
}

export const KINDS: ChecklistKind[] = ['todo', 'packing', 'docs']

/** Modello di partenza, valido per qualunque viaggio: si modifica e si completa a piacere. */
export const TEMPLATE: Record<ChecklistKind, string[]> = {
  todo: [
    'Controllare le regole di ingresso e di transito (anche degli scali)',
    'Sottoscrivere l’assicurazione di viaggio',
    'Avvisare la banca e controllare i limiti della carta',
    'Scaricare le mappe e i biglietti per l’uso offline',
    'Procurarsi contanti nella valuta locale',
    'Fare il check-in online dei voli',
  ],
  packing: [
    'Adattatore per le prese',
    'Caricabatterie e power bank',
    'Abbigliamento a strati',
    'Scarpe comode già usate',
    'Ombrello o k-way',
    'Beauty case e medicine personali',
  ],
  docs: [
    'Passaporto o carta d’identità (con validità sufficiente)',
    'Copie digitali dei documenti',
    'Biglietti aerei e conferme degli alloggi',
    'Tessera sanitaria e dati dell’assicurazione',
    'Carte di pagamento',
  ],
}

export const MAX_QUANTITY = 999

/** Quantità scritta dall'utente → intero da 1 a 999 (vuoto o non valido = 1). */
export function parseQuantity(raw: string | number | undefined | null): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? '').replace(/\D/g, ''), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(Math.floor(n), MAX_QUANTITY)
}

/** Quanti pezzi della voce sono già a posto (una voce senza quantità vale 1 pezzo). */
export function doneCount(i: Pick<ChecklistItem, 'done' | 'quantity' | 'quantityDone'>): number {
  const q = i.quantity && i.quantity > 1 ? i.quantity : 1
  if (i.done) return q
  return q > 1 ? Math.max(0, Math.min(i.quantityDone ?? 0, q - 1)) : 0
}

/** Cosa salvare quando i pezzi a posto diventano `count` (limitati tra 0 e la quantità). */
export function countChange(
  i: Pick<ChecklistItem, 'quantity'>,
  count: number,
): { count: number; done: boolean; patch: { quantity_done: number; done: boolean } } {
  const q = i.quantity && i.quantity > 1 ? i.quantity : 1
  const n = Math.max(0, Math.min(Math.floor(count), q))
  const done = n >= q
  return { count: n, done, patch: { quantity_done: n, done } }
}

export function progress(items: Pick<ChecklistItem, 'done'>[]): { done: number; total: number } {
  return { done: items.filter((i) => i.done).length, total: items.length }
}

/**
 * Voci di un tipo, per tutti o per una persona, nell'ordine scelto: spuntare una voce non la sposta.
 * `traveler`: 'all' = tutte, altrimenti id (include anche le voci "per tutti").
 */
export function visibleItems(items: ChecklistItem[], kind: ChecklistKind, traveler: 'all' | string): ChecklistItem[] {
  return items
    .filter((i) => i.kind === kind && (traveler === 'all' || !i.travelerId || i.travelerId === traveler))
    .sort((a, b) => a.position - b.position)
}

/** Voci del modello non ancora presenti (confronto senza badare a maiuscole), con posizioni in coda. */
export function templateToAdd(existing: ChecklistItem[]): { kind: ChecklistKind; text: string; position: number }[] {
  const have = new Set(existing.map((i) => `${i.kind}:${i.text.trim().toLowerCase()}`))
  const last = new Map<ChecklistKind, number>(KINDS.map((k) => [k, Math.max(0, ...existing.filter((i) => i.kind === k).map((i) => i.position))]))
  const out: { kind: ChecklistKind; text: string; position: number }[] = []
  for (const kind of KINDS) {
    let pos = last.get(kind) ?? 0
    for (const text of TEMPLATE[kind]) {
      if (have.has(`${kind}:${text.toLowerCase()}`)) continue
      pos += 1000
      out.push({ kind, text, position: pos })
    }
  }
  return out
}

// ---------- checklist personale (#41, FRD LIST-001…012) ----------

export const BASE_CATEGORIES = ['Documenti', 'Valigia', 'Salute', 'Tecnologia', 'Altro'] as const

/** Le categorie di prima restano: Documenti → docs, Valigia → packing, il resto → todo. */
export function kindOfCategory(category: string): ChecklistKind {
  const k = category.trim().toLowerCase()
  return k === 'documenti' ? 'docs' : k === 'valigia' ? 'packing' : 'todo'
}

export const categoryOf = (i: Pick<ChecklistItem, 'category' | 'kind'>): string => i.category?.trim() || (i.kind === 'docs' ? 'Documenti' : i.kind === 'packing' ? 'Valigia' : 'Altro')

/** Le cinque predefinite, poi quelle personalizzate che compaiono nelle voci (in ordine alfabetico). */
export function categoriesFor(items: Pick<ChecklistItem, 'category' | 'kind'>[]): string[] {
  const base = BASE_CATEGORIES as readonly string[]
  const custom = [...new Set(items.map(categoryOf))].filter((c) => !base.some((b) => b.toLowerCase() === c.toLowerCase()))
  return [...base, ...custom.sort((a, b) => a.localeCompare(b, 'it'))]
}

export type ListaChecklist = 'all' | 'mine'

/** «Tutti» = lista comune; «Solo mie» = la mia lista privata. */
export const inLista = (i: Pick<ChecklistItem, 'private'>, lista: ListaChecklist) => (lista === 'mine' ? !!i.private : !i.private)

export interface SezioneChecklist {
  category: string
  items: ChecklistItem[]
  done: number
}

/** Sezioni per categoria (predefinite nell'ordine, poi le personalizzate), con quante voci ho già a posto. */
export function sezioni(items: ChecklistItem[]): SezioneChecklist[] {
  return categoriesFor(items)
    .map((category) => {
      const list = items.filter((i) => categoryOf(i).toLowerCase() === category.toLowerCase()).sort((a, b) => a.position - b.position)
      return { category, items: list, done: list.filter((i) => i.done).length }
    })
    .filter((s) => s.items.length > 0)
}

/** «Checklist · 9 di 23»: le mie spunte sulle voci comuni più le voci della mia lista privata. */
export function mioAvanzamento(items: Pick<ChecklistItem, 'done'>[]): { done: number; total: number } {
  return progress(items)
}

/** «2 di 4»: quanti viaggiatori hanno spuntato una voce comune (io compreso). */
export function spunteDi(i: Pick<ChecklistItem, 'done' | 'others'>, viaggiatori: number): { done: number; total: number } {
  return { done: (i.done ? 1 : 0) + (i.others ?? []).filter((o) => o.done).length, total: viaggiatori }
}
