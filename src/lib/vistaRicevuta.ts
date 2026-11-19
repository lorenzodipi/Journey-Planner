// Quale ricevuta si guarda nella pagina Spese: quella di tutti o solo la mia. La scelta vale per viaggio, resta sul
// telefono (si cancella all'uscita dall'account, come ogni chiave `jp.`) e la seguono la card del budget e la pagina Budget.
import { useSyncExternalStore } from 'react'

export type VistaRicevuta = 'tutti' | 'mia'

const CHIAVE = 'jp.ricevuta'
const ascolta = new Set<() => void>()
let memoria: Record<string, VistaRicevuta> | null = null

function leggiTutto(): Record<string, VistaRicevuta> {
  if (memoria) return memoria
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}') as unknown
    memoria = v && typeof v === 'object' ? (v as Record<string, VistaRicevuta>) : {}
  } catch {
    memoria = {}
  }
  return memoria
}

export function leggiVista(tripId: string): VistaRicevuta {
  return leggiTutto()[tripId] === 'mia' ? 'mia' : 'tutti'
}

export function scegliVista(tripId: string, vista: VistaRicevuta): void {
  if (leggiVista(tripId) === vista) return
  memoria = { ...leggiTutto(), [tripId]: vista }
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(memoria))
  } catch {
    // storage bloccato: la scelta vale finché l'app resta aperta
  }
  ascolta.forEach((f) => f())
}

/** Da chiamare all'uscita dall'account, dopo aver cancellato i dati locali. */
export function dimenticaVista(): void {
  memoria = null
  ascolta.forEach((f) => f())
}

/** La vista scelta per il viaggio, aggiornata quando cambia da un'altra pagina. */
export function useVistaRicevuta(tripId: string): [VistaRicevuta, (v: VistaRicevuta) => void] {
  const vista = useSyncExternalStore(
    (f) => (ascolta.add(f), () => void ascolta.delete(f)),
    () => leggiVista(tripId),
  )
  return [vista, (v) => scegliVista(tripId, v)]
}
