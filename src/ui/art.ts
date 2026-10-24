// Illustrazioni del Design System v3 (le stesse dei mock).
import calendario from '../assets/art/calendario.svg'
import castello from '../assets/art/castello.svg'
import cibo from '../assets/art/cibo.svg'
import citta from '../assets/art/citta.svg'
import lockup from '../assets/art/faraway-lockup.svg'
import lockupReverse from '../assets/art/faraway-lockup-reverse.svg'
import symbol from '../assets/art/faraway-symbol.svg'
import mare from '../assets/art/mare.svg'
import natura from '../assets/art/natura.svg'
import notte from '../assets/art/notte.svg'
import panorama from '../assets/art/panorama.svg'
import partenza from '../assets/art/partenza.svg'
import profilo from '../assets/art/profilo.svg'
import tempio from '../assets/art/tempio.svg'
import vuotoLuoghi from '../assets/art/vuoto-luoghi.svg'
import vuotoViaggi from '../assets/art/vuoto-viaggi.svg'

export const ART = { calendario, castello, cibo, citta, lockup, lockupReverse, symbol, mare, natura, notte, panorama, partenza, profilo, tempio, vuotoLuoghi, vuotoViaggi }

/** Scena per categoria di luogo (come nei mock: tempio, castello, cibo, quartiere, natura...). */
export function sceneFor(category: string | undefined): string {
  switch (category) {
    case 'temple':
      return tempio
    case 'castle':
      return castello
    case 'food':
    case 'cafe':
      return cibo
    case 'district':
    case 'shopping':
      return citta
    case 'nature':
    case 'viewpoint':
      return natura
    case 'night':
      return notte
    default:
      return panorama
  }
}

const CAT_SYMBOLS = new Set(['airport', 'cafe', 'castle', 'district', 'food', 'museum', 'nature', 'night', 'shopping', 'temple', 'viewpoint'])
/** Simbolo del disco di categoria (i-cat-temple, ...); per le categorie senza disco dedicato, il pin. */
export function catSymbol(icon: string): string {
  return CAT_SYMBOLS.has(icon) ? `i-cat-${icon}` : 'i-nav-pin'
}
