// Allerte di viaggio in Oggi e nel Giorno, senza un server sempre acceso:
// - meteo: calcolate dalle previsioni orarie che l'app scarica già (Open-Meteo): pioggia, pioggia forte, temporale,
//   vento forte, neve, caldo e freddo estremi. Sono stime dell'app, non allerte ufficiali, e lo dicono («Previsione»);
// - terremoti: quelli delle ultime 24 ore vicino alle città del giorno, dal catalogo USGS (una richiesta piccola, solo
//   durante il viaggio). Si vedono aprendo l'app: non sono un allarme e non dicono mai che non c'è pericolo di tsunami.
import type { OraPrevista } from './oggi'
import { avvisoPioggia, prossimeOre } from './oggi'
import type { DayWeather } from './weather'
import { LOCALE, t as tt } from '../i18n'

export type LivelloAllerta = 'pericolo' | 'attenzione' | 'info'
export type TipoAllerta = 'pioggia' | 'temporale' | 'vento' | 'neve' | 'caldo' | 'freddo' | 'terremoto'

export interface Allerta {
  /** stabile tra un aggiornamento e l'altro (chiave React) */
  id: string
  tipo: TipoAllerta
  livello: LivelloAllerta
  titolo: string
  testo: string
  /** «Previsione» o «USGS · 2 ore fa» */
  fonte: string
  /** righe del dettaglio: etichetta → valore */
  dettagli: { k: string; v: string }[]
  /** pagina ufficiale da aprire */
  url?: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const ORDINE: Record<LivelloAllerta, number> = { pericolo: 0, attenzione: 1, info: 2 }

/** Le allerte dalla più grave; a parità, nell'ordine in cui arrivano. Una sola per tipo (la prima che arriva: per i terremoti la più recente). */
export function ordinaAllerte(a: Allerta[]): Allerta[] {
  const visti = new Set<TipoAllerta>()
  const una = a.filter((x) => (visti.has(x.tipo) ? false : (visti.add(x.tipo), true)))
  return una.map((x, i) => ({ x, i })).sort((p, q) => ORDINE[p.x.livello] - ORDINE[q.x.livello] || p.i - q.i).map((p) => p.x)
}

/** Soglie (km/h, mm/h, °C percepiti). Prudenti: un'allerta in più costa meno di una in meno, ma non deve suonare a ogni nuvola. */
export const SOGLIE = {
  raffica: { attenzione: 60, pericolo: 90 },
  vento: { attenzione: 40, pericolo: 65 },
  pioggiaForte: { attenzione: 8, pericolo: 20 },
  caldo: { attenzione: 35, pericolo: 40 },
  freddo: { attenzione: -10, pericolo: -20 },
} as const

/** Il primo tratto di ore consecutive che soddisfano `ok`, con il valore più alto di `misura`. */
function tratto(ore: OraPrevista[], ok: (h: OraPrevista) => boolean, misura: (h: OraPrevista) => number) {
  const i = ore.findIndex(ok)
  if (i < 0) return null
  let j = i
  while (j + 1 < ore.length && ok(ore[j + 1])) j++
  const parte = ore.slice(i, j + 1)
  return { da: ore[i], a: ore[j], max: Math.max(...parte.map(misura)), ore: parte }
}

const orario = (da: OraPrevista, a: OraPrevista, oggi: string) => {
  const g = (o: OraPrevista) => (o.date === oggi ? '' : tt('domani') + ' ')
  return tt('dalle {da} alle {a}', { da: `${g(da)}${pad(da.h)}:00`, a: `${g(a)}${pad((a.h + 1) % 24)}:00` })
}

/**
 * Allerte meteo dalle ore previste (di norma le prossime 12-24). `oggi` serve a scrivere «domani» quando passano la
 * mezzanotte; `citta` finisce nel dettaglio.
 */
export function allerteMeteo(ore: OraPrevista[], oggi: string, citta: string): Allerta[] {
  if (ore.length === 0) return []
  const out: Allerta[] = []
  const fonte = tt('Previsione')
  const dove = citta ? [{ k: tt('Dove'), v: citta }] : []
  const base = (tipo: TipoAllerta, livello: LivelloAllerta, titolo: string, testo: string, quando: string): Allerta => ({
    id: `${tipo}:${ore[0].date}:${citta}`,
    tipo,
    livello,
    titolo,
    testo,
    fonte,
    dettagli: [...dove, { k: tt('Quando'), v: quando }, { k: tt('Fonte'), v: tt('Previsione oraria Open-Meteo, calcolata dall\'app') }],
  })

  // temporale (codici WMO 95-99)
  const tem = tratto(ore, (h) => h.code >= 95, (h) => h.code)
  if (tem) {
    const q = orario(tem.da, tem.a, oggi)
    out.push(base('temporale', tem.max >= 96 ? 'pericolo' : 'attenzione', tem.max >= 96 ? tt('Temporale con grandine') : tt('Temporale'), tt('Previsto {q}.', { q }), q))
  }

  // pioggia forte, altrimenti la pioggia di sempre
  const forte = tratto(ore, (h) => (h.mm ?? 0) >= SOGLIE.pioggiaForte.attenzione, (h) => h.mm ?? 0)
  if (forte) {
    const q = orario(forte.da, forte.a, oggi)
    const mm = Math.round(forte.ore.reduce((s, h) => s + (h.mm ?? 0), 0))
    const molto = forte.max >= SOGLIE.pioggiaForte.pericolo
    out.push({
      ...base('pioggia', molto ? 'pericolo' : 'attenzione', molto ? tt('Pioggia molto forte') : tt('Pioggia forte'), tt('Circa {mm} mm {q}. Attenzione alle zone basse.', { mm, q }), q),
      dettagli: [...dove, { k: tt('Quando'), v: q }, { k: tt('Quanta'), v: tt('Circa {mm} mm, fino a {max} mm in un\'ora', { mm, max: Math.round(forte.max) }) }, { k: tt('Fonte'), v: tt('Previsione oraria Open-Meteo, calcolata dall\'app') }],
    })
  } else {
    const p = avvisoPioggia(ore.slice(0, 12))
    if (p) out.push({ ...base('pioggia', 'info', p.title, p.text, p.title), dettagli: [...dove, { k: tt('Quando'), v: p.text }, { k: tt('Fonte'), v: tt('Previsione oraria Open-Meteo, calcolata dall\'app') }] })
  }

  // vento: le raffiche se ci sono, altrimenti il vento medio
  const conRaffiche = ore.some((h) => h.gust != null)
  const vento = (h: OraPrevista) => (conRaffiche ? (h.gust ?? 0) : (h.wind ?? 0))
  const s = conRaffiche ? SOGLIE.raffica : SOGLIE.vento
  const ve = tratto(ore, (h) => vento(h) >= s.attenzione, vento)
  if (ve) {
    const q = orario(ve.da, ve.a, oggi)
    const km = Math.round(ve.max)
    const forteV = ve.max >= s.pericolo
    out.push({
      ...base('vento', forteV ? 'pericolo' : 'attenzione', forteV ? tt('Vento molto forte') : tt('Vento forte'), conRaffiche ? tt('Raffiche fino a {km} km/h {q}.', { km, q }) : tt('Fino a {km} km/h {q}.', { km, q }), q),
    })
  }

  // neve (codici WMO 71-77, 85-86)
  const ne = tratto(ore, (h) => (h.code >= 71 && h.code <= 77) || h.code === 85 || h.code === 86, () => 0)
  if (ne) {
    const q = orario(ne.da, ne.a, oggi)
    out.push(base('neve', 'attenzione', tt('Neve'), tt('Prevista {q}. Strade e treni possono rallentare.', { q }), q))
  }

  // caldo e freddo (temperatura percepita)
  const perc = (h: OraPrevista) => h.feels ?? h.t
  const ca = tratto(ore, (h) => perc(h) >= SOGLIE.caldo.attenzione, perc)
  if (ca) {
    const q = orario(ca.da, ca.a, oggi)
    out.push(base('caldo', ca.max >= SOGLIE.caldo.pericolo ? 'pericolo' : 'attenzione', tt('Caldo intenso'), tt('Percepiti fino a {g}° {q}. Bevi spesso e cerca l\'ombra.', { g: Math.round(ca.max), q }), q))
  }
  const fr = tratto(ore, (h) => perc(h) <= SOGLIE.freddo.attenzione, (h) => -perc(h))
  if (fr) {
    const q = orario(fr.da, fr.a, oggi)
    out.push(base('freddo', -fr.max <= SOGLIE.freddo.pericolo ? 'pericolo' : 'attenzione', tt('Freddo intenso'), tt('Percepiti fino a {g}° {q}.', { g: Math.round(-fr.max), q }), q))
  }

  return out
}

/** Le ore su cui cercare allerte per un giorno: oggi da adesso alle prossime 24, poi tutto il giorno; nulla per il passato. */
export function oreDelGiorno(days: DayWeather[] | undefined, date: string, today: string, now: Date, timeZone: string): OraPrevista[] {
  if (!days || date < today) return []
  if (date === today) return prossimeOre(days, today, Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(now)), 24)
  return (days.find((d) => d.date === date)?.hours ?? []).map((h) => ({ ...h, date }))
}

// ---------- terremoti ----------

export interface Terremoto {
  id: string
  mag: number
  /** ms */
  time: number
  lat: number
  lng: number
  /** 1 = evento grande in mare (USGS): non è un'allerta tsunami, solo un motivo per controllare quelle ufficiali */
  tsunami: boolean
  url?: string
}

export interface PuntoAllerta {
  city: string
  lat: number
  lng: number
}

/** Distanza in km tra due punti (formula dell'emisenoverso). */
export function distanzaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = (x: number) => (x * Math.PI) / 180
  const dLat = r(b.lat - a.lat)
  const dLng = r(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Dal GeoJSON di USGS solo ciò che serve (scarta il resto, anche i dati malformati). */
export function leggiTerremoti(json: unknown): Terremoto[] {
  const f = (json as { features?: unknown[] } | null)?.features
  if (!Array.isArray(f)) return []
  const out: Terremoto[] = []
  for (const x of f) {
    const p = (x as { id?: unknown; properties?: Record<string, unknown>; geometry?: { coordinates?: unknown[] } }) ?? {}
    const c = p.geometry?.coordinates
    const mag = p.properties?.mag
    const time = p.properties?.time
    if (typeof p.id !== 'string' || !Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number' || typeof mag !== 'number' || typeof time !== 'number') continue
    const url = p.properties?.url
    out.push({ id: p.id, mag, time, lng: c[0], lat: c[1], tsunami: p.properties?.tsunami === 1, ...(typeof url === 'string' && url.startsWith('https://') ? { url } : {}) })
  }
  return out
}

/** Raggio entro cui un terremoto si mostra: più è forte, più lontano si sente. */
export const raggioKm = (mag: number) => (mag >= 7 ? 600 : mag >= 6 ? 400 : 250)
export const MAG_MINIMA = 4.5

const fa = (ms: number) => {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return tt('{n} min fa', { n: min })
  const h = Math.round(min / 60)
  return h === 1 ? tt('1 ora fa') : tt('{n} ore fa', { n: h })
}

/**
 * Terremoti delle ultime 24 ore vicino a una delle città, riferiti alla città più vicina. Se ce ne sono più d'uno se ne
 * mostra solo il più recente: due o tre avvisi sullo stesso tipo, a poche ore di distanza, sono rumore.
 */
export function allerteTerremoti(eventi: Terremoto[], punti: PuntoAllerta[], adesso: number, timeZone: string): Allerta[] {
  const out: Allerta[] = []
  for (const e of [...eventi].sort((x, y) => y.time - x.time)) {
    if (out.length > 0) break
    if (e.mag < MAG_MINIMA || adesso - e.time > 24 * 3600_000 || e.time > adesso + 60_000) continue
    let vicino: { p: PuntoAllerta; km: number } | null = null
    for (const p of punti) {
      const km = distanzaKm(e, p)
      if (km <= raggioKm(e.mag) && (!vicino || km < vicino.km)) vicino = { p, km }
    }
    if (!vicino) continue
    const km = Math.max(1, Math.round(vicino.km / 10) * 10)
    const mag = e.mag.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    const ora = new Date(e.time).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone })
    // forte e vicino = attenzione (possibili scosse dopo, trasporti fermi); altrimenti da sapere
    const livello: LivelloAllerta = (e.mag >= 6 && vicino.km <= 300) || (e.mag >= 5 && vicino.km <= 100) || e.tsunami ? 'attenzione' : 'info'
    const testo = e.tsunami
      ? tt('A circa {km} km da {city}, in mare. Controlla gli avvisi ufficiali di tsunami.', { km, city: vicino.p.city })
      : tt('A circa {km} km da {city}. Possibili scosse dopo e treni rallentati.', { km, city: vicino.p.city })
    out.push({
      id: `terremoto:${e.id}`,
      tipo: 'terremoto',
      livello,
      titolo: tt('Terremoto M{mag} alle {ora}', { mag, ora }),
      testo,
      fonte: `USGS · ${fa(adesso - e.time)}`,
      dettagli: [
        { k: tt('Magnitudo'), v: mag },
        { k: tt('Quando'), v: ora },
        { k: tt('Dove'), v: tt('A circa {km} km da {city}', { km, city: vicino.p.city }) },
        { k: tt('Fonte'), v: tt('USGS, catalogo dei terremoti') },
      ],
      ...(e.url ? { url: e.url } : {}),
    })
  }
  return out
}
