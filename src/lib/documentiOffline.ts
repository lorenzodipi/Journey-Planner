// «Disponibile offline» dei documenti (#52, BOOK-031): scelta personale, salvata sul telefono.
// Il file si tiene solo finché il documento è tra quelli che posso vedere: se il permesso viene tolto, la copia sparisce.
const KEY = 'jp.doc.offline.v1'

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const isDocOffline = (id: string): boolean => read().includes(id)

export function setDocOffline(id: string, on: boolean): void {
  const cur = read().filter((x) => x !== id)
  try {
    localStorage.setItem(KEY, JSON.stringify(on ? [...cur, id] : cur))
  } catch {
    // storage bloccato: la scelta vale solo per ora
  }
}
