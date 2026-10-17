// Lettura del foglio Google (esportato in .xlsx) in dati pronti per l'import.
// Funzioni pure: ricevono le righe di un foglio (array di array) e restituiscono oggetti.
// Nessun dato reale vive in questo file: il .xlsx sta in private/ (ignorata da git).

const norm = (v) => (v == null ? '' : String(v).trim())
const key = (v) => norm(v).toLowerCase()
const bool = (v) => v === true || /^(true|vero|si|sì|x|1)$/i.test(norm(v))
const num = (v) => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Data del foglio -> "YYYY-MM-DD" (le celle data arrivano come Date a mezzanotte). */
export function ymd(v) {
  if (v instanceof Date) {
    // mezzanotte UTC (lettura da xlsx) oppure locale: scelgo le componenti che danno un giorno "tondo"
    const utcRound = v.getUTCHours() === 0 && v.getUTCMinutes() === 0
    const y = utcRound ? v.getUTCFullYear() : v.getFullYear()
    const m = (utcRound ? v.getUTCMonth() : v.getMonth()) + 1
    const d = utcRound ? v.getUTCDate() : v.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const m = norm(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function findColumns(header, names) {
  const cols = {}
  header.forEach((h, i) => {
    const k = key(h)
    for (const [field, aliases] of Object.entries(names)) if (cols[field] === undefined && aliases.includes(k)) cols[field] = i
  })
  return cols
}

// ---------- luoghi ----------

/**
 * Il foglio "Luoghi" è a blocchi affiancati: ogni blocco inizia con una colonna "Location"
 * seguita da Tipologia, (Città), Indirizzo, Note. La città è nella colonna "Città" se c'è;
 * altrimenti si deduce dagli indirizzi, per eliminazione, oppure da `config.blockCities`.
 * `candidates`: nomi di città noti (es. dal foglio Hotel).
 */
export function parsePlaces(rows, { candidates = [], blockCities = [] } = {}) {
  const header = rows[0] ?? []
  const blocks = []
  for (let c = 0; c < header.length; c++) {
    if (key(header[c]) !== 'location') continue
    const cols = { name: c }
    for (let k = c + 1; k < header.length && norm(header[k]); k++) {
      const h = key(header[k])
      if (h === 'tipologia') cols.type = k
      else if (h === 'città' || h === 'citta') cols.city = k
      else if (h === 'indirizzo') cols.address = k
      else if (h === 'note') cols.note = k
    }
    blocks.push(cols)
  }

  const perBlock = blocks.map((cols) => {
    const items = []
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] ?? []
      const name = norm(row[cols.name])
      if (!name) continue
      items.push({
        name,
        type: cols.type !== undefined ? norm(row[cols.type]) : '',
        city: cols.city !== undefined ? norm(row[cols.city]) : '',
        address: cols.address !== undefined ? norm(row[cols.address]) : '',
        note: cols.note !== undefined ? norm(row[cols.note]) : '',
      })
    }
    return items
  })

  // città per blocco
  const known = new Set(candidates.map(norm).filter(Boolean))
  for (const items of perBlock) for (const p of items) if (p.city) known.add(p.city)
  const resolved = perBlock.map((items, i) => {
    if (items.length === 0) return null
    const withCol = items.find((p) => p.city)
    if (blocks[i].city !== undefined && withCol) return null // ogni riga ha la sua città
    if (blockCities[i]) return blockCities[i]
    const votes = new Map()
    for (const p of items) for (const city of known) if (p.address.toLowerCase().includes(city.toLowerCase())) votes.set(city, (votes.get(city) ?? 0) + 1)
    const best = [...votes].sort((a, b) => b[1] - a[1])[0]
    return best && best[1] >= items.length / 2 ? best[0] : undefined
  })
  // un solo blocco senza città e una sola città non ancora assegnata: è quella
  const claimed = new Set(resolved.filter(Boolean))
  for (const items of perBlock) for (const p of items) if (p.city) claimed.add(p.city)
  const missing = resolved.map((c, i) => (c === undefined ? i : -1)).filter((i) => i >= 0)
  const unclaimed = [...known].filter((c) => !claimed.has(c))
  if (missing.length === 1 && unclaimed.length === 1) resolved[missing[0]] = unclaimed[0]
  const stuck = resolved.map((c, i) => (c === undefined ? i + 1 : 0)).filter(Boolean)
  if (stuck.length > 0) {
    throw new Error(
      `Non riesco a capire la città dei blocchi n. ${stuck.join(', ')} del foglio Luoghi (contati da sinistra, da 1). ` +
        'Scrivila in private/import-config.json: { "blockCities": ["Nara", "Tokyo", …] } (una per blocco, nell\'ordine).',
    )
  }

  const places = []
  perBlock.forEach((items, i) => {
    for (const p of items) places.push({ ...p, city: p.city || resolved[i] || '', block: i + 1 })
  })
  return places
}

// ---------- hotel ----------

export function parseStays(rows) {
  const cols = findColumns(rows[0] ?? [], {
    city: ['città', 'citta'],
    checkIn: ['data arrivo'],
    checkOut: ['data partenza'],
    name: ['hotel'],
    cost: ['costo totale'],
    booked: ['prenotato'],
    paid: ['pagato'],
    note: ['note'],
  })
  const out = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const name = norm(row[cols.name])
    const checkIn = ymd(row[cols.checkIn])
    const checkOut = ymd(row[cols.checkOut])
    if (!name || !checkIn || !checkOut) continue
    out.push({
      city: norm(row[cols.city]),
      name,
      checkIn,
      checkOut,
      totalCost: num(row[cols.cost]),
      booked: bool(row[cols.booked]),
      paid: bool(row[cols.paid]),
      note: cols.note !== undefined ? norm(row[cols.note]) : '',
    })
  }
  return out
}

// ---------- trasporti ----------

const MODES = [
  [/treno/i, 'train'],
  [/metro/i, 'metro'],
  [/bus/i, 'bus'],
  [/taxi/i, 'taxi'],
  [/traghetto|ferry/i, 'ferry'],
  [/aere|volo/i, 'plane'],
]
export const modeOf = (label) => MODES.find(([re]) => re.test(label))?.[1] ?? 'other'

export function parseTransports(rows) {
  const cols = findColumns(rows[0] ?? [], { route: ['tratta'], cost: ['costo'], type: ['tipologia'], note: ['note'], bought: ['comprato'] })
  const out = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const route = norm(row[cols.route])
    if (!route) continue // anche la riga dei totali: non ha tratta
    const parts = route.split(/\s+-\s+|\s*->\s*|(?<=[a-z])-(?=[A-Z])/).map((s) => s.trim()).filter(Boolean)
    // "Osaka Pass" non è una tratta: la prima parola è il luogo dove vale
    const [from, to] = parts.length >= 2 ? parts : [route, route.split(/\s+/)[0]]
    out.push({
      from,
      to,
      mode: modeOf(norm(row[cols.type])),
      cost: num(row[cols.cost]),
      note: cols.note !== undefined ? norm(row[cols.note]) : '',
      bought: bool(row[cols.bought]),
    })
  }
  return out
}

// ---------- spese previste ("Principale") ----------

// Aereo, Hotel e Trasporti nell'app si calcolano da voli, alloggi e trasporti: qui non si duplicano.
const DERIVED = new Set(['aereo', 'hotel', 'trasporti'])
const CATEGORY = [
  [/cibo/i, 'Cibo'],
  [/assicurazione/i, 'Assicurazione'],
  [/suika|suica|pass/i, 'Trasporti'],
  [/sim/i, 'Connessione'],
]

/** La colonna "Dettagli" non si importa: può contenere codici di polizza o di prenotazione. */
export function parseBudget(rows) {
  const cols = findColumns(rows[0] ?? [], { label: ['oggetto'], price: ['prezzo'], paid: ['pagato'] })
  const out = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const label = norm(row[cols.label])
    const price = num(row[cols.price])
    if (!label || price === null || DERIVED.has(label.toLowerCase())) continue
    out.push({
      label: /^assicurazione sanitaria$/i.test(label) ? 'Assicurazione sanitaria' : label,
      category: CATEGORY.find(([re]) => re.test(label))?.[1] ?? 'Altro',
      amount: price,
      paid: bool(row[cols.paid]),
    })
  }
  return out
}

/** Città di ogni notte, dagli alloggi: [{date, city}] da check-in (incluso) a check-out (escluso). */
export function nightsCities(stays) {
  const out = []
  for (const s of stays) {
    const [y, m, d] = s.checkIn.split('-').map(Number)
    const end = Date.UTC(...s.checkOut.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))))
    for (let t = Date.UTC(y, m - 1, d); t < end; t += 86_400_000) {
      out.push({ date: new Date(t).toISOString().slice(0, 10), city: s.city })
    }
  }
  return out
}
