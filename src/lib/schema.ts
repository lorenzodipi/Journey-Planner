// Quali migrazioni facoltative risultano eseguite sul database, ricavato dalle righe lette:
// se una colonna nuova compare nei dati, la migrazione c'è. Serve a non inviare colonne che il
// database non conosce ancora (l'app funziona anche prima delle migrazioni, regola del progetto).
export const schema = {
  /** 0017: day_items.status, participants, expenses.source_* */
  itemStatus: false,
}

/** Da chiamare con una riga qualsiasi di day_items appena letta. */
export function noteItemRow(row: object | undefined): void {
  if (row && 'status' in row) schema.itemStatus = true
}
