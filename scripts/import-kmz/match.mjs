// Abbinamento dei punti del KMZ ai luoghi già presenti nel viaggio. Funzioni pure.

/** Nome senza maiuscole, accenti, simboli e articoli iniziali: "The Tokyo-Tower!" ~ "tokyo tower". */
export function normName(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/^(the|il|lo|la|le|i|gli|l)\s+/, '')
    .trim()
}

/** Distanza in metri (haversine). */
export function meters(a, b) {
  const R = 6371000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function sameName(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  return short.length >= 4 && (` ${long} `).includes(` ${short} `) // "tokyo tower" ~ "tokyo tower observatory"
}

/**
 * Per ogni punto del KMZ cerca un luogo esistente: stesso nome (anche nome locale), oppure
 * a meno di `radius` metri con nome in parte uguale. Un luogo esistente si usa una volta sola.
 * @returns {{ matched: Array<{point, place, how}>, fresh: Array<object> }}
 */
export function matchPlaces(points, places, { radius = 150 } = {}) {
  const used = new Set()
  const matched = []
  const fresh = []
  const prepared = places.map((p) => ({ p, names: [normName(p.name), normName(p.name_local)].filter(Boolean) }))
  const claim = (pt, find, how) => {
    const hit = prepared.find((x) => !used.has(x.p.id) && find(x))
    if (!hit) return false
    used.add(hit.p.id)
    matched.push({ point: pt, place: hit.p, how })
    return true
  }
  const exact = []
  const rest = []
  // prima i nomi identici, così "Ramen Ichiran" non ruba l'abbinamento a "Ichiran"
  for (const pt of points) {
    const n = normName(pt.name)
    ;(prepared.some((x) => !used.has(x.p.id) && x.names.includes(n)) ? exact : rest).push(pt)
  }
  for (const pt of exact) {
    const n = normName(pt.name)
    if (!claim(pt, (x) => x.names.includes(n), 'nome')) rest.push(pt)
  }
  for (const pt of rest) {
    const n = normName(pt.name)
    const close = (x) => x.p.lat != null && x.p.lng != null && meters(pt, x.p) <= radius
    if (claim(pt, (x) => x.names.some((m) => sameName(m, n)), 'nome simile')) continue
    if (claim(pt, (x) => close(x) && x.names.some((m) => m.split(' ')[0] === n.split(' ')[0]), 'vicino')) continue
    fresh.push(pt)
  }
  return { matched, fresh }
}

/** Città del luogo già presente più vicino (entro `maxKm`): serve per i luoghi nuovi, che nel KMZ non hanno la città. */
export function nearestCity(point, places, maxKm = 30) {
  let best = null
  let bestD = maxKm * 1000
  for (const p of places) {
    if (!p.city || p.lat == null || p.lng == null) continue
    const d = meters(point, p)
    if (d < bestD) {
      bestD = d
      best = p.city
    }
  }
  return best
}
