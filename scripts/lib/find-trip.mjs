// Scelta del viaggio su cui lavorano gli script di import.
// Gli script usano la chiave di servizio, che vede TUTTI i viaggi di TUTTI gli account: il titolo da solo non basta.
// Per questo si identifica il viaggio con l'email dell'account (--email) oppure con il suo id (--trip-id).

const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()

/** Descrizione di un viaggio per i messaggi: titolo, date, id e account che lo vedono. */
export function describeTrip(t) {
  const dates = t.start && t.end ? `${t.start} → ${t.end}` : 'senza date'
  return `«${t.title}» (${dates}) · id ${t.id} · account: ${t.emails.length ? t.emails.join(', ') : 'nessuno'}`
}

/**
 * @param rows  [{ id, title, start, end, emails: string[] }]  (emails = account che sono membri del viaggio)
 * @param opts  { title?, tripId?, email?, needIdentity? }
 * @returns il viaggio scelto, oppure lancia un Error che spiega cosa manca / cosa è ambiguo.
 */
export function pickTrip(rows, { title, tripId, email, needIdentity = false } = {}) {
  if (tripId) {
    const t = rows.find((r) => r.id === tripId)
    if (!t) throw new Error(`Nessun viaggio con id ${tripId}.`)
    if (email && !t.emails.some((e) => same(e, email))) throw new Error(`Il viaggio ${tripId} non è dell'account ${email}: ${describeTrip(t)}`)
    return t
  }
  if (needIdentity && !email) {
    throw new Error(
      'Indica l\'account con --email tuo@indirizzo (o il viaggio con --trip-id): la chiave di servizio vede i viaggi di tutti gli account e il titolo non è univoco. Con --list vedi i viaggi disponibili.',
    )
  }
  let pool = rows
  if (email) {
    pool = pool.filter((r) => r.emails.some((e) => same(e, email)))
    if (pool.length === 0) throw new Error(`Nessun viaggio per l'account ${email}. Controlla l'indirizzo con cui accedi all'app (--list mostra tutti i viaggi).`)
  }
  if (title) pool = pool.filter((r) => r.title.toLowerCase().includes(title.toLowerCase()))
  if (pool.length === 1) return pool[0]
  const list = pool.map((t) => `  - ${describeTrip(t)}`).join('\n')
  if (pool.length === 0) throw new Error(`Nessun viaggio con «${title}» nel titolo${email ? ` per ${email}` : ''}: crealo prima dall'app.`)
  throw new Error(`Più viaggi corrispondono:\n${list}\nIndica quello giusto con --trip-id.`)
}

/** Legge dal database i viaggi con gli account membri (serve la chiave di servizio). */
export async function loadTrips(db) {
  const ok = (res) => {
    if (res.error) throw new Error([res.error.message, res.error.details, res.error.hint].filter(Boolean).join(' · '))
    return res.data
  }
  const trips = ok(await db.from('trips').select('id,title,start_date,end_date,owner_id').is('deleted_at', null))
  const members = ok(await db.from('trip_members').select('trip_id,user_id'))
  const emailOf = new Map()
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(error.message)
    for (const u of data.users) emailOf.set(u.id, u.email ?? '(senza email)')
    if (data.users.length < 200) break
  }
  return trips.map((t) => {
    const ids = new Set(members.filter((m) => m.trip_id === t.id).map((m) => m.user_id))
    ids.add(t.owner_id)
    return { id: t.id, title: t.title, start: t.start_date, end: t.end_date, emails: [...ids].map((id) => emailOf.get(id)).filter(Boolean) }
  })
}
