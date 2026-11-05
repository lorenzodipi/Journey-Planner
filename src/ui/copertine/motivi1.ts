// Monumenti, parte 1: Europa e icone mondiali. Ogni motivo ha l'origine alla base, al centro, e cresce verso l'alto.
import { circ, ell, line, path, poly, rect, mix, type Ctx } from './base'

/** Pino a due piani. */
export const pino = (x: number, h: number, f: string) => poly([x - 9, 0, x, -h, x + 9, 0], f) + poly([x - 7, -h * 0.45, x, -h * 1.25, x + 7, -h * 0.45], f)

const finestre = (x: number, y: number, cols: number, rows: number, dx: number, dy: number, w: number, h: number, f: string) => {
  let s = ''
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) s += rect(x + i * dx, y + j * dy, w, h, f, 1.5)
  return s
}

export const torii = (c: Ctx) =>
  rect(-26, -80, 9, 82, c.k) + rect(17, -80, 9, 82, c.k) + path('M-48 -90Q0 -78 48 -90L43 -74Q0 -64 -43 -74Z', c.k) + rect(-33, -64, 66, 8, c.k, 3) + rect(-8, -74, 16, 10, c.k)

export const eiffel = (c: Ctx) =>
  path('M-36 0L-15 -70L-7 -70L-5 -112L0 -134L5 -112L7 -70L15 -70L36 0L24 0L12 -30Q0 -46 -12 -30L-24 0Z', c.k) +
  rect(-17, -73, 34, 5, c.kd) +
  rect(-8, -115, 16, 4, c.kd) +
  rect(-27, -34, 54, 3.5, c.kd)

export const colosseo = (c: Ctx) => {
  let a = ''
  for (let i = 0; i < 9; i++) {
    const x = -58 + i * 13.5
    a += rect(x, -12, 7.5, 11, c.kd, 3.5) + rect(x, -28, 7.5, 11, c.kd, 3.5)
    if (i > 3) a += rect(x, -44, 7.5, 11, c.kd, 3.5)
  }
  return path('M-68 0L-68 -36Q-68 -42 -62 -42L-8 -42L-2 -54Q2 -58 8 -58L62 -58Q68 -58 68 -50L68 0Z', c.k) + a + rect(-68, -2, 136, 3, c.k2)
}

export const bigben = (c: Ctx) =>
  rect(-78, -34, 66, 34, c.kd) +
  finestre(-72, -26, 6, 1, 10, 0, 5, 12, c.l) +
  poly([-78, -34, -70, -48, -62, -34], c.kd) +
  poly([-54, -34, -46, -50, -38, -34], c.kd) +
  poly([-30, -34, -22, -46, -14, -34], c.kd) +
  rect(-14, -98, 28, 98, c.k) +
  rect(-18, -110, 36, 14, c.k2) +
  circ(0, -80, 10, c.l) +
  line(0, -80, 0, -86, c.kd, 1.8) +
  line(0, -80, 4, -78, c.kd, 1.8) +
  finestre(-8, -58, 2, 2, 10, 14, 6, 9, c.kd) +
  poly([-18, -110, 0, -138, 18, -110], c.kd) +
  line(0, -138, 0, -150, c.kd, 2)

export const piramidi = (c: Ctx) =>
  poly([-92, 0, -22, -90, 48, 0], c.k) + poly([-22, -90, 48, 0, 8, 0], c.kd) + poly([24, 0, 74, -54, 124, 0], c.k2) + poly([74, -54, 124, 0, 98, 0], mix(c.k2, -0.15)) + poly([-124, 0, -98, -30, -72, 0], c.k2)

export const taj = (c: Ctx) =>
  rect(-76, -6, 152, 6, c.k2) +
  rect(-32, -58, 64, 52, c.k) +
  path('M-9 -6L-9 -36Q0 -50 9 -36L9 -6Z', c.l) +
  rect(-26, -40, 10, 24, c.kd, 4) +
  rect(16, -40, 10, 24, c.kd, 4) +
  path('M-21 -58C-32 -86 -6 -92 0 -112C6 -92 32 -86 21 -58Z', c.k2) +
  line(0, -112, 0, -124, c.kd, 2) +
  ell(-30, -62, 7, 9, c.k2) +
  ell(30, -62, 7, 9, c.k2) +
  [-66, 58].map((x) => rect(x, -76, 8, 70, c.k2) + rect(x - 2, -82, 12, 6, c.kd) + circ(x + 4, -86, 5, c.k2)).join('')

export const pagoda = (c: Ctx) => {
  let s = ''
  const tiers = 4 + (c.h % 2)
  for (let i = 0; i < tiers; i++) {
    const yb = -i * 22
    const hw = 38 - i * 6
    s += rect(-hw + 8, yb - 16, hw * 2 - 16, 16, c.kd)
    s += path(`M${-hw - 16} ${yb - 12}Q${-hw + 2} ${yb - 14} ${-hw + 10} ${yb - 26}L${hw - 10} ${yb - 26}Q${hw - 2} ${yb - 14} ${hw + 16} ${yb - 12}Q0 ${yb - 6} ${-hw - 16} ${yb - 12}Z`, c.k)
  }
  const top = -tiers * 22 - 4
  return s + line(0, top - 6, 0, top - 24, c.kd, 2.5) + circ(0, top - 26, 3, c.kd)
}

export const opera = (c: Ctx) => {
  const vela = (x: number, w: number, h: number, f: string) => path(`M${x} 0C${x} ${-h * 0.55} ${x + w * 0.35} ${-h} ${x + w} ${-h * 0.92}C${x + w * 0.86} ${-h * 0.45} ${x + w * 0.8} ${-h * 0.15} ${x + w * 0.9} 0Z`, f)
  return (
    rect(-84, -9, 168, 9, c.kd) +
    vela(-70, 52, 56, c.k) +
    vela(-44, 48, 76, c.k2) +
    vela(-18, 44, 92, c.k) +
    vela(26, 40, 44, c.k2) +
    vela(46, 34, 56, c.k)
  )
}

export const statua = (c: Ctx) =>
  rect(-22, -28, 44, 28, c.kd) +
  rect(-15, -42, 30, 14, c.k2) +
  path('M-13 -42L-9 -88L9 -88L13 -42Z', c.k) +
  circ(0, -96, 8.5, c.k) +
  ['-13,-106', '-7,-110', '0,-112', '7,-110', '13,-106'].map((p) => line(0, -98, Number(p.split(',')[0]), Number(p.split(',')[1]), c.k, 2.6)).join('') +
  path('M7 -86L21 -108L23 -128', 'none', ` stroke="${c.k}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"`) +
  path('M18 -128L28 -128L26 -136L20 -136Z', c.kd) +
  path('M23 -136Q18 -148 23 -156Q28 -148 23 -136Z', '#FFC857') +
  rect(-18, -74, 8, 15, c.kd, 1.5)

export const cntower = (c: Ctx) =>
  rect(-92, -26, 28, 26, c.k2) +
  rect(-62, -44, 24, 44, c.k2) +
  rect(36, -34, 30, 34, c.k2) +
  rect(66, -22, 24, 22, c.k2) +
  finestre(-58, -38, 2, 3, 10, 12, 5, 6, c.l) +
  poly([-6, 0, -2.4, -104, 2.4, -104, 6, 0], c.k) +
  ell(0, -86, 16, 6.5, c.kd) +
  rect(-9, -93, 18, 4, c.k) +
  line(0, -104, 0, -142, c.k, 3)

export const redentor = (c: Ctx) =>
  path('M-76 0C-66 -50 -24 -80 0 -80C24 -80 66 -50 76 0Z', mix(c.c, -0.12)) +
  rect(-9, -92, 18, 12, c.l) +
  poly([-7, -92, -4, -122, 4, -122, 7, -92], c.k) +
  rect(-32, -122, 64, 6.5, c.k, 3) +
  circ(0, -130, 5.5, c.k)

export const mulino = (c: Ctx) => {
  const pala = (a: number) => `<g transform="translate(0 -62) rotate(${a})">${rect(-2, -54, 4, 54, c.kd)}${rect(2, -52, 12, 30, c.k2)}</g>`
  const tulipani = Array.from({ length: 11 }, (_, i) => circ(-96 + i * 19, -3 + (i % 2) * 3, 3.6, [c.k, '#FFC857', c.k2][i % 3])).join('')
  return poly([-17, 0, -10, -56, 10, -56, 17, 0], c.k) + rect(-5, -22, 10, 22, c.kd, 2) + path('M-12 -56Q0 -78 12 -56Z', c.kd) + [20, 110, 200, 290].map(pala).join('') + circ(0, -62, 4, c.l) + tulipani
}

export const brandeburgo = (c: Ctx) => {
  let col = ''
  for (let i = 0; i < 6; i++) col += rect(-50 + i * 18, -50, 9, 50, c.k)
  return (
    rect(-84, -34, 24, 34, c.k2) + rect(60, -34, 24, 34, c.k2) + col + rect(-58, -62, 116, 12, c.k) + rect(-52, -72, 104, 10, c.k2) + rect(-16, -80, 32, 8, c.kd) + [-12, -4, 4, 12].map((x) => circ(x, -86, 4, c.kd)).join('') + poly([-5, -90, 0, -108, 5, -90], c.kd)
  )
}

export const partenone = (c: Ctx) => {
  let col = ''
  for (let i = 0; i < 8; i++) col += rect(-58 + i * 16, -56, 7, 44, c.k)
  return rect(-68, -6, 136, 6, c.k2) + rect(-64, -12, 128, 6, c.k2) + col + rect(-66, -64, 132, 8, c.kd) + poly([-66, -64, 0, -92, 66, -64], c.k2) + poly([-44, -68, 0, -86, 44, -68], c.l)
}

export const matterhorn = (c: Ctx) =>
  path('M-96 0L-34 -58L-14 -92L0 -126L12 -102L28 -72L62 -40L96 0Z', mix(c.a, -0.18)) +
  path('M-14 -92L0 -126L12 -102L5 -98L-2 -106L-8 -95Z', '#FFFFFF') +
  rect(24, -22, 32, 22, c.k) +
  poly([20, -22, 40, -42, 60, -22], c.kd) +
  rect(30, -16, 7, 8, c.l, 1.5) +
  rect(42, -16, 7, 16, c.kd, 1.5) +
  pino(-40, 26, mix(c.c, -0.15)) +
  pino(-62, 20, mix(c.c, -0.15)) +
  pino(74, 22, mix(c.c, -0.15))
