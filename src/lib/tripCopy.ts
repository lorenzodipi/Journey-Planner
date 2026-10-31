// Duplica come modello (#59, TRIP-010): luoghi, categorie, struttura dei giorni (tappe senza stati), checklist comune senza spunte;
// facoltativi alloggi, trasporti e prenotazioni, sempre senza spese, pagamenti, file, documenti e dati personali.
import { client } from './db'
import { spostaData } from './gestioneViaggio'
import { enumerateDates } from './tripDays'

type Row = Record<string, unknown>
const SISTEMA = ['created_at', 'updated_at', 'deleted_at', 'owner_id', 'created_by', 'updated_by']
const pulisci = (r: Row, ...extra: string[]): Row => {
  const o = { ...r }
  for (const k of [...SISTEMA, ...extra]) delete o[k]
  return o
}
const uuid = () => crypto.randomUUID()

export interface OpzioniModello {
  /** id del nuovo viaggio, già creato con le nuove date e le persone */
  nuovoId: string
  vecchioId: string
  vecchioInizio: string
  nuovoInizio: string
  nuovoFine: string
  conLogistica: boolean
}

async function leggi(table: string, tripId: string): Promise<Row[]> {
  const r = await client().from(table).select('*').eq('trip_id', tripId).is('deleted_at', null)
  if (r.error) throw r.error
  return (r.data ?? []) as Row[]
}
async function scrivi(table: string, rows: Row[]) {
  if (!rows.length) return
  const r = await client().from(table).insert(rows)
  if (r.error) throw r.error
}

export async function copiaComeModello(o: OpzioniModello): Promise<void> {
  const db = client()
  const scarto = Math.round((Date.parse(o.nuovoInizio) - Date.parse(o.vecchioInizio)) / 86400000)
  const nuovaData = (d: unknown) => (typeof d === 'string' && d ? spostaData(d.slice(0, 10), scarto) : d)
  const nuovoIstante = (d: unknown) => (typeof d === 'string' && d ? new Date(Date.parse(d) + scarto * 86400000).toISOString() : d)

  // categorie e luoghi
  const cat = new Map<string, string>()
  const categorie = (await leggi('categories', o.vecchioId)).map((r) => {
    const id = uuid()
    cat.set(String(r.id), id)
    return { ...pulisci(r), id, trip_id: o.nuovoId }
  })
  await scrivi('categories', categorie)
  const luoghi = new Map<string, string>()
  await scrivi('places', (await leggi('places', o.vecchioId)).map((r) => {
    const id = uuid()
    luoghi.set(String(r.id), id)
    return { ...pulisci(r), id, trip_id: o.nuovoId, category_id: r.category_id ? (cat.get(String(r.category_id)) ?? null) : null }
  }))

  // giorni: quelli del nuovo viaggio esistono già per data; si copiano città, titolo, note e tappe
  const vecchi = await leggi('days', o.vecchioId)
  const nuovi = await db.from('days').select('id, date').eq('trip_id', o.nuovoId)
  if (nuovi.error) throw nuovi.error
  const perData = new Map((nuovi.data as { id: string; date: string }[]).map((d) => [d.date, d.id]))
  const giorno = new Map<string, string>()
  for (const v of vecchi) {
    const nid = perData.get(spostaData(String(v.date), scarto))
    if (!nid) continue
    giorno.set(String(v.id), nid)
    const up = await db.from('days').update({ city: v.city ?? null, title: v.title ?? null, notes: v.notes ?? null }).eq('id', nid)
    if (up.error) throw up.error
  }
  await scrivi('day_items', (await leggi('day_items', o.vecchioId)).filter((r) => giorno.has(String(r.day_id))).map((r) => ({
    ...pulisci(r, 'status_changed_at', 'postponed_from_day_id', 'lock_changed_by', 'lock_changed_at'),
    id: uuid(), trip_id: o.nuovoId, day_id: giorno.get(String(r.day_id)),
    place_id: r.place_id ? (luoghi.get(String(r.place_id)) ?? null) : null,
    category_id: r.category_id ? (cat.get(String(r.category_id)) ?? null) : null,
    ...('status' in r ? { status: 'todo' } : {}), done: false, ...('participants' in r ? { participants: [] } : {}),
  })))

  // checklist comune, senza spunte
  await scrivi('checklist_items', (await leggi('checklist_items', o.vecchioId)).filter((r) => !r.traveler_id && !r.owner_id).map((r) => ({
    ...pulisci(r), id: uuid(), trip_id: o.nuovoId, done: false, ...('quantity_done' in r ? { quantity_done: null } : {}),
  })))

  if (!o.conLogistica) return
  await scrivi('stays', (await leggi('stays', o.vecchioId)).map((r) => ({
    ...pulisci(r, 'paid_by', 'for_travelers', 'participants'), id: uuid(), trip_id: o.nuovoId,
    check_in: nuovaData(r.check_in), check_out: nuovaData(r.check_out), total_cost: null, paid: false, booked: false, booking_code: null,
  })))
  await scrivi('transports', (await leggi('transports', o.vecchioId)).map((r) => ({
    ...pulisci(r, 'paid_by', 'for_travelers'), id: uuid(), trip_id: o.nuovoId, day_id: r.day_id ? (giorno.get(String(r.day_id)) ?? null) : null,
    depart_at: nuovoIstante(r.depart_at), arrive_at: nuovoIstante(r.arrive_at),
    ...('depart_date' in r ? { depart_date: nuovaData(r.depart_date), arrive_date: nuovaData(r.arrive_date) } : {}),
    ...('checkin_at' in r ? { checkin_at: null } : {}), cost: null, bought: false, ref_code: null,
  })))
  await scrivi('bookings', (await leggi('bookings', o.vecchioId)).map((r) => ({
    ...pulisci(r, 'paid_by', 'for_travelers', 'payer_ids', 'participants'), id: uuid(), trip_id: o.nuovoId,
    valid_from: nuovoIstante(r.valid_from), valid_to: nuovoIstante(r.valid_to),
    file_path: null, confirmation_code: null, url: null, cost: null, ...('status' in r ? { status: 'to_confirm' } : {}),
  })))
}

export const durataNuova = (inizio: string, fine: string) => enumerateDates(inizio, fine).length
