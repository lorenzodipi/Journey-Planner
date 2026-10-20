// Lettura di un .kmz / .kml (export di Google My Maps) direttamente nel browser, senza librerie.
// Un KMZ è uno zip che contiene un doc.kml: lo apro con DecompressionStream e leggo i Placemark.

export interface KmzPoint {
  name: string
  /** Cartella (livello) della mappa. */
  folder: string
  /** Colonne "Tipologia" e "Città" se la mappa è nata da un foglio. */
  type: string
  city: string
  lat: number | null
  lng: number | null
  address: string
  note: string
  /** Link di Google Maps scritti nella descrizione, se ci sono. */
  links: string[]
  /** Link che apre il luogo su Google Maps. */
  url: string
}

export interface KmzContent {
  points: KmzPoint[]
  /** Elementi che non sono punti (linee, aree). */
  skipped: number
  folders: string[]
}

const decoder = new TextDecoder('utf-8')

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('Questo dispositivo non sa aprire i file .kmz: esporta la mappa in .kml oppure aggiorna il browser.')
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Estrae il KML da un .kmz (zip) o lo restituisce così com'è se i byte sono già un KML. */
export async function kmlFromBytes(buf: Uint8Array): Promise<string> {
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) return decoder.decode(buf)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Il file non è un archivio .kmz valido.')
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const found: { name: string; text: string }[] = []
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break
    const method = view.getUint16(p + 10, true)
    const size = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const local = view.getUint32(p + 42, true)
    const name = decoder.decode(buf.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (!/\.kml$/i.test(name)) continue
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    const data = buf.subarray(start, start + size)
    if (method !== 0 && method !== 8) throw new Error('Il .kmz usa una compressione che non so leggere.')
    found.push({ name, text: decoder.decode(method === 0 ? data : await inflateRaw(data)) })
  }
  if (found.length === 0) throw new Error('Nel .kmz non c\'è nessuna mappa (file .kml).')
  return (found.find((k) => /(^|\/)doc\.kml$/i.test(k.name)) ?? found[0]).text
}

// ---------- XML minimale ----------

interface El {
  tag: string
  attrs: string
  children: El[]
  text: string
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

export function parseXml(xml: string): El {
  const root: El = { tag: '#root', attrs: '', children: [], text: '' }
  const stack = [root]
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1]
    if (m[1] !== undefined) top.text += m[1]
    else if (m[3]) {
      const tag = m[3].replace(/^.*:/, '')
      if (m[2]) {
        if (stack.length > 1) stack.pop()
      } else {
        const el: El = { tag, attrs: m[4] ?? '', children: [], text: '' }
        top.children.push(el)
        if (!m[5]) stack.push(el)
      }
    } else if (m[6] !== undefined) top.text += decodeEntities(m[6])
  }
  return root
}

const child = (el: El, tag: string) => el.children.find((c) => c.tag === tag)
const childText = (el: El, tag: string) => child(el, tag)?.text.trim() ?? ''
function descendants(el: El, tag: string, out: El[] = []): El[] {
  for (const c of el.children) {
    if (c.tag === tag) out.push(c)
    descendants(c, tag, out)
  }
  return out
}

const URL_RE = /https?:\/\/[^\s"'<>)\]]+/gi
const GOOGLE_RE = /^https?:\/\/(?:[\w-]+\.)?(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i

/** Testo leggibile dalla descrizione HTML di My Maps. */
export function plainText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Link di Google Maps scritti nella descrizione (se l'utente li ha incollati). */
export function googleLinks(raw: string): string[] {
  const decoded = decodeEntities(raw)
  return [...new Set((decoded.match(URL_RE) ?? []).map((u) => u.replace(/[.,;]+$/, '')))].filter((u) => GOOGLE_RE.test(u))
}

const fix = (n: number) => Number(n.toFixed(6))

/**
 * Link che apre il luogo su Google Maps. Il KMZ non contiene il Place ID, quindi:
 *  1. se nella descrizione c'è già un link di Google Maps, si usa quello;
 *  2. con le coordinate, una ricerca per nome centrata sul punto di Google;
 *  3. senza coordinate (mappa creata da un foglio), una ricerca per «nome + indirizzo».
 */
export function mapsUrlFor(name: string, lat: number | null, lng: number | null, links: string[] = [], address = ''): string {
  const own = links.find((u) => /[?&]cid=|\/maps\/place\/|[?&]q=place_id:|query_place_id=|goo\.gl|g\.co\/kgs/i.test(u)) ?? links[0]
  if (own) return own
  if (lat == null || lng == null) {
    const text = (address || name).replace(/\s+/g, ' ').trim()
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(name).replace(/%20/g, '+')}/@${fix(lat)},${fix(lng)},17z`
}

export function parseKml(xml: string): KmzContent {
  const root = parseXml(xml)
  const points: KmzPoint[] = []
  const raw = new Map<KmzPoint, Record<string, string>>()
  const folders: string[] = []
  let skipped = 0
  const walk = (el: El, folder: string) => {
    for (const c of el.children) {
      if (c.tag === 'Folder') {
        const label = childText(c, 'name') || folder
        if (!folders.includes(label)) folders.push(label)
        walk(c, label)
      } else if (c.tag === 'Document') walk(c, folder)
      else if (c.tag === 'Placemark') {
        const name = childText(c, 'name')
        if (!name) {
          skipped++
          continue
        }
        const hasShape = descendants(c, 'LineString').length + descendants(c, 'Polygon').length > 0
        const coords = descendants(c, 'Point').flatMap((p) => descendants(p, 'coordinates'))[0]?.text.trim()
        const [lng, lat] = coords ? coords.split(/[,\s]+/).map(Number) : []
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
        if (!hasCoords && hasShape) {
          skipped++ // linee e aree
          continue
        }
        // colonne del foglio da cui è nata la mappa: Tipologia, Città, Indirizzo, Note
        const data: Record<string, string> = {}
        for (const d of descendants(c, 'Data')) data[(d.attrs.match(/name="([^"]*)"/)?.[1] ?? '').toLowerCase()] = childText(d, 'value')
        const rawDesc = child(c, 'description')?.text ?? ''
        const links = googleLinks(rawDesc)
        const note =
          data.note !== undefined ? data.note : plainText(rawDesc.replace(URL_RE, (u) => (GOOGLE_RE.test(decodeEntities(u)) ? '' : u)))
        const address = childText(c, 'address') || [name, data.indirizzo].filter(Boolean).join(' ')
        const la = hasCoords ? lat : null
        const lo = hasCoords ? lng : null
        const point: KmzPoint = {
          name,
          folder,
          type: (data.tipologia ?? '').trim(),
          city: (data['città'] ?? data.citta ?? '').trim(),
          lat: la,
          lng: lo,
          address,
          note,
          links,
          url: mapsUrlFor(name, la, lo, links, address),
        }
        points.push(point)
        raw.set(point, data)
      }
    }
  }
  walk(root.children.find((c) => c.tag === 'kml') ?? root, '')

  // righe del foglio con le colonne sfalsate (es. Città = «Ristorante», Indirizzo = «Osaka»): le raddrizzo
  const typeCount = new Map<string, number>()
  for (const p of points) if (p.type) typeCount.set(p.type.toLowerCase(), (typeCount.get(p.type.toLowerCase()) ?? 0) + 1)
  const common = (v: string) => (typeCount.get(v.trim().toLowerCase()) ?? 0) >= 3
  for (const p of points) {
    const d = raw.get(p) ?? {}
    if (p.city && common(p.city) && !common(p.type)) {
      p.type = p.city
      p.city = (d.indirizzo ?? '').trim()
      p.note = ''
      p.address = [p.name, d.note].filter(Boolean).join(' ')
      p.url = mapsUrlFor(p.name, p.lat, p.lng, p.links, p.address)
    }
  }
  return { points, skipped, folders }
}

/** Legge un file scelto dall'utente (.kmz o .kml). */
export async function readKmzFile(file: File): Promise<KmzContent> {
  const content = parseKml(await kmlFromBytes(new Uint8Array(await file.arrayBuffer())))
  if (content.points.length === 0) throw new Error('Nella mappa non ho trovato nessun luogo.')
  return content
}
