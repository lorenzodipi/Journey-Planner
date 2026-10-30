// Codice del biglietto (#38): quali immagini ha una voce e per quali passeggeri.
import type { TicketCode, TicketKind, Trip } from '../types'

/** Codici salvati per una voce (trasporto, volo o prenotazione), nell'ordine dei viaggiatori; quelli «per tutti» in fondo. */
export function codiciDi(trip: Pick<Trip, 'ticketCodes' | 'travelers'>, kind: TicketKind, refId: string): TicketCode[] {
  const order = (c: TicketCode) => {
    const i = c.travelerId ? trip.travelers.findIndex((p) => p.id === c.travelerId) : -1
    return i < 0 ? 999 : i
  }
  return (trip.ticketCodes ?? []).filter((c) => c.kind === kind && c.refId === refId).sort((a, b) => order(a) - order(b))
}

/** Il codice di un passeggero: il suo, altrimenti quello «per tutti». */
export function codicePer(codes: TicketCode[], travelerId: string | undefined): TicketCode | undefined {
  return codes.find((c) => c.travelerId && c.travelerId === travelerId) ?? codes.find((c) => !c.travelerId)
}

/** Passeggeri a cui manca ancora un codice (tra quelli per cui vale la voce). */
export function senzaCodice(codes: TicketCode[], travelerIds: string[]): string[] {
  if (codes.some((c) => !c.travelerId)) return []
  return travelerIds.filter((id) => !codes.some((c) => c.travelerId === id))
}

export const nBiglietti = (n: number) => (n === 1 ? '1 biglietto' : `${n} biglietti`)

export function checkImmagine(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Serve una foto o uno screenshot del codice: scegli un\'immagine.'
  if (file.size > 10 * 1024 * 1024) return 'L\'immagine supera 10 MB: scegline una più leggera.'
  return null
}
