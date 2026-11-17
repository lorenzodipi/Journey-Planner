// Elenco completo degli aeroporti con voli di linea (OurAirports, pubblico dominio; vedi scripts/aeroporti).
// Una copia è dentro l'app (src/data/aeroporti.json, si carica solo quando serve) e funziona anche offline al primo
// avvio. Ogni mese l'azione «Aeroporti» su GitHub pubblica un elenco aggiornato nel ramo `dati-aeroporti`: quando c'è
// rete, l'app lo controlla al massimo una volta a settimana e, se è più nuovo, lo tiene sul telefono (`jp.aeroporti`,
// che resta anche dopo il logout perché non è un dato dell'account). Così non serve una nuova versione sugli store.
import { useEffect, useState } from 'react'
import { AIRPORT_CITY } from './airports'

export interface Aeroporto {
  codice: string
  nome: string
  /** città come la scrive OurAirports (in inglese) */
  citta: string
  /** paese ISO a due lettere */
  paese: string
  fuso: string
  chiavi: string
}

type Riga = [string, string, string, string, string, string]
interface Dati {
  aggiornato: string
  voci: Riga[]
}

export const CHIAVE_AEROPORTI = 'jp.aeroporti'
const CHIAVE_CONTROLLO = 'jp.aeroporti.controllo'
const URL_AGGIORNATO = 'https://raw.githubusercontent.com/lorenzodipi/Journey-Planner/dati-aeroporti/aeroporti.json'
const OGNI = 7 * 24 * 3600 * 1000

/** Un elenco va bene solo se ha la forma giusta e abbastanza aeroporti (un file rotto non sostituisce quello buono). */
export function datiValidi(d: unknown): d is Dati {
  const x = d as Dati
  return !!x && typeof x.aggiornato === 'string' && Array.isArray(x.voci) && x.voci.length > 2000 && x.voci.every((r) => Array.isArray(r) && /^[A-Z]{3}$/.test(r[0]) && typeof r[4] === 'string')
}

const daRiga = ([codice, nome, citta, paese, fuso, chiavi]: Riga): Aeroporto => ({ codice, nome, citta, paese, fuso, chiavi })

function salvati(): Dati | null {
  try {
    const d: unknown = JSON.parse(localStorage.getItem(CHIAVE_AEROPORTI) ?? 'null')
    return datiValidi(d) ? d : null
  } catch {
    return null
  }
}

/** Controlla se online c'è un elenco più nuovo e lo tiene per la prossima volta. Mai più di una volta a settimana. */
async function aggiorna(attuale: string): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const ultimo = Number(localStorage.getItem(CHIAVE_CONTROLLO) ?? 0)
    if (Date.now() - ultimo < OGNI) return
    localStorage.setItem(CHIAVE_CONTROLLO, String(Date.now()))
    const res = await fetch(URL_AGGIORNATO, { cache: 'no-store' })
    if (!res.ok) return
    const d: unknown = await res.json()
    if (datiValidi(d) && d.aggiornato > attuale) localStorage.setItem(CHIAVE_AEROPORTI, JSON.stringify(d))
  } catch {
    // senza rete o con un file rotto si tiene l'elenco che c'è
  }
}

let elenco: Promise<Aeroporto[]> | null = null
let perCodice: Map<string, Aeroporto> | null = null

/** L'elenco degli aeroporti: il più nuovo tra quello dell'app e quello tenuto sul telefono. */
export function caricaAeroporti(): Promise<Aeroporto[]> {
  elenco ??= (async () => {
    const base = (await import('../data/aeroporti.json')).default as unknown as Dati
    const tel = salvati()
    const d = tel && tel.aggiornato > base.aggiornato ? tel : base
    const voci = d.voci.map(daRiga)
    perCodice = new Map(voci.map((a) => [a.codice, a]))
    void aggiorna(d.aggiornato)
    return voci
  })()
  return elenco
}

/** L'aeroporto di un codice, se l'elenco è già stato caricato (altrimenti `undefined`). */
export const aeroportoCaricato = (codice: string): Aeroporto | undefined => perCodice?.get(codice.trim().toUpperCase())

/** Città da mostrare: in italiano per gli aeroporti più comuni, altrimenti quella dell'elenco. */
export const cittaDi = (a: Aeroporto): string => AIRPORT_CITY[a.codice] ?? a.citta

/** L'elenco per un componente: vuoto finché non è caricato, poi il componente si ridisegna. */
export function useAeroporti(attivo = true): Aeroporto[] | null {
  const [voci, setVoci] = useState<Aeroporto[] | null>(null)
  useEffect(() => {
    if (!attivo) return
    let via = false
    void caricaAeroporti().then((v) => !via && setVoci(v))
    return () => {
      via = true
    }
  }, [attivo])
  return voci
}
