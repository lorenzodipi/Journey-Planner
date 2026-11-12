// Estrae le coordinate da un link di Google Maps (o simili) incollato dall'utente.
// I link corti (maps.app.goo.gl) non si possono risolvere dal browser: in quel caso
// restituiamo null e l'interfaccia chiede il link completo.

export interface MapsInfo {
  lat: number
  lng: number
  name?: string
}

const inRange = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '))
  } catch {
    return text
  }
}

/** Il nome del posto dal pezzo «/maps/place/…» del link. Google a volte ci mette anche l'indirizzo dopo una virgola
 *  («Disney FANTASY SHOP, 1-chome-9-1 Marunouchi, Chiyoda City, Tokyo 100-0005, Japan»): si tiene solo il nome.
 *  Se il pezzo è solo un indirizzo o delle coordinate, nessun nome (lo scrive chi usa l'app). */
export function nomeDalLink(pezzo: string): string | undefined {
  const testo = safeDecode(pezzo).replace(/\s+/g, ' ').trim()
  if (!testo) return undefined
  // coordinate scritte come nome: «35°40'39.1"N 139°45'57.0"E» o «35.6775,139.7658»
  if (/^-?\d+(?:[.,]\d+)?°/.test(testo) || /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(testo)) return undefined
  const parti = testo.split(/\s*,\s*/).filter(Boolean)
  const nome = parti.length > 1 && (parti.length > 2 || /\d/.test(parti.slice(1).join(' '))) ? parti[0] : testo
  // un indirizzo puro comincia col numero civico («1-chome-9-1 Marunouchi», «12 Via Roma»): non è un nome
  if (/^\d+[\s-]/.test(nome) && parti.length > 1) return undefined
  return nome || undefined
}

export function parseMapsUrl(raw: string): MapsInfo | null {
  const text = raw.trim()
  if (!/^https?:\/\//i.test(text)) return null

  const nameMatch = text.match(/\/maps\/place\/([^/@?]+)/)
  const name = nameMatch ? nomeDalLink(nameMatch[1]) : undefined

  const patterns: RegExp[] = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // pin preciso del luogo
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // centro della mappa
    /[?&](?:q|query|ll|center|destination)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (!m) continue
    const lat = Number(m[1])
    const lng = Number(m[2])
    if (inRange(lat, lng)) return { lat, lng, name }
  }
  return null
}

/** Link per aprire il luogo in Google Maps (usa quello salvato, altrimenti le coordinate o il nome). */
export function mapsLinkFor(p: { mapsUrl?: string; lat: number | null; lng: number | null; name: string; city?: string }): string {
  if (p.mapsUrl) return p.mapsUrl
  const query = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : [p.name, p.city].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
