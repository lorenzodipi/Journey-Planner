// Importa i punti di una mappa Google My Maps (esportata in .kmz) nei luoghi del viaggio.
//
//   npm run import:kmz -- --file private/mappa.kmz --trip "Giappone" --dry-run
//   npm run import:kmz -- --file private/mappa.kmz --trip "Giappone"
//
// - i luoghi già presenti (stesso nome, o molto vicini) ricevono il link e le coordinate di Google;
// - i punti che non ci sono ancora vengono aggiunti, con la cartella (livello) della mappa come categoria.
// Serve in .env.local la chiave di servizio di Supabase (vedi scripts/import-sheet/README.md).
// Si può rilanciare: non duplica nulla.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { kmlFromBytes, parseKml } from './kml.mjs'
import { matchPlaces, meters, nearestCity } from './match.mjs'

const { values: args } = parseArgs({
  options: {
    file: { type: 'string', default: 'private/mappa.kmz' },
    trip: { type: 'string' },
    report: { type: 'string', default: 'private/import-kmz-report.txt' },
    'dry-run': { type: 'boolean', default: false },
    'keep-coords': { type: 'boolean', default: false },
    'force-links': { type: 'boolean', default: false },
    'no-new': { type: 'boolean', default: false },
    radius: { type: 'string', default: '150' },
    help: { type: 'boolean', default: false },
  },
})
if (args.help) {
  console.log(
    'Uso: npm run import:kmz -- --file private/mappa.kmz --trip "Titolo" [--dry-run] [--keep-coords] [--force-links] [--no-new] [--radius 150]',
  )
  process.exit(0)
}

const lines = []
const say = (s = '') => {
  console.log(s)
  lines.push(s)
}
function describe(e) {
  if (e instanceof Error) return e.cause?.message ? `${e.message} (${e.cause.message})` : e.message
  if (e && typeof e === 'object') return [e.message, e.details, e.hint, e.code ? `codice ${e.code}` : ''].filter(Boolean).join(' · ') || JSON.stringify(e)
  return String(e)
}
const ok = (res) => {
  if (res.error) throw new Error(describe(res.error))
  return res.data
}

async function main() {
  if (!existsSync(args.file)) throw new Error(`Non trovo il file ${args.file}. Esporta la mappa da Google My Maps in .kmz e mettila in private/.`)
  const { points, skipped, folders } = parseKml(kmlFromBytes(readFileSync(args.file)))
  const withLink = points.filter((p) => p.links.length > 0).length
  say(`Letti dal file: ${points.length} luoghi${skipped ? ` (ignorati ${skipped} elementi che non sono punti: linee o aree)` : ''}.`)
  say(`Livelli della mappa: ${folders.length ? folders.join(', ') : '(nessuno)'}`)
  say(`Con un link di Google già scritto nella descrizione: ${withLink}`)

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !args.trip) {
    if (args['dry-run']) {
      say('\nProva a vuoto senza database (mancano --trip o la chiave): ecco i primi punti letti.')
      for (const p of points.slice(0, 5)) say(`  - ${p.name} [${p.folder || 'senza livello'}] ${p.lat}, ${p.lng}\n    ${p.url}`)
      return
    }
    if (!args.trip) throw new Error('Indica il viaggio con --trip "Titolo" (anche solo una parte del titolo).')
    throw new Error('Mancano VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local.')
  }
  const db = createClient(url, key, { auth: { persistSession: false } })
  const found = ok(await db.from('trips').select('id,title').is('deleted_at', null).ilike('title', `%${args.trip}%`))
  if (found.length !== 1) {
    throw new Error(
      found.length === 0
        ? `Nessun viaggio con «${args.trip}» nel titolo.`
        : `Più viaggi corrispondono a «${args.trip}»: ${found.map((t) => `«${t.title}»`).join(', ')}. Scrivi il titolo per intero.`,
    )
  }
  const trip = found[0]
  say(`\nViaggio: «${trip.title}»${args['dry-run'] ? '  (prova a vuoto: non scrivo nulla)' : ''}`)

  const places = ok(await db.from('places').select('id,name,name_local,city,lat,lng,maps_url,category_id').eq('trip_id', trip.id).is('deleted_at', null))
  const { matched, fresh } = matchPlaces(points, places, { radius: Number(args.radius) || 150 })
  say(`Già presenti nell'app: ${matched.length} · da aggiungere: ${fresh.length} · nell'app ma non nella mappa: ${places.length - matched.length}`)

  // ---- aggiornamento dei luoghi esistenti ----
  let linked = 0
  let moved = 0
  for (const { point, place } of matched) {
    const patch = {}
    if (!place.maps_url || args['force-links']) {
      if (place.maps_url !== point.url) patch.maps_url = point.url
    }
    if (!args['keep-coords'] && (place.lat == null || place.lng == null || meters(point, place) > 20)) {
      patch.lat = point.lat
      patch.lng = point.lng
    }
    if (Object.keys(patch).length === 0) continue
    if (patch.maps_url) linked++
    if (patch.lat != null) moved++
    if (!args['dry-run']) ok(await db.from('places').update(patch).eq('id', place.id))
  }
  say(`Link di Google aggiunti: ${linked} · pin spostati sulle coordinate di Google: ${moved}`)
  const far = matched.filter(({ point, place }) => place.lat != null && meters(point, place) > 2000)
  if (far.length > 0) {
    say('\nAbbinati ma distanti più di 2 km (controlla che sia lo stesso posto):')
    for (const { point, place } of far) say(`  - ${place.name} (${Math.round(meters(point, place) / 1000)} km) ~ «${point.name}»`)
  }

  // ---- luoghi nuovi ----
  if (args['no-new'] || fresh.length === 0) {
    if (fresh.length > 0) say(`\nNon aggiungo i ${fresh.length} luoghi nuovi (--no-new).`)
  } else {
    const cats = ok(await db.from('categories').select('id,label').eq('trip_id', trip.id).is('deleted_at', null))
    const catId = new Map(cats.map((c) => [c.label.toLowerCase(), c.id]))
    const missing = [...new Set(fresh.map((p) => p.folder).filter(Boolean))].filter((l) => !catId.has(l.toLowerCase()))
    if (missing.length > 0) {
      if (!args['dry-run']) {
        const created = ok(
          await db.from('categories').insert(missing.map((label, i) => ({ trip_id: trip.id, label, position: (cats.length + i + 1) * 1000 }))).select('id,label'),
        )
        for (const c of created) catId.set(c.label.toLowerCase(), c.id)
      }
      say(`Categorie ${args['dry-run'] ? 'da creare' : 'create'} (dai livelli della mappa): ${missing.join(', ')}`)
    }
    const rows = fresh.map((p) => ({
      trip_id: trip.id,
      category_id: p.folder ? (catId.get(p.folder.toLowerCase()) ?? null) : null,
      name: p.name,
      city: nearestCity(p, places),
      lat: p.lat,
      lng: p.lng,
      maps_url: p.url,
      notes: p.note || null,
      status: 'idea',
      source: 'import:kmz',
    }))
    if (!args['dry-run']) for (let i = 0; i < rows.length; i += 50) ok(await db.from('places').insert(rows.slice(i, i + 50)))
    say(`Luoghi ${args['dry-run'] ? 'che aggiungerei' : 'aggiunti'}: ${rows.length}`)
    for (const r of rows.slice(0, 30)) say(`  + ${r.name}${r.city ? ` (${r.city})` : ''}`)
    if (rows.length > 30) say(`  … e altri ${rows.length - 30}`)
    const noCity = rows.filter((r) => !r.city).length
    if (noCity > 0) say(`\n${noCity} luoghi nuovi sono senza città (nessun luogo già presente nei dintorni): impostala dall'app.`)
  }
  say(`\nFatto. Il pulsante «Apri in Maps» ora porta al luogo su Google.`)
}

main()
  .catch((e) => {
    say(`\nErrore: ${describe(e)}`)
    process.exitCode = 1
  })
  .finally(() => {
    if (!args['dry-run'] && lines.length > 0) {
      mkdirSync(dirname(args.report), { recursive: true })
      writeFileSync(args.report, lines.join('\n') + '\n')
    }
  })
