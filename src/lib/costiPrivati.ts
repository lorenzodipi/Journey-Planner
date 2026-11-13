// Costi privati (migrazione 0049): prezzi, «pagato» e «chi ha pagato» di alloggi, voli, trasporti, tappe, luoghi e il
// limite di budget stanno anche in `trip_costs`, che leggono solo creatore e partecipanti. Dopo la 0050 le colonne di
// sempre restano vuote: qui si rimettono i valori nelle righe prima di trasformarle. Senza la tabella (o per un
// visualizzatore, che non la legge) le righe restano come sono.

export type TipoCosto = 'stay' | 'flight' | 'transport' | 'day_item' | 'place' | 'trip'

export interface CostoRow {
  kind: string
  ref_id: string
  data: Record<string, unknown> | null
}

export type IndiceCosti = Map<string, Record<string, unknown>>

export function indiceCosti(rows: readonly CostoRow[] | null | undefined): IndiceCosti {
  const m: IndiceCosti = new Map()
  for (const r of rows ?? []) if (r.data) m.set(`${r.kind}:${r.ref_id}`, r.data)
  return m
}

/** Le righe con i costi privati al posto delle colonne (copie: le righe scaricate non cambiano). */
export function conCosti<T extends { id: string }>(rows: readonly T[], kind: TipoCosto, costi: IndiceCosti): T[] {
  if (costi.size === 0) return rows as T[]
  return rows.map((r) => {
    const d = costi.get(`${kind}:${r.id}`)
    return d ? ({ ...r, ...d } as T) : r
  })
}
