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
  ['stay', /alloggi|hotel|ryokan|hostel|dormire|\bbnb\b|pernott/],
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

// Tratti SVG (viewBox 24, solo contorno) per i marcatori della mappa, che sono elementi DOM e non componenti.
export const PIN_ICON_PATHS: Record<PinIcon, string> = {
  temple: 'M3 6c3 1.5 15 1.5 18 0M5 10h14M7 7v13M17 7v13',
  food: 'M6 3v6a1.5 1.5 0 0 0 3 0V3M7.5 10v11M16 21V3c-2 1.5-3 4-3 7h3',
  cafe: 'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2',
  shopping: 'M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2',
  nature: 'M12 3l5 8h-3l4 6H6l4-6H7l5-8zM12 17v4',
  viewpoint: 'M3 19l6-10 4 6 2-3 6 7H3z',
  district: 'M4 21V8l6-3v16M10 21V10l10 3v8M3 21h18M7 11h.01M7 15h.01M15 16h.01',
  museum: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
  castle: 'M5 21V8h3V5h2v3h4V5h2v3h3v13M10 21v-5a2 2 0 0 1 4 0v5',
  spa: 'M8 3c-1 1.5 1 2.5 0 4M12 3c-1 1.5 1 2.5 0 4M16 3c-1 1.5 1 2.5 0 4M4 13c2 2 4 2 8 0s6-2 8 0M4 18c2 2 4 2 8 0s6-2 8 0',
  stay: 'M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5h.01',
  transit: 'M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 10h14M9 14h.01M15 14h.01M8 21l2-3M16 21l-2-3',
  night: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  fun: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
  pin: 'M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10zM12 11h.01',
}

/** Marcatore SVG già pronto (testo fisso del nostro codice, nessun dato dell'utente dentro). */
export function pinIconSvg(icon: PinIcon): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PIN_ICON_PATHS[icon]}"/></svg>`
}
