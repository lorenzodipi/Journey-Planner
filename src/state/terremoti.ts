// Terremoti recenti dal catalogo USGS (gratuito, senza chiave): solo quelli di magnitudo 4,5 e oltre del giorno
// passato, pochi KB. Si scaricano solo durante il viaggio, con la rete, al massimo ogni 15 minuti, e una richiesta
// alla volta anche se più pagine li chiedono; l'ultima risposta resta sul telefono (chiave `jp.`, si cancella
// all'uscita dall'account).
import { useEffect, useState } from 'react'
import { leggiTerremoti, type Terremoto } from '../lib/allerte'

export const URL_TERREMOTI = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
const CHIAVE = 'jp.terremoti.v1'
export const TERREMOTI_TTL_MS = 15 * 60 * 1000
const TIMEOUT_MS = 8000

interface Copia {
  savedAt: number
  eventi: Terremoto[]
}

function leggiCopia(): Copia | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHIAVE) ?? 'null') as Copia | null
    return c && Array.isArray(c.eventi) && typeof c.savedAt === 'number' ? c : null
  } catch {
    return null
  }
}

let inCorso: Promise<Terremoto[]> | null = null
/** Dopo un errore non si riprova per 2 minuti: con la rete scarsa ogni pagina aperta riprenderebbe da capo. */
const PAUSA_DOPO_ERRORE_MS = 2 * 60 * 1000
let fallitoAlle = 0

async function scarica(): Promise<Terremoto[]> {
  const stop = new AbortController()
  const t = setTimeout(() => stop.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(URL_TERREMOTI, { signal: stop.signal })
    if (!r.ok) throw new Error('USGS')
    const eventi = leggiTerremoti(await r.json())
    try {
      localStorage.setItem(CHIAVE, JSON.stringify({ savedAt: Date.now(), eventi } satisfies Copia))
    } catch {
      // storage pieno o bloccato: vale per questa volta
    }
    return eventi
  } finally {
    clearTimeout(t)
  }
}

/** I terremoti recenti: subito la copia sul telefono, poi aggiornati se serve. `attivo` = durante il viaggio. */
export function useTerremoti(attivo: boolean): Terremoto[] {
  const [eventi, setEventi] = useState<Terremoto[]>(() => (attivo ? (leggiCopia()?.eventi ?? []) : []))
  useEffect(() => {
    if (!attivo) return setEventi([])
    const c = leggiCopia()
    setEventi(c?.eventi ?? [])
    if ((c && Date.now() - c.savedAt < TERREMOTI_TTL_MS) || !navigator.onLine || Date.now() - fallitoAlle < PAUSA_DOPO_ERRORE_MS) return
    let vivo = true
    inCorso ??= scarica()
      .then(
        (e) => ((fallitoAlle = 0), e),
        (err: unknown) => {
          fallitoAlle = Date.now()
          throw err
        },
      )
      .finally(() => (inCorso = null))
    inCorso.then(
      (e) => vivo && setEventi(e),
      () => undefined, // senza rete o servizio giù: resta la copia
    )
    return () => {
      vivo = false
    }
  }, [attivo])
  return eventi
}
