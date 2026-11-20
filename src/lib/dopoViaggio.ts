// «Com'è andata» (Oggi dopo il viaggio): quali card ci sono, con i dati veri del viaggio, e dove vanno.
// Regola completa nel design system («Home dopo il viaggio») e in docs/linee-guida/01-prodotto.md.
import type { Day, DayItem, Place, Trip } from '../types'
import { airportCity } from './airports'
import { daysBetween } from './dates'
import { minutesBetween } from './flights'
import { distanzaM } from './luoghiExtra'
import { paesiDi } from './paesi'
import { nightsOf } from './stays'

export type Larga = 'citta' | 'visto' | 'davedere' | 'volo' | 'dormito' | 'mossi'
export type Stretta = 'paesi' | 'tappe' | 'pieno' | 'checklist'

/** Priorità delle card larghe (la più importante per prima). «citta» non c'è: ha sempre la riga 2 se ha i dati. */
export const PRIORITA_LARGHE: Larga[] = ['visto', 'davedere', 'volo', 'dormito', 'mossi']
/** Priorità delle strette. */
export const PRIORITA_STRETTE: Stretta[] = ['paesi', 'tappe', 'pieno', 'checklist']

export type Riga = { tipo: 'larga'; id: Larga } | { tipo: 'coppia'; id: [Stretta, Stretta] }

/** I sei posti sotto la card viola: larga (la riga 2 è sempre una larga), coppia, larga, larga, coppia, larga. */
const POSTI = ['L', 'P', 'L', 'L', 'P', 'L'] as const

/**
 * Sceglie le righe. `larghe` e `strette` sono le card che hanno i dati, già in ordine di priorità (con «citta» per prima, se c'è).
 * - un posto largo prende la prima larga rimasta; se non ce ne sono prende le due strette con priorità più alta ancora libere;
 * - un posto a coppia prende le due strette con priorità più alta ancora libere;
 * - se non c'è niente da mettere il posto resta vuoto e quelli sotto salgono. Una stretta rimasta da sola non si mostra.
 */
export function struttura(larghe: Larga[], strette: Stretta[]): Riga[] {
  const L = [...larghe]
  const S = [...strette]
  const righe: Riga[] = []
  for (const posto of POSTI) {
    if (posto === 'L' && L.length > 0) righe.push({ tipo: 'larga', id: L.shift() as Larga })
    else if (S.length >= 2) righe.push({ tipo: 'coppia', id: [S.shift() as Stretta, S.shift() as Stretta] })
  }
  return righe
}

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase()
const fatta = (i: Pick<DayItem, 'status' | 'done'>) => (i.status ?? (i.done ? 'done' : 'todo')) === 'done'
const attiva = (i: Pick<DayItem, 'status'>) => i.status !== 'cancelled' && i.status !== 'skipped'

export interface CittaDati {
  nome: string
  /** notti passate lì (dagli alloggi); 0 = in giornata */
  notti: number
  giorni: number
  lat: number
  lng: number
}
export interface Dati {
  giorni: number
  notti: number
  /** tutte le città scritte nei giorni, in ordine; le coordinate ci sono solo dove si sanno */
  citta: string[]
  larghe: Partial<{
    citta: { citta: CittaDati[]; metri: number }
    visto: { totale: number; gruppi: { nome: string; n: number }[] }
    davedere: { nomi: string[]; altri: number }
    volo: { voli: { da: string; a: string }[]; minuti: number; fusoOre: number }
    dormito: { alloggi: { nome: string; notti: number; citta: string }[]; notti: number; altri: number }
    mossi: { mezzi: { mezzo: 'train' | 'metro' | 'bus' | 'car' | 'ferry' | 'walk'; n: number }[] }
  }>
  strette: Partial<{
    paesi: { codici: string[]; valute: number }
    tappe: { fatte: number; pianificate: number; pct: number }
    pieno: { date: string; n: number; citta: string }
    checklist: { fatte: number; totale: number }
  }>
}

/** Differenza di fuso tra due zone IANA in ore (positiva = la prima è avanti), alla data indicata. */
export function differenzaFusoOre(destinazione: string, casa: string, ymd: string): number {
  const off = (tz: string) => {
    try {
      const parti = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(new Date(`${ymd}T12:00:00Z`))
      const v = parti.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
      const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(v)
      if (!m) return 0
      return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0))
    } catch {
      return 0
    }
  }
  return Math.round(((off(destinazione) - off(casa)) / 60) * 10) / 10
}

/** Le città del viaggio, in ordine, con le coordinate ricavate dai luoghi collegati ai giorni e dai luoghi della città. */
function cittaDelViaggio(trip: Trip): { tutte: string[]; conPosto: CittaDati[] } {
  const tutte: string[] = []
  for (const d of trip.days) {
    const c = d.city?.trim()
    if (c && !tutte.some((x) => norm(x) === norm(c))) tutte.push(c)
  }
  const luogo = new Map<string, Place>(trip.places.map((p) => [p.id, p]))
  const conPosto: CittaDati[] = []
  for (const nome of tutte) {
    const giorniLi: Day[] = trip.days.filter((d) => norm(d.city) === norm(nome))
    const punti: { lat: number; lng: number }[] = []
    const aggiungi = (p: Place | undefined) => {
      if (p && p.lat != null && p.lng != null) punti.push({ lat: p.lat, lng: p.lng })
    }
    for (const d of giorniLi) for (const i of d.items) aggiungi(i.placeId ? luogo.get(i.placeId) : undefined)
    for (const p of trip.places) if (norm(p.city) === norm(nome)) aggiungi(p)
    if (punti.length === 0) continue
    const notti = trip.stays.filter((s) => norm(s.city) === norm(nome)).reduce((s, x) => s + nightsOf(x), 0)
    conPosto.push({ nome, notti, giorni: giorniLi.length, lat: punti.reduce((s, p) => s + p.lat, 0) / punti.length, lng: punti.reduce((s, p) => s + p.lng, 0) / punti.length })
  }
  return { tutte, conPosto }
}

/** Tutti i dati delle card. Una card c'è solo se ha un valore che dice qualcosa: niente zeri, niente stime. */
export function datiDopo(trip: Trip, opzioni: { checklist?: boolean } = {}): Dati {
  const giorni = trip.days.length || daysBetween(trip.startDate, trip.endDate) + 1
  const notti = Math.max(0, daysBetween(trip.startDate, trip.endDate))
  const { tutte, conPosto } = cittaDelViaggio(trip)
  const larghe: Dati['larghe'] = {}
  const strette: Dati['strette'] = {}

  // le città: almeno 2, con la posizione
  if (conPosto.length >= 2) {
    let metri = 0
    for (let k = 1; k < conPosto.length; k++) metri += distanzaM(conPosto[k - 1], conPosto[k])
    larghe.citta = { citta: conPosto, metri }
  }

  const luogo = new Map<string, Place>(trip.places.map((p) => [p.id, p]))
  const items = trip.days.flatMap((d) => d.items)
  const fatte = items.filter(fatta)

  // cosa avete visto: almeno 5 tappe fatte con un tipo
  const tipo = (i: DayItem): string => {
    const p = i.placeId ? luogo.get(i.placeId) : undefined
    return (p?.category || trip.categories.find((c) => c.id === i.categoryId)?.label || '').trim()
  }
  const perTipo = new Map<string, number>()
  for (const i of fatte) {
    if (i.kind === 'transport' || i.kind === 'flight' || i.kind === 'note') continue
    const t = tipo(i)
    if (t) perTipo.set(t, (perTipo.get(t) ?? 0) + 1)
  }
  const totaleTipi = [...perTipo.values()].reduce((s, n) => s + n, 0)
  if (totaleTipi >= 5) {
    const ordine = [...perTipo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([nome, n]) => ({ nome, n }))
    // al massimo cinque voci: le prime quattro e il resto insieme («Altro», a cura di chi disegna)
    const gruppi = ordine.length > 5 ? [...ordine.slice(0, 4), { nome: '', n: ordine.slice(4).reduce((s, g) => s + g.n, 0) }] : ordine
    larghe.visto = { totale: totaleTipi, gruppi }
  }

  // da vedere la prossima volta: luoghi del viaggio mai visitati, al massimo 5
  const visti = new Set(fatte.map((i) => i.placeId).filter(Boolean) as string[])
  const mancanti = trip.places.filter((p) => (p.status === 'idea' || p.status === 'planned') && !visti.has(p.id))
  if (mancanti.length > 0) larghe.davedere = { nomi: mancanti.slice(0, 5).map((p) => p.name), altri: Math.max(0, mancanti.length - 5) }

  // in volo
  const voli = trip.flights.filter((f) => f.legs.length > 0).sort((a, b) => a.legs[0].departAt.localeCompare(b.legs[0].departAt))
  if (voli.length > 0) {
    const tratte = voli.flatMap((f) => f.legs)
    const minuti = tratte.reduce((s, l) => s + Math.max(0, minutesBetween(l.departAt, l.arriveAt)), 0)
    const casa = [...tratte].sort((a, b) => a.departAt.localeCompare(b.departAt))[0].fromTz
    const fusoOre = casa && trip.timezone ? differenzaFusoOre(trip.timezone, casa, trip.startDate) : 0
    larghe.volo = { voli: voli.map((f) => ({ da: airportCity(f.legs[0].from), a: airportCity(f.legs[f.legs.length - 1].to) })), minuti, fusoOre }
  }

  // dove avete dormito: almeno 2 alloggi con notti
  const alloggi = trip.stays.filter((s) => nightsOf(s) > 0).sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  if (alloggi.length >= 2) {
    larghe.dormito = {
      alloggi: alloggi.slice(0, 5).map((s) => ({ nome: s.name, notti: nightsOf(s), citta: s.city })),
      notti: alloggi.reduce((s, x) => s + nightsOf(x), 0),
      altri: Math.max(0, alloggi.length - 5),
    }
  }

  // come vi siete mossi: i mezzi registrati (i voli hanno la loro card), almeno 2 corse
  const perMezzo = new Map<string, number>()
  for (const t of trip.transports) if (t.mode !== 'plane' && t.mode !== 'other') perMezzo.set(t.mode, (perMezzo.get(t.mode) ?? 0) + 1)
  const corse = [...perMezzo.values()].reduce((s, n) => s + n, 0)
  if (corse >= 2) {
    larghe.mossi = {
      mezzi: [...perMezzo.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([mezzo, n]) => ({ mezzo: mezzo as 'train', n })),
    }
  }

  // paesi: almeno 2
  const paesi = paesiDi(trip)
  if (paesi.length >= 2) strette.paesi = { codici: paesi.map((p) => (p.country || p.name.slice(0, 2)).toUpperCase()), valute: new Set(paesi.map((p) => p.currency).filter(Boolean)).size }

  // tappe fatte: almeno 5 tappe e qualcuna fatta
  const pianificate = items.filter(attiva).length
  if (pianificate >= 5 && fatte.length >= 1) strette.tappe = { fatte: fatte.length, pianificate, pct: Math.round((fatte.length / pianificate) * 100) }

  // giorno più pieno: almeno 3 giorni con tappe
  const conTappe = trip.days.filter((d) => d.items.filter(attiva).length > 0)
  if (conTappe.length >= 3) {
    const top = [...conTappe].sort((a, b) => b.items.filter(attiva).length - a.items.filter(attiva).length || a.date.localeCompare(b.date))[0]
    strette.pieno = { date: top.date, n: top.items.filter(attiva).length, citta: top.city?.trim() ?? '' }
  }

  // checklist: almeno 5 voci (non per chi guarda soltanto)
  if (opzioni.checklist !== false && trip.checklist.length >= 5) {
    strette.checklist = { fatte: trip.checklist.filter((c) => c.done).length, totale: trip.checklist.length }
  }

  return { giorni, notti, citta: tutte, larghe, strette }
}

/** Le righe da disegnare per un viaggio. */
export function righeDopo(d: Dati): Riga[] {
  const larghe: Larga[] = [...(d.larghe.citta ? (['citta'] as Larga[]) : []), ...PRIORITA_LARGHE.filter((id) => d.larghe[id])]
  const strette = PRIORITA_STRETTE.filter((id) => d.strette[id])
  return struttura(larghe, strette)
}
