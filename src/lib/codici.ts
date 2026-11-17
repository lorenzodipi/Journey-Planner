// Codice del biglietto (#38): quali immagini ha una voce e per quali passeggeri.
import type { TicketCode, TicketKind, Trip } from '../types'
import { t } from '../i18n'

/** Codici salvati per una voce (trasporto, volo o prenotazione), nell'ordine dei viaggiatori; quelli «per tutti» in fondo. */
export function codiciDi(trip: Pick<Trip, 'ticketCodes' | 'travelers'>, kind: TicketKind, refId: string): TicketCode[] {
  const order = (c: TicketCode) => {
    const i = c.travelerId ? trip.travelers.findIndex((p) => p.id === c.travelerId) : -1
    return i < 0 ? 999 : i
  }
  return (trip.ticketCodes ?? []).filter((c) => c.kind === kind && c.refId === refId).sort((a, b) => order(a) - order(b))
}

/** Il codice di un passeggero: il suo, altrimenti quello «per tutti».
 *  Con `leg` (voli con scalo, 0051) vale solo il codice di quella tratta o quello senza tratta, che vale per tutte;
 *  a parità di persona vince quello della tratta. */
export function codicePer(codes: TicketCode[], travelerId: string | undefined, leg?: number): TicketCode | undefined {
  const per = (c: TicketCode) => (c.travelerId ? c.travelerId === travelerId : false)
  const tutti = (c: TicketCode) => !c.travelerId
  if (leg === undefined) return codes.find(per) ?? codes.find(tutti)
  const tratta = (c: TicketCode) => c.leg === leg
  const sempre = (c: TicketCode) => !c.leg
  return codes.find((c) => per(c) && tratta(c)) ?? codes.find((c) => per(c) && sempre(c)) ?? codes.find((c) => tutti(c) && tratta(c)) ?? codes.find((c) => tutti(c) && sempre(c))
}

/** Codice di un'altra tratta dello stesso passeggero (o «per tutti»), per «Usa quella della prima tratta». */
export function codiceAltraTratta(codes: TicketCode[], travelerId: string | undefined, leg: number): TicketCode | undefined {
  const mio = codes.filter((c) => (c.travelerId ? c.travelerId === travelerId : true) && c.leg && c.leg !== leg)
  return mio.sort((a, b) => Number(!a.travelerId) - Number(!b.travelerId) || (a.leg ?? 0) - (b.leg ?? 0))[0]
}

/** Passeggeri a cui manca ancora un codice (tra quelli per cui vale la voce). */
export function senzaCodice(codes: TicketCode[], travelerIds: string[]): string[] {
  if (codes.some((c) => !c.travelerId)) return []
  return travelerIds.filter((id) => !codes.some((c) => c.travelerId === id))
}

export const nBiglietti = (n: number) => (n === 1 ? '1 biglietto' : t('{n} biglietti', { n }))

export function checkImmagine(file: File): string | null {
  if (!file.type.startsWith('image/')) return t('Serve una foto o uno screenshot del codice: scegli un\'immagine.')
  if (file.size > 10 * 1024 * 1024) return t('L\'immagine supera 10 MB: scegline una più leggera.')
  return null
}
