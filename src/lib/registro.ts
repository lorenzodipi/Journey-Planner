// Registro delle modifiche (#60): chi ha cambiato cosa e quando, e avviso d'impatto prima di eliminare.
import type { Attivita, Trip } from '../types'
import { tappeDi } from './prenotazioni'
import { LOCALE, t } from '../i18n'

export const TABELLA_LABEL: Record<string, string> = {
  places: t('il luogo'), days: t('il giorno'), day_items: t('la tappa'), stays: t('l’alloggio'), transports: t('il trasporto'), flights: t('il volo'),
  bookings: t('la prenotazione'), expenses: t('la spesa'), checklist_items: t('la voce della checklist'), settlements: t('un rimborso'),
}
const AZIONE: Record<Attivita['action'], string> = { insert: t('ha aggiunto'), update: t('ha modificato'), delete: t('ha eliminato'), restore: t('ha ripristinato') }

export function autore(trip: Pick<Trip, 'travelers'>, actor?: string, meId?: string): string {
  if (!actor) return t('Qualcuno')
  if (actor === meId) return t('Tu')
  return trip.travelers.find((p) => p.userId === actor)?.name.split(/\s+/)[0] ?? t('Qualcuno')
}

const hm = (d: Date, tz: string) => new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(d)
const ymd = (d: Date, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)

/** «oggi 10:42», «ieri 18:03», «12 nov 18:03». */
export function quandoModifica(at: string, now: Date, tz: string): string {
  const d = new Date(at)
  const g = ymd(d, tz)
  if (g === ymd(now, tz)) return t('oggi {v0}', { v0: hm(d, tz) })
  if (g === ymd(new Date(now.getTime() - 86400000), tz)) return t('ieri {v0}', { v0: hm(d, tz) })
  return `${new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: tz }).format(d).replace('.', '')} ${hm(d, tz)}`
}

/** «Modificata da Gaia · oggi 10:42» per un elemento; null se il registro non lo conosce. */
export function ultimaModifica(trip: Pick<Trip, 'activity' | 'travelers'>, table: string, rowId: string, now: Date, tz: string, meId?: string): string | null {
  const a = (trip.activity ?? []).filter((x) => x.table === table && x.rowId === rowId).sort((x, y) => y.at.localeCompare(x.at))[0]
  if (!a) return null
  const verbo = a.action === 'insert' ? t('Aggiunto') : a.action === 'restore' ? t('Ripristinato') : t('Modificato')
  return t('{verbo} da {v1} · {v2}', { verbo, v1: autore(trip, a.actor, meId), v2: quandoModifica(a.at, now, tz) })
}

/** Riga leggibile del registro: «Gaia ha modificato la tappa «Cena»». */
export function rigaRegistro(trip: Pick<Trip, 'travelers'>, a: Attivita, meId?: string): string {
  const cosa = TABELLA_LABEL[a.table] ?? t('un elemento')
  return `${autore(trip, a.actor, meId)} ${AZIONE[a.action]} ${cosa}${a.title ? ` «${a.title}»` : ''}`
}

export type TipoElemento = 'tappa' | 'luogo' | 'alloggio' | 'prenotazione' | 'trasporto' | 'volo'
const n = (k: number, uno: string, molti: string) => `${k} ${k === 1 ? uno : molti}`

/** Cosa dipende da un elemento (COL-004, BR-06): righe per l'avviso prima di eliminarlo o cambiarlo. Vuoto = nessuna dipendenza. */
export function dipendenze(trip: Trip, tipo: TipoElemento, id: string): string[] {
  const out: string[] = []
  const doc = (kind: 'day_item' | 'place' | 'stay' | 'flight' | 'transport' | 'booking') => (trip.documents ?? []).filter((d) => d.links.some((l) => l.kind === kind && l.refId === id)).length
  const spese = trip.expenses.filter((e) => e.source?.id === id).length
  if (tipo === 'tappa') {
    const k = (trip.bookingLinks ?? []).filter((l) => l.itemId === id).length
    if (k) out.push(n(k, t('prenotazione collegata'), t('prenotazioni collegate')))
    if (doc('day_item')) out.push(n(doc('day_item'), t('documento'), t('documenti')))
  } else if (tipo === 'luogo') {
    const tappe = trip.days.flatMap((d) => d.items.filter((i) => i.placeId === id).map(() => d.id))
    if (tappe.length) out.push(t('{v0} in {v1}', { v0: n(tappe.length, t('tappa'), t('tappe')), v1: n(new Set(tappe).size, t('giorno'), t('giorni')) }))
    if (doc('place')) out.push(n(doc('place'), t('documento'), t('documenti')))
  } else if (tipo === 'alloggio') {
    const s = trip.stays.find((x) => x.id === id)
    if (s) {
      const notti = Math.max(0, Math.round((Date.parse(s.checkOut) - Date.parse(s.checkIn)) / 86400000))
      if (notti) out.push(t('{v0} di copertura', { v0: n(notti, t('notte'), t('notti')) }))
    }
    if (doc('stay')) out.push(n(doc('stay'), t('documento'), t('documenti')))
  } else if (tipo === 'prenotazione') {
    const k = tappeDi(trip, id).length
    if (k) out.push(n(k, t('tappa collegata'), t('tappe collegate')))
    const b = trip.bookings.find((x) => x.id === id)
    if (b?.filePath) out.push(t('un file allegato'))
    if (doc('booking')) out.push(n(doc('booking'), t('documento'), t('documenti')))
  } else {
    const kind = tipo === 'volo' ? 'flight' : 'transport'
    if (doc(kind)) out.push(n(doc(kind), t('documento'), t('documenti')))
    const codici = (trip.ticketCodes ?? []).filter((c) => c.refId === id).length
    if (codici) out.push(n(codici, t('codice del biglietto'), t('codici dei biglietti')))
  }
  if (spese) out.push(n(spese, t('spesa collegata'), t('spese collegate')))
  return out
}

/** Testo del conferma-eliminazione con l'elenco delle dipendenze. */
export const conDipendenze = (base: string, righe: string[]): string => (righe.length ? t('{base} È collegato a: {v1}.', { base, v1: righe.join(', ') }) : base)
