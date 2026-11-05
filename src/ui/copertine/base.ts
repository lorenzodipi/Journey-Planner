// Motore delle copertine per paese: la stessa grammatica delle scene del Design System (cielo tinta unita, sole a disco,
// nuvole, due o tre strati di terreno) con un monumento o un paesaggio tipico del paese al centro. Tutto è generato:
// niente file per paese, la copertina di un codice ISO si compone al momento (vedi paesi.ts per la tabella).

export type Terreno = 'colline' | 'dune' | 'mare' | 'monti' | 'neve' | 'savana'

export interface Palette {
  sky: string
  sun: string
  /** terreno lontano, di mezzo, vicino */
  a: string
  b: string
  c: string
  /** colore del monumento */
  k: string
}

/** Colori presi dalle scene esistenti (tempio, città, natura, mare) e dai token del tema. */
export const PALETTE: Record<string, Palette> = {
  rosa: { sky: '#FEF1F5', sun: '#FF8F92', a: '#C1AFFF', b: '#3BBB9C', c: '#1FA085', k: '#F04C55' },
  cielo: { sky: '#A8D1F1', sun: '#FF8F92', a: '#78B8E8', b: '#3BBB9C', c: '#1FA085', k: '#F04C55' },
  lavanda: { sky: '#EAE5FF', sun: '#F683B3', a: '#C1AFFF', b: '#9085FB', c: '#6B5FD6', k: '#FF6E70' },
  sabbia: { sky: '#FFF0D6', sun: '#FF8F5A', a: '#F5C77E', b: '#E9A55A', c: '#D07F3A', k: '#A8470A' },
  menta: { sky: '#CFF3E8', sun: '#FFB36B', a: '#6BD3B8', b: '#3BBB9C', c: '#1FA085', k: '#075A99' },
  tramonto: { sky: '#FFE1EC', sun: '#FF655A', a: '#FF9795', b: '#F683B3', c: '#A02262', k: '#5C2EAF' },
  ghiaccio: { sky: '#E4ECF8', sun: '#FFFFFF', a: '#D3E8F9', b: '#FFFFFF', c: '#A8D1F1', k: '#0866AD' },
  oceano: { sky: '#D3E8F9', sun: '#FFC857', a: '#45A0DD', b: '#1E8AD3', c: '#F5E1B8', k: '#F04C55' },
  giungla: { sky: '#CFF3E8', sun: '#FFD27A', a: '#3BBB9C', b: '#1FA085', c: '#0F6853', k: '#F683B3' },
  pesca: { sky: '#FFE0DE', sun: '#FFB36B', a: '#FF9795', b: '#F5C77E', c: '#E9A55A', k: '#A82C34' },
  oro: { sky: '#FFF4CF', sun: '#FF9B52', a: '#F9D56E', b: '#8BC34A', c: '#4C9A2A', k: '#D62839' },
  mareSera: { sky: '#FFE0DE', sun: '#FF655A', a: '#45A0DD', b: '#1E8AD3', c: '#F5E1B8', k: '#5C2EAF' },
  mareLav: { sky: '#EAE5FF', sun: '#F683B3', a: '#79A1FC', b: '#1E8AD3', c: '#F5E1B8', k: '#F04C55' },
  mareTur: { sky: '#CFF3E8', sun: '#FFD27A', a: '#5CD5C7', b: '#1FA085', c: '#F5E1B8', k: '#F683B3' },
  ghiaccio2: { sky: '#FFE1EC', sun: '#FF8F5A', a: '#FFFFFF', b: '#E4ECF8', c: '#D3E8F9', k: '#A02262' },
  cobalto: { sky: '#D3E8F9', sun: '#FF8F92', a: '#79A1FC', b: '#3BBB9C', c: '#1FA085', k: '#FFFFFF' },
}

/** Hash di una stringa (FNV-1a): dà a ogni paese variazioni sue, sempre uguali. */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const n = (v: number) => Math.round(v * 10) / 10

/** Colore mescolato col bianco (t>0) o col nero (t<0), per le ombre e le luci del monumento. */
export function mix(hex: string, t: number): string {
  const v = parseInt(hex.slice(1), 16)
  const ch = [v >> 16, (v >> 8) & 255, v & 255].map((x) => Math.round(t >= 0 ? x + (255 - x) * t : x * (1 + t)))
  return `#${ch.map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

export interface Ctx {
  /** colore principale, chiaro, scuro e «carta» del monumento */
  k: string
  k2: string
  kd: string
  l: string
  /** i tre strati di terreno */
  a: string
  b: string
  c: string
  /** numero casuale stabile per le piccole varianti (quanti alberi, che verso…) */
  h: number
}

export const rect = (x: number, y: number, w: number, h: number, f: string, rx = 0) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${rx}"` : ''} fill="${f}"/>`
export const circ = (x: number, y: number, r: number, f: string, o = 1) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${f}"${o < 1 ? ` fill-opacity="${o}"` : ''}/>`
export const ell = (x: number, y: number, rx: number, ry: number, f: string) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${f}"/>`
export const path = (d: string, f: string, extra = '') => `<path d="${d}" fill="${f}"${extra}/>`
/** Poligono da coppie x,y. */
export const poly = (pts: number[], f: string) => `<polygon points="${pts.map(n).join(' ')}" fill="${f}"/>`
export const line = (x1: number, y1: number, x2: number, y2: number, s: string, w = 2) => `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" stroke="${s}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`

const nuvola = (x: number, y: number, k: number) =>
  `<g fill="#FFFFFF"><rect x="${n(x)}" y="${n(y)}" width="${n(54 * k)}" height="${n(16 * k)}" rx="${n(8 * k)}"/><circle cx="${n(x + 18 * k)}" cy="${n(y + 2 * k)}" r="${n(11 * k)}"/><circle cx="${n(x + 33 * k)}" cy="${n(y - 1 * k)}" r="${n(14 * k)}"/></g>`

/** Strati di terreno: `dietro` va prima del monumento, `davanti` dopo (copre la base del monumento). */
function terreno(t: Terreno, c: Ctx): { dietro: string; davanti: string } {
  switch (t) {
    case 'dune':
      return {
        dietro:
          path('M-10 142C40 120 80 124 130 140C180 156 230 124 330 132L330 250L-10 250Z', c.a) +
          path('M-10 176C50 158 110 160 170 176C230 192 290 160 330 164L330 250L-10 250Z', c.b),
        davanti: path('M-10 214C60 196 130 196 190 212C240 224 290 200 330 198L330 250L-10 250Z', c.c) + `<path d="M20 226C60 220 90 222 120 228M200 222C230 216 270 218 300 224" stroke="${mix(c.c, 0.35)}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      }
    case 'mare':
      return {
        dietro:
          rect(0, 140, 320, 100, c.a) +
          rect(0, 168, 320, 72, c.b) +
          `<g stroke="#FFFFFF" stroke-opacity=".7" stroke-width="2" stroke-linecap="round" fill="none"><path d="M24 156h26M250 152h30M140 160h20"/><path d="M46 184h34M240 180h28"/></g>` +
          ell(160, 196, 118, 26, mix(c.c, -0.12)),
        davanti: ell(160, 204, 110, 18, c.c) + `<path d="M-10 238C60 224 120 232 180 236S290 228 330 234L330 250L-10 250Z" fill="${c.b}"/>`,
      }
    case 'monti':
      return {
        dietro:
          poly([-10, 150, 52, 78, 100, 150], c.a) +
          poly([36, 150, 52, 78, 64, 102, 48, 112], '#FFFFFF') +
          poly([220, 150, 270, 70, 330, 150], c.a) +
          poly([254, 98, 270, 70, 286, 100, 270, 108, 258, 106], '#FFFFFF') +
          path('M-10 176C30 160 70 150 110 160C150 170 200 148 250 152C290 156 320 160 330 162L330 250L-10 250Z', c.b),
        davanti: path('M-10 208C6 204 56 188 90 188C123 188 150 208 190 208C230 207 307 188 330 184L330 250L-10 250Z', c.c),
      }
    case 'neve':
      return {
        dietro: path('M-10 150C30 136 90 128 140 142C190 156 250 130 330 134L330 250L-10 250Z', c.a) + path('M-10 182C40 168 120 166 180 180C240 194 290 168 330 170L330 250L-10 250Z', c.b),
        davanti: path('M-10 212C70 196 140 198 200 212C250 222 300 204 330 202L330 250L-10 250Z', c.c),
      }
    case 'savana':
      return {
        dietro: path('M-10 150C40 138 90 140 140 150C190 160 250 140 330 144L330 250L-10 250Z', c.a) + path('M-10 180C50 168 110 170 170 182C230 194 290 170 330 174L330 250L-10 250Z', c.b),
        davanti: path('M-10 212C60 200 130 202 190 214C240 222 290 206 330 204L330 250L-10 250Z', c.c) + circ(48, 226, 4, mix(c.c, 0.3)) + circ(262, 224, 3.5, mix(c.c, 0.3)),
      }
    default:
      return {
        dietro:
          path('M-10 150C1.7 145.3 36.7 123.3 60 122C83.3 120.7 106.7 142.3 130 142C153.3 141.7 176.7 120.3 200 120C223.3 119.7 248.3 139 270 140C291.7 141 320 128.3 330 126L330 250L-10 250Z', c.a) +
          path('M-10 178C3.3 173.7 43.3 152.7 70 152C96.7 151.3 121.7 174.3 150 174C178.3 173.7 210 150.3 240 150C270 149.7 315 168.3 330 172L330 250L-10 250Z', c.b),
        davanti: path('M-10 208C6.7 204.7 56.7 188 90 188C123.3 188 150 208.7 190 208C230 207.3 306.7 188 330 184L330 250L-10 250Z', c.c),
      }
  }
}

export type Motivo = (c: Ctx) => string

/** Compone la scena: `motivo` è disegnato con l'origine alla base, al centro, e cresce verso l'alto (y negative). */
export function scena(motivo: Motivo, terr: Terreno, p: Palette, codice: string): string {
  const h = hash(codice)
  const sinistra = h % 2 === 0
  const cx = sinistra ? 124 : 196
  const sunX = sinistra ? 232 : 88
  const sunY = 78 + (h % 5) * 8
  const sunR = 30 + ((h >> 3) % 4) * 8
  const c: Ctx = { k: p.k, k2: mix(p.k, 0.35), kd: mix(p.k, -0.25), l: '#FAF7F3', a: p.a, b: p.b, c: p.c, h }
  const t = terreno(terr, c)
  const nub = nuvola(sinistra ? 240 : 22, 38 + ((h >> 5) % 3) * 8, 1) + nuvola(sinistra ? 20 : 236, 66 + ((h >> 7) % 3) * 6, 0.7)
  const fiori = [0, 1, 2].map((i) => circ(30 + ((h >> (9 + i * 3)) % 7) * 40, 224 + (i % 2) * 8, 3 + (i % 2), [mix(p.k, 0.45), '#FFFFFF', mix(p.sun, 0.2)][i], 0.9)).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true" viewBox="0 0 320 240">` +
    rect(0, 0, 320, 240, p.sky) +
    circ(sunX, sunY, sunR, p.sun) +
    nub +
    t.dietro +
    `<g transform="translate(${cx} 192)">${motivo(c)}</g>` +
    t.davanti +
    fiori +
    `</svg>`
  )
}
