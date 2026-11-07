// Copertine dei viaggi: un'illustrazione per paese, scelta dal paese in cui il viaggio passa più giorni.
// Le immagini stanno in src/assets/paesi/<codice ISO>.webp (es. JP.webp): per aggiungerne o cambiarne una
// basta mettere il file con il codice giusto, l'elenco si aggiorna da solo alla build.
// Vite le pubblica come file a parte: si scaricano solo quando una card le mostra.
import type { Trip, TripCountry } from '../types'
import { countryByName } from './countries'
import { paesePrincipale } from './paesi'

const files = import.meta.glob('../assets/paesi/*.webp', { eager: true, query: '?no-inline', import: 'default' }) as Record<string, string>

const URL_PER_PAESE: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.webp'.length).toUpperCase(), url]),
)

/** L'indirizzo della copertina di un paese (codice ISO), se c'è. */
export function copertinaDelPaese(code: string | undefined | null): string | undefined {
  return code ? URL_PER_PAESE[code.toUpperCase()] : undefined
}

type Base = Pick<Trip, 'destination' | 'timezone' | 'localCurrency' | 'fxRate' | 'startDate' | 'endDate' | 'center'> & { countries?: TripCountry[] }

/** Il paese della copertina: quello con più giorni nel viaggio; senza paesi salvati, quello della destinazione. */
export function paeseDellaCopertina(trip: Base): string | undefined {
  const code = paesePrincipale(trip).country || countryByName(trip.destination)?.code
  return code ? code.toUpperCase() : undefined
}

/** La copertina del viaggio, o undefined se il paese non ha un'immagine (si usa l'illustrazione generica). */
export function copertinaDelViaggio(trip: Base): string | undefined {
  return copertinaDelPaese(paeseDellaCopertina(trip))
}
