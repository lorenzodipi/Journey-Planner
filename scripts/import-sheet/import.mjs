// Import dello Sheet "Viaggio" (esportato in .xlsx) dentro Journey Planner.
//
//   npm run import:sheet -- --file private/viaggio.xlsx --trip "Giappone" --dry-run
//   npm run import:sheet -- --file private/viaggio.xlsx --trip "Giappone"
//
// Serve in .env.local (git-ignored, MAI nel repo) la chiave di servizio di Supabase:
//   SUPABASE_SERVICE_ROLE_KEY=...      (Project Settings > API Keys > secret / service_role)
// e VITE_SUPABASE_URL, che c'è già. Il viaggio va creato prima dall'app.
// Si può rilanciare quando si vuole: quello che esiste già non viene duplicato.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { readSheet } from 'read-excel-file/node'
import { createGeocoder } from './geocode.mjs'
import { nightsCities, parseBudget, parsePlaces, parseStays, parseTransports } from './parse.mjs'

const { values: args } = parseArgs({
  options: {
    file: { type: 'string', default: 'private/viaggio.xlsx' },
    trip: { type: 'string' },
    config: { type: 'string', default: 'private/import-config.json' },
    cache: { type: 'string', default: 'private/geocode-cache.json' },
    report: { type: 'string', default: 'private/import-report.txt' },
    'dry-run': { type: 'boolean', default: false },
    'skip-geocode': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
})

if (args.help) {
  console.log('Uso: npm run import:sheet -- --file private/viaggio.xlsx --trip "Titolo del viaggio" [--dry-run] [--skip-geocode]')
  process.exit(0)
}

const dry = args['dry-run']
const lines = []
const say = (s = '') => {
  console.log(s)
  lines.push(s)
}
// Gli errori di Supabase sono oggetti semplici, non Error: li rendo leggibili.
function describe(e) {
  return describeRaw(e).split('\n')[0]
}
function describeRaw(e) {
  if (e instanceof Error) return e.cause?.message ? `${e.message} (${e.cause.message})` : e.message
  if (e && typeof e === 'object') {
    const text = [e.message, e.details, e.hint, e.code ? `codice ${e.code}` : ''].filter(Boolean).join(' · ')
    return text || JSON.stringify(e)
  }
  return String(e)
}
function advice(text) {
  if (/invalid api key|invalid jwt|jwt|apikey/i.test(text)) return 'La chiave sembra non valida: controlla SUPABASE_SERVICE_ROLE_KEY in .env.local (la chiave *secret*, intera, senza virgolette né spazi).'
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|getaddrinfo/i.test(text)) return 'Non riesco a raggiungere Supabase: controlla VITE_SUPABASE_URL e la connessione.'
  if (/permission denied/i.test(text)) return 'Permesso negato: la chiave usata non è quella di servizio (secret / service_role).'
  return ''
}
const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback)
const writeFile = (path, content) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

async function main() {
  if (!existsSync(args.file)) throw new Error(`Non trovo il file ${args.file}. Esporta lo Sheet in .xlsx e mettilo in private/.`)
  const config = readJson(args.config, {})

  // ---- lettura ----
  const hotels = parseStays(await readSheet(args.file, 'Hotel'))
  const places = parsePlaces(await readSheet(args.file, 'Luoghi'), { candidates: hotels.map((h) => h.city), blockCities: config.blockCities ?? [] })
  const transports = parseTransports(await readSheet(args.file, 'Trasporti'))
  const budget = parseBudget(await readSheet(args.file, 'Principale'))

  say(`Letti dal file: ${places.length} luoghi, ${hotels.length} alloggi, ${transports.length} trasporti, ${budget.length} voci di spesa.`)
  const byCity = new Map()
  for (const p of places) byCity.set(p.city, (byCity.get(p.city) ?? 0) + 1)
  say(`Luoghi per città: ${[...byCity].map(([c, n]) => `${c} ${n}`).join(', ')}`)
  const types = new Map()
  for (const p of places) types.set(p.type || '(senza tipologia)', (types.get(p.type || '(senza tipologia)') ?? 0) + 1)
  say(`Tipologie: ${[...types].map(([c, n]) => `${c} ${n}`).join(', ')}`)

  if (dry) {
    say('\nProva a vuoto: nessuna scrittura sul database e nessuna ricerca di coordinate.')
    return
  }

  // ---- collegamento ----
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Mancano VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local (la chiave di servizio non va mai nel repo).')
  if (!args.trip) throw new Error('Indica il viaggio con --trip "Titolo" (anche solo una parte del titolo).')
  const db = createClient(url, key, { auth: { persistSession: false } })

  const found = await db.from('trips').select('id,title').is('deleted_at', null).ilike('title', `%${args.trip}%`)
  if (found.error) throw new Error(describe(found.error))
  if (found.data.length !== 1) {
    throw new Error(
      found.data.length === 0
        ? `Nessun viaggio con «${args.trip}» nel titolo: crealo prima dall'app.`
        : `Più viaggi corrispondono a «${args.trip}»: ${found.data.map((t) => `«${t.title}»`).join(', ')}. Scrivi il titolo per intero.`,
    )
  }
  const trip = found.data[0]
  say(`\nViaggio: «${trip.title}»`)
  const ok = (res) => {
    if (res.error) throw new Error(describe(res.error))
    return res.data
  }

  // ---- categorie ----
  const cats = ok(await db.from('categories').select('id,label').eq('trip_id', trip.id).is('deleted_at', null))
  const catId = new Map(cats.map((c) => [c.label.toLowerCase(), c.id]))
  const missingCats = [...new Set(places.map((p) => p.type).filter(Boolean))].filter((l) => !catId.has(l.toLowerCase()))
  if (missingCats.length > 0) {
    const created = ok(
      await db
        .from('categories')
        .insert(missingCats.map((label, i) => ({ trip_id: trip.id, label, position: (cats.length + i + 1) * 1000 })))
        .select('id,label'),
    )
    for (const c of created) catId.set(c.label.toLowerCase(), c.id)
    say(`Categorie create: ${missingCats.join(', ')}`)
  }

  // ---- luoghi (con coordinate) ----
  const existing = ok(await db.from('places').select('name,city').eq('trip_id', trip.id).is('deleted_at', null))
  const have = new Set(existing.map((p) => `${p.name.toLowerCase()}|${(p.city ?? '').toLowerCase()}`))
  const todo = places.filter((p) => !have.has(`${p.name.toLowerCase()}|${p.city.toLowerCase()}`))
  say(`Luoghi nuovi da inserire: ${todo.length} (già presenti: ${places.length - todo.length})`)

  const cache = readJson(args.cache, {})
  const geo = args['skip-geocode']
    ? null
    : createGeocoder({
        cache,
        userAgent: `Journey-Planner-personal-import/1.0 (${process.env.NOMINATIM_EMAIL ?? 'uso personale, 1 richiesta al secondo'})`,
      })
  const rows = []
  const notFound = []
  let n = 0
  try {
    for (const p of todo) {
      n++
      let hit = null
      if (geo) {
        hit = await geo.locate(p)
        if (n % 10 === 0) {
          writeFile(args.cache, JSON.stringify(geo.cache, null, 1)) // salvo man mano: se si interrompe non si perde nulla
          console.log(`  …${n}/${todo.length} luoghi cercati`)
        }
      }
      if (geo && !hit) notFound.push(p)
      rows.push({
        trip_id: trip.id,
        category_id: p.type ? catId.get(p.type.toLowerCase()) : null,
        name: p.name,
        name_local: hit?.nameLocal ?? null,
        city: p.city || null,
        address: p.address || null,
        lat: hit?.lat ?? null,
        lng: hit?.lng ?? null,
        notes: p.note || null,
        status: 'idea',
        source: 'import:sheet',
      })
    }
  } finally {
    if (geo) writeFile(args.cache, JSON.stringify(geo.cache, null, 1))
  }
  for (let i = 0; i < rows.length; i += 50) ok(await db.from('places').insert(rows.slice(i, i + 50)))
  say(`Luoghi inseriti: ${rows.length}${geo ? `, con coordinate: ${rows.length - notFound.length}, senza: ${notFound.length}` : ' (senza ricerca delle coordinate)'}`)
  if (notFound.length > 0) {
    say('\nSenza coordinate (apri il luogo nell\'app e sposta il pin, oppure incolla il link di Google Maps):')
    for (const p of notFound) say(`  - ${p.name} (${p.city})`)
  }

  // ---- alloggi ----
  const stays = ok(await db.from('stays').select('name,check_in').eq('trip_id', trip.id).is('deleted_at', null))
  const haveStay = new Set(stays.map((s) => `${s.name.toLowerCase()}|${s.check_in}`))
  const newStays = hotels.filter((h) => !haveStay.has(`${h.name.toLowerCase()}|${h.checkIn}`))
  if (newStays.length > 0) {
    ok(
      await db.from('stays').insert(
        newStays.map((h) => ({
          trip_id: trip.id,
          city: h.city || null,
          name: h.name,
          check_in: h.checkIn,
          check_out: h.checkOut,
          total_cost: h.totalCost,
          currency: 'EUR',
          booked: h.booked,
          paid: h.paid,
          notes: h.note || null,
        })),
      ),
    )
  }
  say(`\nAlloggi inseriti: ${newStays.length} (già presenti: ${hotels.length - newStays.length})`)

  // ---- città dei giorni, dagli alloggi ----
  const days = ok(await db.from('days').select('id,date,city').eq('trip_id', trip.id).is('deleted_at', null))
  const nightCity = new Map(nightsCities(hotels).map((x) => [x.date, x.city]))
  let dayUpdates = 0
  for (const d of days) {
    const city = nightCity.get(d.date)
    if (city && !d.city) {
      ok(await db.from('days').update({ city }).eq('id', d.id))
      dayUpdates++
    }
  }
  say(`Città assegnate ai giorni: ${dayUpdates}`)

  // ---- trasporti ----
  const trs = ok(await db.from('transports').select('from_label,to_label').eq('trip_id', trip.id).is('deleted_at', null))
  const haveTr = new Set(trs.map((t) => `${t.from_label.toLowerCase()}|${t.to_label.toLowerCase()}`))
  const newTr = transports.filter((t) => !haveTr.has(`${t.from.toLowerCase()}|${t.to.toLowerCase()}`))
  if (newTr.length > 0) {
    ok(
      await db.from('transports').insert(
        newTr.map((t) => ({
          trip_id: trip.id,
          from_label: t.from,
          to_label: t.to,
          mode: t.mode,
          cost: t.cost,
          currency: 'EUR',
          scope: 'per_person',
          bought: t.bought,
          notes: t.note || null,
        })),
      ),
    )
  }
  say(`Trasporti inseriti: ${newTr.length} (già presenti: ${transports.length - newTr.length})`)

  // ---- spese previste ----
  const travelers = ok(await db.from('trip_travelers').select('id').eq('trip_id', trip.id).is('deleted_at', null))
  const items = ok(await db.from('budget_items').select('label').eq('trip_id', trip.id).is('deleted_at', null))
  const haveItem = new Set(items.map((b) => b.label.toLowerCase()))
  const newItems = budget.filter((b) => !haveItem.has(b.label.toLowerCase()))
  for (const b of newItems) {
    const [row] = ok(
      await db
        .from('budget_items')
        .insert({ trip_id: trip.id, label: b.label, category: b.category, amount: b.amount, currency: 'EUR', scope: 'per_person' })
        .select('id'),
    )
    if (travelers.length > 0) {
      ok(
        await db.from('budget_item_shares').insert(
          travelers.map((t) => ({ trip_id: trip.id, budget_item_id: row.id, traveler_id: t.id, paid: b.paid, paid_at: b.paid ? new Date().toISOString() : null })),
        ),
      )
    }
  }
  say(`Voci di spesa inserite: ${newItems.length} (già presenti: ${budget.length - newItems.length})`)
  say('\nFatto. Aprendo l\'app (o ricaricandola) trovi tutto. Aereo, Hotel e Trasporti non sono duplicati tra le spese: si calcolano da voli, alloggi e trasporti.')
}

main()
  .catch((e) => {
    const text = describe(e)
    say(`\nErrore: ${text}`)
    const tip = advice(text)
    if (tip) say(tip)
    process.exitCode = 1
  })
  .finally(() => {
    if (!dry) writeFile(args.report, lines.join('\n') + '\n')
  })
