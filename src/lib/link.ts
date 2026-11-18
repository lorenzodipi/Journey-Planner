// Link dentro un testo scritto a mano (note): si riconoscono e diventano cliccabili, con un'etichetta corta.

export type Pezzo = { testo: string } | { url: string; etichetta: string }

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi
// la punteggiatura alla fine di solito chiude la frase, non il link
const CODA = /[.,;:!?)\]}»"']+$/

/** Etichetta corta: dominio senza «www.» e percorso, senza protocollo (il resto lo taglia il CSS con i tre puntini). */
export function etichettaLink(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}

/** Il testo diviso in pezzi di testo e link. */
export function pezziConLink(testo: string): Pezzo[] {
  const out: Pezzo[] = []
  let da = 0
  for (const m of testo.matchAll(URL_RE)) {
    let grezzo = m[0]
    const coda = grezzo.match(CODA)?.[0] ?? ''
    // una parentesi chiusa resta nel link se ne ha una aperta (es. pagine di Wikipedia)
    const tieni = coda.startsWith(')') && grezzo.slice(0, -coda.length).includes('(') ? 1 : 0
    grezzo = grezzo.slice(0, grezzo.length - coda.length + tieni)
    const i = m.index ?? 0
    if (i > da) out.push({ testo: testo.slice(da, i) })
    out.push({ url: /^https?:\/\//i.test(grezzo) ? grezzo : `https://${grezzo}`, etichetta: etichettaLink(grezzo) })
    da = i + grezzo.length
  }
  if (da < testo.length) out.push({ testo: testo.slice(da) })
  return out
}
