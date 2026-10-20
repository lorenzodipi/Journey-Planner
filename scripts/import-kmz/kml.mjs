// Lettura di un .kmz / .kml (export di Google My Maps) senza dipendenze esterne.
// Funzioni pure: ricevono i byte del file e restituiscono i punti con nome, cartella (livello),
// coordinate e link trovati nella descrizione.

import { inflateRawSync } from 'node:zlib'

/** Estrae il primo file .kml da un archivio zip (un .kmz). Se i byte non sono uno zip, li tratta come KML. */
export function kmlFromBytes(buf) {
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) return buf.toString('utf8')
  // fine della directory centrale
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Il file .kmz non è un archivio zip valido.')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const kmls = []
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10)
    const size = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    p += 46 + nameLen + extraLen + commentLen
    if (!/\.kml$/i.test(name)) continue
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const data = buf.subarray(start, start + size)
    const text = method === 0 ? data.toString('utf8') : method === 8 ? inflateRawSync(data).toString('utf8') : null
    if (text == null) throw new Error(`Compressione zip non supportata (${method}).`)
    kmls.push({ name, text })
  }
  if (kmls.length === 0) throw new Error('Nel .kmz non c\'è nessun file .kml.')
  return (kmls.find((k) => /(^|\/)doc\.kml$/i.test(k.name)) ?? kmls[0]).text
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

/** Albero minimale: { tag, attrs, children, text }. Basta per un KML. */
export function parseXml(xml) {
  const root = { tag: '#root', attrs: '', children: [], text: '' }
  const stack = [root]
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g
  let m
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1]
    if (m[1] !== undefined) top.text += m[1]
    else if (m[3]) {
      const tag = m[3].replace(/^.*:/, '')
      if (m[2]) {
        if (stack.length > 1) stack.pop()
      } else {
        const el = { tag, attrs: m[4] ?? '', children: [], text: '' }
        top.children.push(el)
        if (!m[5]) stack.push(el)
      }
    } else if (m[6] !== undefined) top.text += decodeEntities(m[6])
  }
  return root
}

const child = (el, tag) => el.children.find((c) => c.tag === tag)
const childText = (el, tag) => child(el, tag)?.text.trim() ?? ''
function descendants(el, tag, out = []) {
  for (const c of el.children) {
    if (c.tag === tag) out.push(c)
    descendants(c, tag, out)
  }
  return out
}

const URL_RE = /https?:\/\/[^\s"'<>)\]]+/gi
const GOOGLE_RE = /^https?:\/\/(?:[\w-]+\.)?(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i

/** Testo leggibile dalla descrizione HTML di My Maps. */
export function plainText(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Link di Google Maps scritti nella descrizione (se l'utente li ha incollati). */
export function googleLinks(raw) {
  const decoded = decodeEntities(raw)
  return [...new Set((decoded.match(URL_RE) ?? []).map((u) => u.replace(/[.,;]+$/, '')))].filter((u) => GOOGLE_RE.test(u))
}

const fix = (n) => Number(n.toFixed(6))

/**
 * Link che apre il luogo su Google Maps. Il KMZ non contiene il Place ID, quindi:
 *  1. se nella descrizione c'è già un link di Google Maps, si usa quello;
 *  2. altrimenti una ricerca per nome centrata sulle coordinate di Google: apre la scheda del luogo.
 */
export function mapsUrlFor(name, lat, lng, links = []) {
  const own = links.find((u) => /[?&]cid=|\/maps\/place\/|[?&]q=place_id:|query_place_id=|goo\.gl|g\.co\/kgs/i.test(u)) ?? links[0]
  if (own) return own
  return `https://www.google.com/maps/search/${encodeURIComponent(name).replace(/%20/g, '+')}/@${fix(lat)},${fix(lng)},17z`
}

/**
 * @returns {{ points: Array<{name:string, folder:string, lat:number, lng:number, note:string, links:string[], url:string}>, skipped: number, folders: string[] }}
 */
export function parseKml(xml) {
  const root = parseXml(xml)
  const points = []
  let skipped = 0
  const folders = []
  const walk = (el, folder) => {
    for (const c of el.children) {
      if (c.tag === 'Folder') {
        const label = childText(c, 'name') || folder
        if (!folders.includes(label)) folders.push(label)
        walk(c, label)
      } else if (c.tag === 'Document') walk(c, folder)
      else if (c.tag === 'Placemark') {
        const name = childText(c, 'name')
        const coords = descendants(c, 'Point').flatMap((p) => descendants(p, 'coordinates'))[0]?.text.trim()
        const [lng, lat] = coords ? coords.split(/[,\s]+/).map(Number) : []
        if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          skipped++ // linee, aree o punti senza nome
          continue
        }
        const rawDesc = child(c, 'description')?.text ?? ''
        const links = googleLinks(rawDesc)
        const note = plainText(rawDesc.replace(URL_RE, (u) => (GOOGLE_RE.test(decodeEntities(u)) ? '' : u)))
        points.push({ name, folder, lat, lng, note, links, url: mapsUrlFor(name, lat, lng, links) })
      }
    }
  }
  walk(root.children.find((c) => c.tag === 'kml') ?? root, '')
  return { points, skipped, folders }
}
