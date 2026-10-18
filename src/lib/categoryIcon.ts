import {
  faBagShopping,
  faBed,
  faBuildingColumns,
  faChessRook,
  faCity,
  faHotTubPerson,
  faLocationDot,
  faMasksTheater,
  faMoon,
  faMountainSun,
  faMugHot,
  faToriiGate,
  faTrainSubway,
  faTree,
  faUtensils,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'

// Icona di un luogo in base alla sua categoria. Le categorie sono etichette libere («Tempio»,
// «Ristorante», «Punto panoramico»…): si riconoscono per parole chiave, senza badare a maiuscole e accenti.

export type PinIcon =
  | 'temple'
  | 'food'
  | 'cafe'
  | 'shopping'
  | 'nature'
  | 'viewpoint'
  | 'district'
  | 'museum'
  | 'castle'
  | 'spa'
  | 'stay'
  | 'transit'
  | 'night'
  | 'fun'
  | 'pin'

// L'ordine conta: «parco giochi» deve battere «parco».
const RULES: [PinIcon, RegExp][] = [
  ['fun', /divertiment|parco giochi|attrazion|gioc|arcade|anime|manga|spettacol|intrattenim|esperienz|show|teatro|cinema|karaoke/],
  ['temple', /tempi|templ|santuar|shrine|torii|pagod|chies|cattedral|moschea|monaster|buddh/],
  ['spa', /onsen|term[ae]|\bspa\b|relax|benessere|bagni/],
  ['castle', /castell|fortezz|forte\b|palazzo|reggia|samurai/],
  ['museum', /muse[oi]|galleri|\barte\b|mostra|storic|monument|archeolog|biblioteca/],
  ['viewpoint', /panoram|belvedere|osservator|\bvista|skyline|montagn|monte\b|vulcan|cima|torre/],
  ['nature', /natur|parco|giardin|lago|foresta|bosco|spiagg|mare\b|cascat|fiume|isola|sentier|trekking|escursion|hike|ciliegi|fioritur/],
  ['cafe', /caff|\bbar\b|\bte\b|tea|dolc|pasticc|gelat|colazion|bevand/],
  ['food', /cibo|ristorant|ramen|sushi|trattor|izakaya|pranzo|cena|street food|cucina|mangiare|food|udon|soba|tempura|yakitori|osteria|pizz/],
  ['shopping', /shopping|negozi|acquist|mercat|market|souvenir|outlet|centro commerciale|boutique/],
  ['stay', /alloggi|hotel|ryokan|hostel|dormire|\bbnb\b|pernott|\bcasa\b|\bcase\b|appartament|airbnb|ostell|homestay/],
  ['transit', /stazion|trasport|trenit?|treno|aeropor|metro|autobus|porto\b|traghett/],
  ['night', /nott|nightlife|vita notturna|locali|discoteca|club\b|pub\b/],
  ['district', /quartier|citta|zona|strada|centro|distretto|via\b|borgo|villaggio/],
]

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

export function categoryIcon(label: string | undefined | null): PinIcon {
  const text = normalize(label ?? '')
  if (!text) return 'pin'
  return RULES.find(([, re]) => re.test(text))?.[0] ?? 'pin'
}

// Icone dei marcatori della mappa (elementi DOM, non componenti) e dei cerchi delle categorie.
// Sono di Font Awesome Free (https://fontawesome.com, licenza CC BY 4.0).
export const PIN_ICONS: Record<PinIcon, IconDefinition> = {
  temple: faToriiGate,
  food: faUtensils,
  cafe: faMugHot,
  shopping: faBagShopping,
  nature: faTree,
  viewpoint: faMountainSun,
  district: faCity,
  museum: faBuildingColumns,
  castle: faChessRook,
  spa: faHotTubPerson,
  stay: faBed,
  transit: faTrainSubway,
  night: faMoon,
  fun: faMasksTheater,
  pin: faLocationDot,
}

/** Disegno interno di un'icona (viewBox + tracciato), usato da marcatori e cerchi. */
export function pinIconShape(icon: PinIcon): { viewBox: string; d: string } {
  const [w, h, , , path] = PIN_ICONS[icon].icon
  return { viewBox: `0 0 ${w} ${h}`, d: path as string }
}

/** Marcatore SVG già pronto (testo fisso del nostro codice, nessun dato dell'utente dentro). */
export function pinIconSvg(icon: PinIcon): string {
  const { viewBox, d } = pinIconShape(icon)
  return `<svg viewBox="${viewBox}" fill="#fff" aria-hidden="true"><path d="${d}"/></svg>`
}
