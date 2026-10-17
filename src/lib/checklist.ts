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

export function progress(items: Pick<ChecklistItem, 'done'>[]): { done: number; total: number } {
  return { done: items.filter((i) => i.done).length, total: items.length }
}

/**
 * Voci di un tipo, per tutti o per una persona. Quelle da fare per prime, le fatte in fondo;
 * a parità, nell'ordine scelto. `traveler`: 'all' = tutte, altrimenti id (include anche le voci "per tutti").
 */
export function visibleItems(items: ChecklistItem[], kind: ChecklistKind, traveler: 'all' | string): ChecklistItem[] {
  return items
    .filter((i) => i.kind === kind && (traveler === 'all' || !i.travelerId || i.travelerId === traveler))
    .sort((a, b) => Number(a.done) - Number(b.done) || a.position - b.position)
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
