// Come ci si sposta tra due tappe (migrazione 0045). Il viaggio ha un mezzo di solito usato («In auto», «Con i mezzi»,
// «A piedi») e una soglia sotto cui si va a piedi; ogni spostamento può avere un mezzo scelto a mano e la durata vera.
// Ordine: mezzo scelto a mano → trasporto del giorno che copre il tratto → a piedi se breve → mezzo del viaggio.
import type { DayItem, MezzoTratto, MezzoViaggio, TransportMode, Trip } from '../types'

export type { MezzoTratto, MezzoViaggio }
/** Il mezzo di un tratto: uno preciso, un trasporto del giorno, o «con i mezzi» generico. */
export type MezzoEffettivo = TransportMode | 'transit'

export const MEZZI_TRATTO: MezzoTratto[] = ['walk', 'metro', 'bus', 'train', 'taxi', 'car']
export const MEZZI_VIAGGIO: MezzoViaggio[] = ['car', 'transit', 'walk']
/** Sotto questi minuti a piedi si va a piedi (se il viaggio non dice altro). */
export const SOGLIA_PIEDI_MIN = 15
/** La linea d'aria per la distanza su strada. */
export const DETOUR = 1.3

/** Velocità medie in km/h, per stimare quando non c'è un percorso calcolato né una durata scritta. */
const KMH: Record<MezzoEffettivo, number> = { walk: 5, transit: 25, metro: 25, bus: 18, train: 45, taxi: 30, car: 45, ferry: 25, plane: 500, other: 25 }

const TESTO: Record<MezzoEffettivo, string> = {
  walk: 'A piedi',
  transit: 'Con i mezzi',
  metro: 'In metro',
  bus: 'In autobus',
  train: 'In treno',
  taxi: 'In taxi',
  car: 'In auto',
  ferry: 'In traghetto',
  plane: 'In aereo',
  other: 'Con i mezzi',
}
/** «a piedi», «in auto»…: per le frasi («8 min a piedi da qui»). */
export const testoMezzo = (m: MezzoEffettivo) => TESTO[m].toLowerCase()
export const etichettaMezzo = (m: MezzoEffettivo) => TESTO[m]

const GLIFO: Record<MezzoEffettivo, string> = {
  walk: 'g-walk',
  transit: 'g-metro',
  metro: 'g-tra-metro',
  bus: 'g-tra-bus',
  train: 'g-tra-train',
  taxi: 'g-tra-taxi',
  car: 'g-tra-car',
  ferry: 'g-tra-ferry',
  plane: 'g-tra-plane',
  other: 'g-metro',
}
export const glifoMezzo = (m: MezzoEffettivo) => GLIFO[m]

/** Nome del riquadro nel foglio dello spostamento. */
export const NOME_MEZZO: Record<MezzoTratto, string> = { walk: 'A piedi', metro: 'Metro', bus: 'Autobus', train: 'Treno', taxi: 'Taxi', car: 'Auto' }

export interface Impostazioni {
  mezzo: MezzoViaggio
  /** 0 = mai a piedi se non scelto */
  sogliaMin: number
}

export const impostazioniViaggio = (trip: Pick<Trip, 'moveMode' | 'walkMaxMin'>): Impostazioni => ({ mezzo: trip.moveMode ?? 'transit', sogliaMin: trip.walkMaxMin ?? SOGLIA_PIEDI_MIN })

/** Minuti con un mezzo per una distanza su strada (già moltiplicata per la deviazione). */
export function minutiStimati(mezzo: MezzoEffettivo, metri: number): number {
  return Math.max(1, Math.round((metri / 1000 / KMH[mezzo]) * 60))
}

export type Fonte = 'scelto' | 'trasporto' | 'breve' | 'viaggio'

/** Il mezzo di un tratto lungo `lineaAriaM` metri in linea d'aria. `via` = mezzo del trasporto del giorno che copre il tratto. */
export function scegliMezzo(lineaAriaM: number, o: { scelto?: MezzoTratto | null; via?: TransportMode; imp: Impostazioni }): { mezzo: MezzoEffettivo; fonte: Fonte } {
  if (o.scelto) return { mezzo: o.scelto, fonte: 'scelto' }
  if (o.via) return { mezzo: o.via, fonte: 'trasporto' }
  if (o.imp.mezzo === 'walk') return { mezzo: 'walk', fonte: 'viaggio' }
  if (o.imp.sogliaMin > 0 && minutiStimati('walk', lineaAriaM * DETOUR) <= o.imp.sogliaMin) return { mezzo: 'walk', fonte: 'breve' }
  return { mezzo: o.imp.mezzo === 'car' ? 'car' : 'transit', fonte: 'viaggio' }
}

/** Come si disegna un tratto sulla mappa: a piedi o in auto lungo le strade, altrimenti in linea d'aria. */
export function tipoSuMappa(mezzo: MezzoEffettivo): 'walk' | 'drive' | 'line' {
  if (mezzo === 'walk') return 'walk'
  if (mezzo === 'car' || mezzo === 'taxi') return 'drive'
  return 'line'
}

export interface Spostamento {
  mode: MezzoEffettivo
  /** «A piedi · 8 min», «In auto · 45 min» */
  text: string
  minutes: number
  /** distanza su strada (calcolata o stimata) */
  meters: number
  icon: string
  fonte: Fonte
  /** la durata è scritta a mano */
  manuale: boolean
}

/** «45 min», «2 h 07». */
export function durata(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`
}

/**
 * Lo spostamento tra due tappe. `strada` = percorso calcolato lungo le strade per quel tratto (a piedi o in auto), se c'è;
 * `minuti` = durata scritta a mano, che vince su tutto.
 */
export function spostamento(lineaAriaM: number, o: { scelto?: MezzoTratto | null; minuti?: number | null; via?: TransportMode; imp: Impostazioni; strada?: { meters: number; seconds: number } | null }): Spostamento {
  const { mezzo, fonte } = scegliMezzo(lineaAriaM, o)
  const meters = o.strada?.meters || lineaAriaM * DETOUR
  const manuale = o.minuti != null && o.minuti > 0
  const minutes = manuale ? (o.minuti as number) : o.strada && o.strada.seconds > 0 && tipoSuMappa(mezzo) !== 'line' ? Math.max(1, Math.round(o.strada.seconds / 60)) : minutiStimati(mezzo, lineaAriaM * DETOUR)
  return { mode: mezzo, text: `${TESTO[mezzo]} · ${durata(minutes)}`, minutes, meters, icon: GLIFO[mezzo], fonte, manuale }
}

/** «a piedi», «in auto», «tra autobus e a piedi», «tra metro, autobus e a piedi». */
export function comeCiSiMuove(modi: MezzoEffettivo[]): string {
  const nomi = [...new Set(modi.map((m) => (m === 'walk' ? 'a piedi' : m === 'transit' || m === 'other' ? 'mezzi pubblici' : TESTO[m].replace(/^In /, '').toLowerCase())))]
  if (nomi.length === 0) return ''
  if (nomi.length === 1) return nomi[0] === 'a piedi' ? 'a piedi' : nomi[0] === 'mezzi pubblici' ? 'con i mezzi' : TESTO[modi[0]].toLowerCase()
  // a piedi per ultimo, come si dice
  const ord = [...nomi.filter((n) => n !== 'a piedi'), ...nomi.filter((n) => n === 'a piedi')]
  return `tra ${ord.slice(0, -1).join(', ')} e ${ord[ord.length - 1]}`
}

/** Modo di Google Maps per un insieme di tratti. */
export function modoGoogle(modi: MezzoEffettivo[]): 'walking' | 'driving' | 'transit' {
  if (modi.length > 0 && modi.every((m) => m === 'walk')) return 'walking'
  if (modi.length > 0 && modi.every((m) => m === 'car' || m === 'taxi' || m === 'walk')) return 'driving'
  return 'transit'
}

/** Il mezzo da proporre per un viaggio senza scelta: in auto se c'è un'auto (noleggio o trasporti in auto) o nel paese non c'è metro. */
export function mezzoSuggerito(trip: Pick<Trip, 'destination' | 'bookings' | 'transports' | 'countries'>): { mezzo: MezzoViaggio; perche: string } | null {
  const paesi = [{ chiave: trip.destination, nome: trip.destination }, ...(trip.countries ?? []).flatMap((c) => [{ chiave: c.name, nome: c.name }, { chiave: c.country, nome: c.name }])]
  const senzaMetro = paesi.find((p) => SENZA_METRO.has((p.chiave ?? '').trim().toLowerCase()))?.nome?.trim()
  const auto = trip.bookings.some((b) => b.type === 'rental') || trip.transports.some((t) => t.mode === 'car')
  if (auto && senzaMetro) return { mezzo: 'car', perche: `In ${senzaMetro} non c’è la metro e c’è un’auto tra le prenotazioni.` }
  if (auto) return { mezzo: 'car', perche: 'C’è un’auto tra le prenotazioni.' }
  if (senzaMetro) return { mezzo: 'car', perche: `In ${senzaMetro} non c’è la metro.` }
  return null
}
/** Paesi senza metropolitana, dove fuori città ci si muove quasi solo in auto (nomi e codici ISO). */
const SENZA_METRO = new Set(['islanda', 'iceland', 'is', 'isole fær øer', 'isole faroe', 'faroe islands', 'fo', 'groenlandia', 'greenland', 'gl', 'nuova zelanda', 'new zealand', 'nz', 'montenegro', 'me', 'albania', 'al'])

/** Il mezzo scelto a mano per arrivare a una tappa (se valido). */
export const sceltoPer = (item: Pick<DayItem, 'arriveMode'> | undefined): MezzoTratto | null => (item?.arriveMode && (MEZZI_TRATTO as string[]).includes(item.arriveMode) ? item.arriveMode : null)
