// Codici d'accesso di un alloggio (0052): ce ne può essere più d'uno (il portone, la stanza, la cassetta delle chiavi).
// Stanno tutti nella colonna di sempre `access_code`, senza migrazione: un codice solo e senza nome resta il testo semplice di
// prima (gli alloggi già salvati si leggono uguali); da due in su, o con un nome, è un elenco JSON `[{"n":"Portone","c":"4821"}]`.

export interface CodiceAccesso {
  /** a che cosa serve («Portone», «Stanza»): facoltativo */
  nome: string
  codice: string
}

/** Legge il valore salvato. Il testo che non è un elenco valido è un codice solo, com'era prima. */
export function leggiCodici(salvato: string | null | undefined): CodiceAccesso[] {
  const s = salvato?.trim()
  if (!s) return []
  if (s.startsWith('[')) {
    try {
      const j: unknown = JSON.parse(s)
      if (Array.isArray(j) && j.every((x) => x && typeof x === 'object' && typeof (x as { c?: unknown }).c === 'string')) {
        const out = (j as { n?: unknown; c: string }[])
          .map((x) => ({ nome: typeof x.n === 'string' ? x.n.trim() : '', codice: x.c.trim() }))
          .filter((x) => x.codice)
        if (out.length > 0 || j.length > 0) return out
      }
    } catch {
      /* testo qualsiasi che comincia per «[»: è un codice solo */
    }
  }
  return [{ nome: '', codice: s }]
}

/** Il valore da salvare: i codici vuoti si scartano; uno solo e senza nome resta testo semplice. */
export function scriviCodici(codici: readonly CodiceAccesso[]): string {
  const pieni = codici.map((x) => ({ nome: x.nome.trim(), codice: x.codice.trim() })).filter((x) => x.codice)
  if (pieni.length === 0) return ''
  if (pieni.length === 1 && !pieni[0].nome) return pieni[0].codice
  return JSON.stringify(pieni.map((x) => (x.nome ? { n: x.nome, c: x.codice } : { c: x.codice })))
}
