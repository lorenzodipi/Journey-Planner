// Un alloggio con il link di Google Maps diventa anche un luogo (categoria «Alloggio»): si vede in Luoghi e si può
// aggiungere come tappa a un giorno, per contare bene i tempi (es. passare in hotel a metà giornata).
import { parseMapsUrl } from './mapsUrl'
import type { PlaceInput } from './tripApi'
import type { Place, Stay } from '../types'

export const CATEGORIA_ALLOGGIO = 'Alloggio'

type DatiAlloggio = Pick<Stay, 'name' | 'city' | 'address' | 'mapsUrl'>

/** Il luogo dell'alloggio, se il link di Maps dà una posizione; altrimenti `null`. */
export function luogoDaAlloggio(s: DatiAlloggio, esistente?: Place): PlaceInput | null {
  const info = s.mapsUrl ? parseMapsUrl(s.mapsUrl) : null
  if (!info || !s.name.trim()) return null
  return {
    name: s.name.trim(),
    nameLocal: esistente?.nameLocal ?? '',
    city: s.city?.trim() ?? '',
    category: CATEGORIA_ALLOGGIO,
    status: esistente?.status ?? 'planned',
    notes: esistente?.note ?? '',
    address: s.address?.trim() ?? '',
    mapsUrl: s.mapsUrl ?? '',
    openingHours: esistente?.openingHours ?? '',
    lat: info.lat,
    lng: info.lng,
  }
}

const chiave = (t: string) => t.trim().toLowerCase()

/** Il luogo già creato per questo alloggio: stessa categoria e stesso nome (anche quello prima di una rinomina). */
export function luogoEsistente(places: readonly Place[], ...nomi: (string | undefined)[]): Place | undefined {
  const cercati = nomi.filter((n): n is string => !!n?.trim()).map(chiave)
  return places.find((p) => chiave(p.category) === chiave(CATEGORIA_ALLOGGIO) && cercati.includes(chiave(p.name)))
}
