import {
  faBagShopping,
  faBed,
  faBuildingColumns,
  faCartShopping,
  faChessRook,
  faCity,
  faGasPump,
  faHotTubPerson,
  faLocationDot,
  faMasksTheater,
  faMoon,
  faBus,
  faMountainSun,
  faMugHot,
  faPlane,
  faToriiGate,
  faTrainSubway,
  faTree,
  faUtensils,
  faShieldHalved,
  faArrowsUpDown,
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
  | 'train'
  | 'airport'
  | 'transit'
  | 'night'
  | 'fun'
  | 'grocery'
  | 'fuel'
  | 'shield'
  | 'connection'
  | 'pin'

// L'ordine conta: «parco giochi» deve battere «parco».
const RULES: [PinIcon, RegExp][] = [
  ['shield', /assicura|polizza|insurance/],
  ['connection', /connession|\besim\b|e-sim|\bsim\b|internet|roaming|dati mobili|router|pocket wi/],
  // prima di «shopping» («supermercato» contiene «mercat») e di «transit» («stazione di servizio»)
  ['grocery', /supermerc|alimentar|\bspesa\b|konbini|conbini|minimarket|drogheria|negozio di alimenti/],
  ['fuel', /benzin|carburant|rifornimento|distributor|stazione di servizio|area di servizio|gas station|\bgpl\b|\bpompa\b/],
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
  // «aeroporto» prima di «porto» (traghetti) e le stazioni dei treni prima dei trasporti generici
  ['airport', /aeropor|airport|\bvol[oi]\b|scalo/],
  ['train', /stazion|trenit?|treno|treni|ferrovi|shinkansen|binario|metro\b|metropolitana|\bjr\b/],
  ['transit', /trasport|autobus|\bbus\b|pullman|taxi|porto\b|traghett|terminal/],
  ['night', /nott|nightlife|vita notturna|locali|discoteca|club\b|pub\b/],
  ['district', /quartier|citta|zona|strada|centro|distretto|via\b|borgo|villaggio/],
]

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** Icone che si possono scegliere per una categoria nuova, con il nome per chi usa lo screen reader. */
export const ICONE_CATEGORIA: { id: PinIcon; nome: string }[] = [
  { id: 'food', nome: 'Cibo' },
  { id: 'cafe', nome: 'Caffè' },
  { id: 'shopping', nome: 'Shopping' },
  { id: 'grocery', nome: 'Spesa' },
  { id: 'stay', nome: 'Alloggio' },
  { id: 'airport', nome: 'Aereo' },
  { id: 'train', nome: 'Treno' },
  { id: 'transit', nome: 'Bus e trasporti' },
  { id: 'fuel', nome: 'Carburante' },
  { id: 'temple', nome: 'Tempio' },
  { id: 'museum', nome: 'Museo' },
  { id: 'castle', nome: 'Castello' },
  { id: 'viewpoint', nome: 'Panorama' },
  { id: 'nature', nome: 'Natura' },
  { id: 'district', nome: 'Quartiere' },
  { id: 'spa', nome: 'Terme e relax' },
  { id: 'night', nome: 'Sera' },
  { id: 'fun', nome: 'Svago' },
  { id: 'shield', nome: 'Assicurazione' },
  { id: 'connection', nome: 'Connessione' },
  { id: 'pin', nome: 'Generica' },
]
const SCEGLIBILI = new Set<string>(ICONE_CATEGORIA.map((x) => x.id))

/** Icone scelte per le categorie del viaggio attivo (per nome): hanno la precedenza su quelle dedotte. */
const scelte = new Map<string, PinIcon>()
export function impostaIconeScelte(cats: readonly { label: string; icon?: string }[]): void {
  scelte.clear()
  for (const c of cats) if (c.icon && SCEGLIBILI.has(c.icon)) scelte.set(normalize(c.label), c.icon as PinIcon)
}

/** Icona dedotta dal nome, senza guardare quelle scelte (per proporla mentre si scrive il nome). */
export function iconaDalNome(label: string | undefined | null): PinIcon {
  const text = normalize(label ?? '')
  if (!text) return 'pin'
  return RULES.find(([, re]) => re.test(text))?.[0] ?? 'pin'
}

export function categoryIcon(label: string | undefined | null): PinIcon {
  const text = normalize(label ?? '')
  if (!text) return 'pin'
  const scelta = scelte.get(text)
  if (scelta) return scelta
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
  train: faTrainSubway,
  airport: faPlane,
  transit: faBus,
  night: faMoon,
  fun: faMasksTheater,
  grocery: faCartShopping,
  fuel: faGasPump,
  shield: faShieldHalved,
  connection: faArrowsUpDown,
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

/** Glifo pieno dello sprite per una categoria (riquadri dei fogli): dall'icona scelta o dedotta dal nome. */
export function glifoCategoria(label: string): string {
  const i = categoryIcon(label)
  return i === 'shield' ? 'g-sez-shield' : i === 'connection' ? 'g-sez-sim' : `g-cat-${i}`
}
