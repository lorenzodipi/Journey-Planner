// Monumenti, parte 3: Sud-est asiatico, Africa, Americhe, Oceania e poli.
import { circ, ell, line, path, poly, rect, mix, type Ctx } from './base'
import { pino } from './motivi1'

const LEGNO = '#C9B79C'
const SABBIA = '#F5E1B8'

/** Palma con il fusto inclinato di `lean` pixel. */
export const palma = (x: number, h: number, lean: number, _verde?: string) => {
  const verde = x % 2 ? '#1FA085' : '#3BBB9C'
  const cx = x + lean
  const foglia = (a: number) => `<g transform="translate(${cx} ${-h}) rotate(${a})">${path('M0 0Q14 -13 32 5Q15 -3 0 0Z', verde)}</g>`
  return `<path d="M${x} 0Q${x + lean * 0.2} ${-h * 0.5} ${cx} ${-h}" stroke="${LEGNO}" stroke-width="5" stroke-linecap="round" fill="none"/>` + [-170, -138, -105, -72, -38, -5, 22, 158].map(foglia).join('')
}

export const angkor = (c: Ctx) => {
  const lotus = (x: number, s: number, f: string) => path(`M${x - 12 * s} 0L${x - 12 * s} ${-36 * s}Q${x - 12 * s} ${-52 * s} ${x - 6 * s} ${-62 * s}Q${x - 3 * s} ${-82 * s} ${x} ${-94 * s}Q${x + 3 * s} ${-82 * s} ${x + 6 * s} ${-62 * s}Q${x + 12 * s} ${-52 * s} ${x + 12 * s} ${-36 * s}L${x + 12 * s} 0Z`, f)
  return rect(-88, -10, 176, 10, c.k2) + rect(-78, -20, 156, 10, c.k2) + `<g transform="translate(0 -20)">${lotus(-70, 0.62, c.kd)}${lotus(70, 0.62, c.kd)}${lotus(-40, 0.8, c.k2)}${lotus(40, 0.8, c.k2)}${lotus(0, 1, c.k)}</g>` + rect(-6, -44, 12, 24, c.kd, 6)
}

export const stupa = (c: Ctx) => {
  const oro = '#FFC857'
  const ombra = '#E9A55A'
  return (
    rect(-34, -10, 68, 10, c.k2) +
    rect(-27, -20, 54, 10, c.kd) +
    path('M-21 -20C-21 -54 -10 -66 0 -66C10 -66 21 -54 21 -20Z', oro) +
    path('M4 -20C4 -50 8 -60 0 -66C10 -66 21 -54 21 -20Z', ombra) +
    rect(-7, -74, 14, 8, oro) +
    rect(-4.5, -82, 9, 8, ombra) +
    poly([-3.5, -82, 0, -118, 3.5, -82], oro) +
    path('M-62 0L-62 -26Q-62 -40 -54 -44Q-46 -40 -46 -26L-46 0Z', ombra) +
    path('M46 0L46 -26Q46 -40 54 -44Q62 -40 62 -26L62 0Z', ombra)
  )
}

export const borobudur = (c: Ctx) => {
  const campane = [-34, -17, 0, 17, 34].map((x) => ell(x, -60, 6.5, 7.5, c.kd)).join('')
  return (
    rect(-88, -10, 176, 10, c.k2) +
    rect(-76, -24, 152, 14, c.k) +
    rect(-62, -38, 124, 14, c.k2) +
    rect(-48, -52, 96, 14, c.k) +
    campane +
    [-60, -36, -12, 12, 36, 60].map((x) => ell(x, -30, 4.5, 5, c.kd)).join('') +
    path('M-13 -52C-13 -88 13 -88 13 -52Z', c.k2) +
    line(0, -84, 0, -100, c.kd, 2.5)
  )
}

export const karst = (c: Ctx) => {
  const roccia = mix(c.b, -0.32)
  const cima = (x: number, w: number, h: number) => path(`M${x - w} 0Q${x - w - 4} ${-h * 0.6} ${x - w * 0.5} ${-h * 0.92}Q${x} ${-h * 1.05} ${x + w * 0.5} ${-h * 0.9}Q${x + w + 2} ${-h * 0.5} ${x + w} 0Z`, roccia) + path(`M${x - w * 0.5} ${-h * 0.92}Q${x} ${-h * 1.05} ${x + w * 0.5} ${-h * 0.9}Q${x} ${-h * 0.82} ${x - w * 0.5} ${-h * 0.92}Z`, c.c)
  return cima(-62, 24, 70) + cima(-8, 30, 104) + cima(54, 22, 62) + poly([20, -4, 76, -4, 68, 6, 28, 6], c.kd) + line(48, -6, 48, -54, c.kd, 2) + poly([48, -54, 70, -14, 48, -14], c.k) + poly([46, -48, 46, -14, 30, -14], c.k2)
}

export const terrazze = (c: Ctx) => {
  const gradini = [0, 1, 2, 3, 4].map((i) => `<path d="M${-74 + i * 10} ${-12 - i * 15}Q0 ${-26 - i * 15} ${74 - i * 10} ${-12 - i * 15}" stroke="${i % 2 ? mix(c.c, 0.35) : mix(c.c, -0.2)}" stroke-width="10" fill="none" stroke-linecap="round"/>`).join('')
  return poly([-100, 0, 0, -104, 100, 0], c.b) + gradini + rect(36, -26, 22, 16, c.k) + poly([32, -26, 47, -42, 62, -26], c.kd) + rect(44, -20, 7, 10, c.l, 2)
}

export const himalaya = (c: Ctx) => {
  const bandierine = (dir: number) => {
    const col = ['#3F8FE0', '#FFFFFF', '#F04C55', '#3BBB9C', '#FFC857']
    return `<path d="M0 -100L${dir * 70} -30" stroke="${c.kd}" stroke-width="1.4" fill="none"/>` + col.map((f, i) => rect(dir * (14 + i * 12) - 4, -92 + i * 12 + (i % 2), 8, 8, f)).join('')
  }
  return (
    poly([-100, 0, -52, -66, -30, -42, -4, -88, 26, -50, 54, -76, 100, 0], mix(c.a, -0.15)) +
    poly([-4, -88, 8, -66, 0, -62, -10, -70], '#FFFFFF') +
    rect(-40, -10, 80, 10, c.k2) +
    rect(-32, -20, 64, 10, c.k) +
    path('M-28 -20C-28 -54 28 -54 28 -20Z', '#FFFFFF') +
    rect(-11, -62, 22, 16, c.kd) +
    circ(-4.5, -55, 2.4, c.l) +
    circ(4.5, -55, 2.4, c.l) +
    [0, 1, 2, 3].map((i) => rect(-7 + i, -68 - i * 5, 14 - i * 2, 4, c.k)).join('') +
    poly([-1.5, -88, 0, -98, 1.5, -88], c.kd) +
    bandierine(-1) +
    bandierine(1)
  )
}

export const sigiriya = (c: Ctx) =>
  path('M-72 0L-62 -48Q-58 -88 -30 -90L30 -90Q58 -88 62 -48L72 0Z', mix(c.k, -0.1)) +
  path('M20 -90Q58 -88 62 -48L72 0L40 0Q50 -50 20 -90Z', c.kd) +
  ell(0, -92, 34, 7, c.c) +
  circ(-14, -100, 8, mix(c.c, -0.2)) +
  circ(10, -102, 10, mix(c.c, -0.1)) +
  rect(-5, -30, 10, 30, c.kd, 2) +
  ell(0, -4, 84, 7, '#FFFFFF').replace('fill="#FFFFFF"', 'fill="#FFFFFF" fill-opacity=".45"') +
  palma(-86, 44, -8, c.c) +
  palma(88, 38, 8, c.c)

export const acacia = (c: Ctx) => {
  const v = mix(c.c, -0.15)
  const giraffa =
    [-14, -8, 8, 14].map((x) => rect(64 + x - 1.8, -26, 3.6, 26, '#E9A55A')).join('') +
    ell(64, -34, 17, 9, '#F5C77E') +
    path('M72 -38L80 -40L88 -86L81 -88Z', '#F5C77E') +
    ell(87, -90, 8, 4.5, '#F5C77E').replace('<ellipse', '<ellipse transform="rotate(-20 87 -90)"') +
    line(84, -96, 84, -101, '#E9A55A', 2) +
    [56, 66, 74].map((x, i) => circ(x, -36 + (i % 2) * 4, 2.6, '#E9A55A')).join('')
  return rect(-3.5, -50, 7, 50, c.kd) + line(0, -34, -22, -52, c.kd, 3.5) + line(0, -34, 22, -50, c.kd, 3.5) + ell(0, -60, 48, 10, v) + ell(-24, -54, 26, 7.5, v) + ell(26, -54, 24, 7, v) + giraffa
}

export const kilimangiaro = (c: Ctx) =>
  path('M-116 0L-54 -72Q-24 -94 18 -94Q50 -90 70 -72L120 0Z', mix(c.a, -0.22)) +
  path('M-20 -94L18 -94Q42 -90 54 -78L38 -74L26 -80L8 -72L-6 -82L-22 -76L-38 -80Q-30 -92 -20 -94Z', '#FFFFFF') +
  rect(-71.5, -36, 5, 36, c.kd) +
  ell(-69, -40, 22, 6.5, mix(c.c, -0.15)) +
  rect(78.5, -28, 4, 28, c.kd) +
  ell(80.5, -31, 17, 5.5, mix(c.c, -0.15))

export const tavola = (c: Ctx) =>
  path('M-104 0L-76 -70L-62 -80L64 -80L78 -70L104 0Z', mix(c.a, -0.2)) +
  path('M20 -80L64 -80L78 -70L104 0L60 0Z', mix(c.a, -0.3)) +
  `<g fill="#FFFFFF" fill-opacity=".92"><ellipse cx="-30" cy="-84" rx="46" ry="9"/><ellipse cx="14" cy="-92" rx="30" ry="8"/><ellipse cx="46" cy="-82" rx="30" ry="7"/></g>` +
  rect(88, -22, 5, 22, c.l) +
  rect(86, -26, 9, 6, c.k) +
  [-60, -48, -36].map((x, i) => circ(x, -6 - (i % 2) * 3, 5, c.k2)).join('')

export const baobab = (c: Ctx) => {
  const tronco = '#9A7B5B'
  const b = (x: number, s: number) => `<g transform="translate(${x} 0) scale(${s})">${path('M-15 0C-11 -22 -24 -48 -13 -68L13 -68C24 -48 11 -22 15 0Z', tronco)}${[[-36, -94], [-14, -102], [14, -102], [36, -92]].map(([px, py]) => line(0, -66, px, py, tronco, 4) + circ(px, py - 3, 8, mix(c.c, -0.1))).join('')}</g>`
  return b(0, 1) + b(74, 0.62) + b(-78, 0.5)
}

export const cammello = (c: Ctx) => {
  const cam = (x: number, s: number, f: string) =>
    `<g transform="translate(${x} 0) scale(${s})">` +
    [-18, -11, 10, 17].map((l) => line(l, -34, l + (l < 0 ? -1 : 1), 0, f, 5.5)).join('') +
    ell(0, -44, 26, 12, f) +
    circ(-6, -58, 8, f) +
    `<path d="M20 -50Q34 -66 30 -82" stroke="${f}" stroke-width="9" stroke-linecap="round" fill="none"/>` +
    ell(35, -84, 9.5, 5.5, f).replace('<ellipse', '<ellipse transform="rotate(-15 35 -84)"') +
    line(-26, -48, -32, -36, f, 3) +
    `</g>`
  return cam(-52, 0.62, c.kd) + cam(8, 1, c.k)
}

export const djenne = (c: Ctx) => {
  const torre = (x: number, h: number) =>
    poly([x - 10, -42, x - 7, -h, x + 7, -h, x + 10, -42], c.k) +
    poly([x - 7, -h, x, -h - 12, x + 7, -h], c.k2) +
    [0, 1, 2].map((i) => line(x - 9, -48 - i * 15, x - 16, -48 - i * 15, c.kd, 2.6) + line(x + 9, -48 - i * 15, x + 16, -48 - i * 15, c.kd, 2.6)).join('')
  return rect(-52, -42, 104, 42, c.k) + torre(-32, 92) + torre(0, 104) + torre(32, 92) + path('M-9 0L-9 -22Q0 -34 9 -22L9 0Z', c.kd) + rect(-46, -48, 8, 6, c.k2) + rect(38, -48, 8, 6, c.k2)
}

export const foresta = (c: Ctx) => {
  const v1 = mix(c.c, -0.15)
  const v2 = c.c
  const albero = (x: number, s: number) => `<g transform="translate(${x} 0) scale(${s})">${rect(-5, -70, 10, 70, c.kd)}${circ(0, -82, 26, v1)}${circ(-22, -70, 18, v2)}${circ(22, -72, 20, v2)}${circ(2, -94, 14, mix(v1, 0.15))}</g>`
  return albero(-70, 0.8) + albero(64, 0.9) + albero(0, 1.15) + ell(30, -112, 7, 4, c.k) + poly([24, -112, 12, -106, 14, -114], c.k) + circ(35, -113, 1.4, c.l) + line(-30, -70, -30, -34, v2, 2) + line(-26, -66, -26, -40, v2, 2)
}

export const atollo = (c: Ctx) => {
  const v = c.h % 3
  const palme = [
    palma(-30, 64, -10, c.c) + palma(2, 82, 8, c.c) + palma(34, 56, 12, c.c),
    palma(-24, 74, -12, c.c) + palma(14, 58, 10, c.c),
    palma(-40, 56, -8, c.c) + palma(-6, 84, 6, c.c) + palma(26, 66, 14, c.c) + palma(48, 46, 8, c.c),
  ][v]
  const barca = v === 1 ? `${path('M52 -2Q68 6 88 -2Z', c.kd)}${line(70, -2, 70, -24, c.kd, 1.8)}${poly([70, -24, 82, -6, 70, -6], c.k)}` : `${path('M-104 -2Q-90 6 -70 -2Z', c.kd)}${line(-88, -2, -88, -22, c.kd, 1.8)}${poly([-88, -22, -76, -6, -88, -6], c.k)}`
  return ell(0, -2, 78, 9, SABBIA) + palme + barca
}

export const bungalow = (c: Ctx) => {
  const casa = (x: number) => rect(x - 12, -26, 24, 16, c.k2) + poly([x - 17, -26, x, -46, x + 17, -26], c.kd) + rect(x - 3, -22, 6, 12, c.l, 1.5) + [x - 9, x + 7].map((px) => rect(px, -10, 2, 10, LEGNO)).join('')
  return rect(-76, -10, 156, 4, LEGNO) + casa(-54) + casa(-16) + casa(22) + casa(60) + palma(-92, 56, -6, c.c)
}

export const maya = (c: Ctx) => {
  let s = ''
  for (let i = 0; i < 5; i++) s += rect(-62 + i * 10, -(i + 1) * 15, 124 - i * 20, 15, i % 2 ? c.k2 : c.k)
  const cactus = rect(78, -34, 8, 34, mix(c.c, -0.2), 4) + rect(70, -24, 8, 5, mix(c.c, -0.2), 2) + rect(70, -24, 5, 14, mix(c.c, -0.2), 2) + rect(86, -28, 8, 5, mix(c.c, -0.2), 2) + rect(91, -28, 5, 14, mix(c.c, -0.2), 2)
  return s + poly([-9, 0, -5, -75, 5, -75, 9, 0], c.kd) + rect(-15, -96, 30, 21, c.k) + rect(-10, -108, 20, 12, c.k2) + rect(-4, -90, 8, 15, c.kd, 2) + (c.h % 2 ? cactus : '')
}

export const patagonia = (c: Ctx) =>
  path('M-104 0L-76 -50L-66 -38L-48 -100L-40 -78L-30 -118L-18 -82L-8 -90L8 -58L20 -68L46 -28L64 -38L104 0Z', mix(c.a, -0.25)) +
  poly([-30, -118, -24, -100, -30, -96, -36, -102], '#FFFFFF') +
  poly([-48, -100, -44, -88, -50, -86], '#FFFFFF') +
  ell(0, -3, 78, 9, '#78B8E8') +
  pino(-70, 24, mix(c.c, -0.2)) +
  pino(74, 20, mix(c.c, -0.2))

export const tepui = (c: Ctx) =>
  path('M-64 0L-66 -96L-44 -104L30 -102L54 -98L62 0Z', mix(c.k, -0.3)) +
  path('M30 -102L54 -98L62 0L34 0Z', mix(c.k, -0.45)) +
  rect(-66, -106, 126, 9, c.c, 4) +
  rect(-15, -100, 6, 100, '#FFFFFF').replace('<rect', '<rect fill-opacity=".92"') +
  ell(-12, -4, 24, 9, '#FFFFFF').replace('fill="#FFFFFF"', 'fill="#FFFFFF" fill-opacity=".7"')

export const ovili = (c: Ctx) => {
  const pecora = (x: number, y: number) => ell(x, y, 9.5, 6.5, '#FFFFFF') + circ(x + 9, y - 1.5, 3.6, c.kd) + rect(x - 5, y + 3, 2, 5, c.kd) + rect(x + 3, y + 3, 2, 5, c.kd)
  return poly([-92, 0, -22, -66, 0, -90, 22, -66, 92, 0], mix(c.a, -0.2)) + poly([0, -90, 22, -66, 10, -70, 2, -62, -8, -72, -22, -66], '#FFFFFF') + pecora(-46, -6) + pecora(28, 0) + pecora(66, -10)
}

export const capanna = (c: Ctx) => {
  const h = (x: number, s: number) => `<g transform="translate(${x} 0) scale(${s})">${rect(-26, -28, 52, 28, c.k2)}${path('M-36 -26L0 -74L36 -26Z', c.kd)}${rect(-7, -20, 14, 20, c.kd, 2)}</g>`
  return h(-14, 1) + h(66, 0.62) + line(-96, 0, -96, -16, LEGNO, 2.5) + line(-84, 0, -84, -16, LEGNO, 2.5) + line(-100, -12, -80, -12, LEGNO, 2)
}

export const iceberg = (c: Ctx) =>
  poly([-64, 0, -46, -48, -28, -32, -8, -76, 16, -36, 36, -56, 60, 0], '#FFFFFF') +
  poly([-8, -76, 16, -36, 36, -56, 60, 0, 12, 0, 6, -40], '#D3E8F9') +
  [-96, -80, -64].map((x, i) => rect(x - 30 + 30, -22 - (i % 2) * 4, 13, 22 + (i % 2) * 4, [c.k, '#FFC857', c.k2][i]) + poly([x, -22 - (i % 2) * 4, x + 6.5, -32 - (i % 2) * 4, x + 13, -22 - (i % 2) * 4], c.kd)).join('')

export const pinguini = (c: Ctx) => {
  const notte = '#14213D'
  const p = (x: number, s: number) => `<g transform="translate(${x} 0) scale(${s})">${ell(0, -24, 11, 23, notte)}${ell(2, -21, 6.5, 15, '#FFFFFF')}${circ(0, -48, 7.5, notte)}${poly([4, -49, 12, -46, 4, -45], '#FF9B52')}${circ(2, -50, 1.4, '#FFFFFF')}${rect(-8, -34, 4, 4, c.k)}${ell(-5, 0, 6, 2.6, '#FF9B52')}${ell(5, 0, 6, 2.6, '#FF9B52')}</g>`
  return poly([-100, 0, -80, -34, -58, -22, -36, -60, -10, -26, 12, -44, 36, 0], '#FFFFFF') + poly([-36, -60, -10, -26, 12, -44, 36, 0, -20, 0], '#D3E8F9') + ell(0, -2, 98, 9, '#FFFFFF') + p(-30, 1) + p(14, 1.18) + p(54, 0.82)
}

export const tartaruga = (c: Ctx) =>
  [-28, -14, 20, 34].map((x) => rect(x - 6, -14, 12, 14, LEGNO, 4)).join('') +
  path('M-48 -12C-48 -62 48 -62 48 -12Z', c.k) +
  `<path d="M-24 -48L-6 -52L12 -48L22 -34M-6 -52L-8 -30M-30 -26L-8 -30L16 -26M-8 -30L-6 -14" stroke="${c.kd}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
  path('M44 -26Q60 -30 66 -42', 'none', ` stroke="${LEGNO}" stroke-width="10" stroke-linecap="round"`) +
  ell(68, -44, 11, 8, LEGNO) +
  circ(72, -46, 1.8, c.kd)

export const razzo = (c: Ctx) =>
  rect(30, -112, 9, 112, c.kd) +
  [0, 1, 2, 3, 4].map((i) => line(30, -108 + i * 22, 39, -86 + i * 22, c.k2, 1.8)).join('') +
  rect(14, -92, 17, 3, c.kd) +
  rect(-18, -64, 8, 64, c.k2) +
  rect(10, -64, 8, 64, c.k2) +
  poly([-18, -64, -14, -78, -10, -64], c.kd) +
  poly([10, -64, 14, -78, 18, -64], c.kd) +
  rect(-9, -112, 18, 112, c.l) +
  rect(-9, -70, 18, 8, c.k) +
  rect(-9, -30, 18, 8, c.k) +
  poly([-9, -112, 0, -138, 9, -112], c.k) +
  [-24, 0, 24].map((x, i) => circ(x, -4 - (i % 2) * 2, 12 - (i % 2) * 3, '#FFFFFF', 0.9)).join('')

export const cascata = (c: Ctx) => {
  const roccia = mix(c.c, -0.3)
  return (
    `<path d="M-74 0A74 74 0 0 1 74 0" stroke="#F04C55" stroke-opacity=".65" stroke-width="3" fill="none"/><path d="M-68 0A68 68 0 0 1 68 0" stroke="#FFC857" stroke-opacity=".65" stroke-width="3" fill="none"/><path d="M-62 0A62 62 0 0 1 62 0" stroke="#3F8FE0" stroke-opacity=".65" stroke-width="3" fill="none"/>` +
    rect(-30, -54, 60, 54, mix(roccia, -0.15)) +
    path('M-100 0L-100 -60Q-98 -66 -90 -66L-30 -66L-30 0Z', roccia) +
    path('M30 0L30 -66L90 -66Q98 -66 100 -60L100 0Z', roccia) +
    [-22, -4, 14].map((x, i) => rect(x, -62, 10 - (i % 2) * 2, 62, '#FFFFFF')).join('') +
    rect(-100, -72, 70, 8, c.c, 4) +
    rect(30, -72, 70, 8, c.c, 4) +
    [-18, 4, 22].map((x, i) => circ(x, -2, 14 + (i % 2) * 5, '#FFFFFF', 0.9)).join('')
  )
}

export const barca = (c: Ctx) =>
  path('M-60 -10Q0 6 60 -10L52 -24L-50 -24Z', c.k) +
  rect(-50, -28, 100, 4, c.kd) +
  line(2, -24, 2, -94, c.kd, 2.5) +
  poly([0, -92, 0, -30, 62, -30], c.l) +
  poly([-2, -78, -2, -30, -44, -30], c.k2)

export const granito = (c: Ctx) => {
  const g = '#D7D2CA'
  return ell(-32, -26, 42, 28, g) + ell(30, -20, 34, 22, mix(g, -0.12)) + ell(-4, -50, 28, 20, mix(g, 0.15)) + ell(-46, -34, 12, 8, '#FFFFFF').replace('fill="#FFFFFF"', 'fill="#FFFFFF" fill-opacity=".4"') + palma(60, 72, -14, c.c) + palma(78, 52, 10, mix(c.c, 0.1))
}

export const duneRosse = (c: Ctx) =>
  path('M-112 0Q-32 -84 18 -90Q62 -92 112 0Z', c.k) +
  path('M18 -90Q62 -92 112 0L38 0Q54 -44 18 -90Z', c.kd) +
  `<g stroke="#333333" stroke-width="3" stroke-linecap="round" fill="none"><path d="M-70 0L-72 -36M-72 -24L-84 -38M-71 -32L-60 -48M-72 -36L-72 -52"/></g>`

export const auto = (c: Ctx) =>
  path('M-54 -14L-54 -26Q-42 -30 -30 -30L-16 -46L24 -46L36 -30Q50 -28 54 -22L54 -14Z', c.k) +
  path('M-14 -42L-24 -30L-2 -30L-2 -42Z', c.l) +
  path('M2 -42L2 -30L28 -30L20 -42Z', c.l) +
  rect(-54, -20, 108, 3, c.kd) +
  [-32, 34].map((x) => circ(x, -11, 12, '#333333') + circ(x, -11, 5, c.l)).join('') +
  palma(84, 66, 10, c.c) +
  palma(-86, 50, -8, c.c)

export const nave = (c: Ctx) => {
  const col = [c.k, '#FFC857', c.k2, mix(c.a, -0.1), c.kd]
  let s = ''
  for (let i = 0; i < 9; i++) s += rect(-84 + i * 14, -30, 13, 13, col[i % 5])
  for (let i = 0; i < 6; i++) s += rect(-70 + i * 14, -43, 13, 13, col[(i + 2) % 5])
  return path('M-96 -14L96 -14L82 2L-82 2Z', c.kd) + s + rect(58, -52, 26, 38, c.l) + rect(62, -46, 18, 5, c.kd) + rect(62, -37, 18, 5, c.kd) + rect(68, -62, 8, 10, c.k)
}

export const chiesa = (c: Ctx) =>
  rect(-44, -30, 88, 30, c.k2) +
  rect(-14, -78, 28, 50, c.k) +
  rect(-6, -70, 12, 16, c.kd, 6) +
  poly([-19, -78, 0, -98, 19, -78], c.kd) +
  line(0, -98, 0, -110, c.kd, 2.4) +
  line(-4, -104, 4, -104, c.kd, 2.4) +
  path('M-6 0L-6 -14Q0 -22 6 -14L6 0Z', c.kd) +
  rect(-36, -22, 8, 12, c.l, 4) +
  rect(28, -22, 8, 12, c.l, 4)

export const salar = (c: Ctx) => {
  const fenicottero = (x: number, flip: number) =>
    `<g transform="translate(${x} 0) scale(${flip} 1)">${line(-2, -30, -2, 0, '#F683B3', 1.8)}${line(4, -30, 5, 0, '#F683B3', 1.8)}${ell(0, -38, 12, 8, '#F683B3')}<path d="M9 -42Q22 -52 15 -68" stroke="#F683B3" stroke-width="4" fill="none" stroke-linecap="round"/>${circ(15, -69, 4.2, '#F683B3')}${poly([18, -70, 25, -67, 18, -66], c.kd)}</g>`
  return poly([-104, 0, -60, -56, -36, -34, -8, -70, 24, -34, 54, -60, 104, 0], mix(c.a, -0.2)) + fenicottero(-20, 1) + fenicottero(26, -1) + ell(0, -3, 90, 8, '#FFFFFF').replace('fill="#FFFFFF"', 'fill="#FFFFFF" fill-opacity=".6"')
}

export const elefante = (c: Ctx) => {
  const g = '#A9B9CA'
  const gd = mix(g, -0.2)
  return (
    [-30, -18, 14, 26].map((x, i) => rect(x - 5, -24, 10, 24, i % 2 ? gd : g)).join('') +
    ell(0, -42, 38, 24, g) +
    circ(40, -46, 17, g) +
    ell(26, -44, 11, 16, gd) +
    path('M52 -42Q64 -28 56 -8', 'none', ` stroke="${g}" stroke-width="9" stroke-linecap="round"`) +
    path('M50 -36Q62 -36 66 -28', 'none', ` stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"`) +
    circ(45, -51, 2, '#333333') +
    line(-38, -52, -46, -34, gd, 3) +
    rect(-88, -44, 4, 44, c.kd) +
    ell(-86, -48, 20, 6.5, mix(c.c, -0.15))
  )
}

export const moai = (c: Ctx) => {
  const m = (x: number, h: number, f: string) =>
    path(`M${x - 10} 0L${x - 11} ${-h * 0.72}Q${x - 11} ${-h} ${x} ${-h}Q${x + 11} ${-h} ${x + 11} ${-h * 0.72}L${x + 10} 0Z`, f) +
    rect(x - 12, -h * 0.74, 24, 4, mix(f, -0.3)) +
    rect(x - 2.5, -h * 0.72, 5, h * 0.3, mix(f, -0.2)) +
    rect(x - 6, -h * 0.34, 12, 2.4, mix(f, -0.35))
  return m(-42, 62, c.k2) + m(0, 86, c.k) + m(42, 70, c.k2) + rect(-8, -94, 16, 9, '#F04C55')
}

export const machu = (c: Ctx) => {
  let s = path('M-34 -30L12 -122L56 -30Z', mix(c.a, -0.22)) + poly([12, -122, 24, -96, 12, -100, 2, -92], mix(c.a, -0.05))
  for (let i = 0; i < 5; i++) s += poly([-76 + i * 7, -i * 13, 76 - i * 7, -i * 13, 69 - i * 7, -(i + 1) * 13, -69 + i * 7, -(i + 1) * 13], i % 2 ? mix(c.c, 0.12) : mix(c.c, -0.08))
  const lama = ell(66, -8, 10, 6, c.l) + rect(72, -22, 4, 14, c.l, 2) + ell(76, -24, 5, 3.4, c.l) + [-4, 2].map((dx) => rect(66 + dx - 1, -4, 2, 8, c.l)).join('')
  return s + rect(-14, -54, 12, 10, c.l) + rect(2, -54, 12, 10, c.l) + poly([-16, -54, -8, -62, 0, -54], c.kd) + lama
}
