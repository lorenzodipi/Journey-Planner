// Monumenti, parte 2: Europa del nord e dell'est, Mediterraneo, Medio Oriente e Asia.
import { circ, ell, line, path, poly, rect, mix, type Ctx } from './base'
import { pino } from './motivi1'

const cipolla = (x: number, y: number, s: number, f: string) => path(`M${x - 8 * s} ${y}C${x - 15 * s} ${y - 12 * s} ${x - 6 * s} ${y - 22 * s} ${x} ${y - 36 * s}C${x + 6 * s} ${y - 22 * s} ${x + 15 * s} ${y - 12 * s} ${x + 8 * s} ${y}Z`, f)

export const sagrada = (c: Ctx) => {
  const torri = [-44, -22, 0, 22, 44].map((x, i) => {
    const h = [66, 92, 124, 92, 66][i]
    return poly([x - 6, 0, x - 5, -h * 0.78, x, -h, x + 5, -h * 0.78, x + 6, 0], i % 2 ? c.k2 : c.k) + circ(x, -h * 0.8, 3.2, c.kd)
  })
  return rect(-56, -26, 112, 26, c.kd) + torri.join('') + line(0, -124, 0, -138, c.k, 2.5) + line(-4, -132, 4, -132, c.k, 2.5)
}

export const arco = (c: Ctx) => {
  let merli = ''
  for (let i = 0; i < 8; i++) merli += rect(-60 + i * 16, -78, 9, 8, c.k)
  return (
    rect(-62, -70, 124, 70, c.k) +
    merli +
    path('M-20 0L-20 -34Q-20 -58 0 -58Q20 -58 20 -34L20 0Z', c.l) +
    path('M-12 0L-12 -32Q-12 -48 0 -48Q12 -48 12 -32L12 0Z', c.kd) +
    rect(70, -104, 18, 104, c.k2) +
    poly([68, -104, 79, -124, 90, -104], c.kd) +
    rect(75, -88, 8, 12, c.kd, 4) +
    rect(75, -66, 8, 12, c.kd, 4)
  )
}

export const cipolle = (c: Ctx) =>
  rect(-9, -90, 18, 90, c.k2) +
  cipolla(0, -90, 1.5, c.k) +
  line(0, -144, 0, -154, c.kd, 2) +
  rect(-48, -48, 16, 48, c.k) +
  cipolla(-40, -48, 1.1, c.kd) +
  rect(32, -48, 16, 48, c.k) +
  cipolla(40, -48, 1.1, c.k2) +
  rect(-72, -30, 14, 30, c.kd) +
  cipolla(-65, -30, 0.8, c.k) +
  rect(58, -30, 14, 30, c.kd) +
  cipolla(65, -30, 0.8, c.k)

export const stavkirke = (c: Ctx) =>
  rect(-30, -26, 60, 26, c.kd) +
  poly([-48, -20, -26, -48, 26, -48, 48, -20], c.k) +
  rect(-18, -64, 36, 18, c.kd) +
  poly([-32, -58, -12, -84, 12, -84, 32, -58], c.k) +
  rect(-7, -100, 14, 18, c.kd) +
  poly([-11, -98, 0, -136, 11, -98], c.k) +
  line(-48, -20, -54, -28, c.kd, 2.5) +
  line(48, -20, 54, -28, c.kd, 2.5) +
  rect(-5, -14, 10, 14, c.l, 5) +
  pino(-76, 38, mix(c.c, -0.2)) +
  pino(76, 30, mix(c.c, -0.2))

export const vulcano = (c: Ctx) =>
  path('M-92 0L-24 -90Q0 -98 24 -90L92 0Z', mix(c.c, -0.3)) +
  path('M-24 -90Q0 -80 24 -90L19 -96Q0 -102 -19 -96Z', c.k) +
  circ(4, -112, 9, '#FFFFFF', 0.92) +
  circ(-4, -128, 11, '#FFFFFF', 0.88) +
  circ(8, -146, 13, '#FFFFFF', 0.82) +
  (c.h % 2 ? poly([-60, -30, -44, -52, -34, -40, -26, -58, -12, -36], '#FFFFFF') : '')

export const baita = (c: Ctx) =>
  rect(-36, -30, 72, 30, c.k) +
  poly([-46, -30, 0, -66, 46, -30], c.kd) +
  rect(-6, -20, 12, 20, c.l, 2) +
  rect(-28, -22, 11, 11, c.l, 2) +
  rect(17, -22, 11, 11, c.l, 2) +
  rect(18, -62, 10, 20, c.k2) +
  circ(26, -72, 5, '#FFFFFF', 0.85) +
  circ(32, -84, 7, '#FFFFFF', 0.7) +
  pino(-66, 44, mix(c.c, -0.2)) +
  pino(-86, 30, mix(c.c, -0.2)) +
  pino(70, 38, mix(c.c, -0.2)) +
  pino(88, 26, mix(c.c, -0.2))

export const guglie = (c: Ctx) =>
  rect(-62, -24, 124, 24, c.k) +
  rect(-14, -70, 28, 46, c.k) +
  poly([-19, -70, 0, -112, 19, -70], c.kd) +
  rect(-54, -48, 22, 28, c.k2) +
  poly([-59, -48, -43, -78, -27, -48], c.kd) +
  rect(32, -56, 22, 32, c.k2) +
  poly([27, -56, 43, -90, 59, -56], c.kd) +
  rect(-6, -52, 12, 14, c.l, 6) +
  rect(-47, -38, 8, 10, c.l, 4) +
  rect(39, -44, 8, 10, c.l, 4) +
  line(0, -112, 0, -124, c.kd, 2) +
  poly([0, -124, 12, -120, 0, -116], c.kd)

export const campanile = (c: Ctx) =>
  rect(-66, -34, 42, 34, c.k2) +
  poly([-66, -34, -45, -58, -24, -34], c.k2) +
  rect(24, -42, 44, 42, c.k2) +
  poly([24, -42, 46, -68, 68, -42], c.k2) +
  rect(-14, -88, 28, 88, c.k) +
  poly([-19, -88, 0, -126, 19, -88], c.kd) +
  circ(0, -70, 8.5, c.l) +
  line(0, -70, 0, -75, c.kd, 1.8) +
  line(0, -70, 3.5, -68, c.kd, 1.8) +
  rect(-6, -54, 12, 16, c.kd, 6) +
  rect(-58, -22, 9, 12, c.l, 2) +
  rect(-40, -22, 9, 12, c.l, 2) +
  rect(32, -30, 9, 12, c.l, 2) +
  rect(50, -30, 9, 12, c.l, 2)

export const moschea = (c: Ctx) => {
  const minareto = (x: number) => rect(x - 4.5, -104, 9, 104, c.k2) + poly([x - 7, -104, x, -126, x + 7, -104], c.kd) + rect(x - 7, -82, 14, 3.5, c.kd) + rect(x - 7, -60, 14, 3.5, c.kd)
  return (
    rect(-46, -30, 92, 30, c.k2) +
    path('M-32 -30C-32 -82 32 -82 32 -30Z', c.k) +
    path('M-46 -30C-46 -54 -32 -54 -32 -30Z', c.k) +
    path('M32 -30C32 -54 46 -54 46 -30Z', c.k) +
    line(0, -72, 0, -88, c.kd, 2.5) +
    circ(0, -92, 4, c.kd) +
    minareto(-66) +
    minareto(66) +
    rect(-26, -22, 8, 14, c.kd, 4) +
    rect(-4, -22, 8, 22, c.kd, 4) +
    rect(18, -22, 8, 14, c.kd, 4)
  )
}

export const grattacielo = (c: Ctx) => {
  const f = (x: number, w: number, h: number, col: string) => rect(x, -h, w, h, col) + [0, 1, 2, 3, 4, 5].map((i) => (h > 20 + i * 12 ? rect(x + w / 2 - 1.5, -h + 8 + i * 12, 3, 5, c.l, 1) : '')).join('')
  return (
    f(-66, 18, 44, c.kd) +
    f(-44, 16, 70, c.k2) +
    f(28, 16, 86, c.k2) +
    f(48, 18, 54, c.kd) +
    f(70, 16, 36, c.k2) +
    path('M-7 0L-5 -56L-3.5 -92L-1.6 -132L0 -162L1.6 -132L3.5 -92L5 -56L7 0Z', c.k) +
    rect(-10, -40, 20, 3, c.kd) +
    rect(-8, -80, 16, 3, c.kd)
  )
}

export const petronas = (c: Ctx) => {
  const t = (x: number) => {
    let r = ''
    for (let i = 0; i < 6; i++) r += rect(x - 10, -14 - i * 14, 20, 2.5, c.kd)
    return poly([x - 13, 0, x - 10, -100, x + 10, -100, x + 13, 0], c.k) + r + poly([x - 10, -100, x, -122, x + 10, -100], c.k2) + line(x, -122, x, -138, c.kd, 2.5)
  }
  return t(-22) + t(22) + rect(-12, -66, 24, 7, c.kd)
}

export const marinabay = (c: Ctx) => {
  const torre = (x: number) => poly([x - 8, 0, x - 3, -80, x + 9, -80, x + 14, 0], c.k)
  const superalbero = (x: number, h: number) => rect(x - 1.5, -h, 3, h, c.kd) + ell(x, -h - 2, 13, 5.5, c.k2)
  return torre(-50) + torre(-14) + torre(22) + path('M-80 -80L66 -80L58 -90L-72 -90Z', c.k2) + rect(-60, -94, 100, 4, c.kd) + superalbero(84, 44) + superalbero(104, 30) + superalbero(-84, 28)
}

export const faro = (c: Ctx) => {
  const w = (y: number) => 12 - (4 * -y) / 80
  const banda = (y1: number, y2: number, f: string) => poly([-w(y1), y1, w(y1), y1, w(y2), y2, -w(y2), y2], f)
  return (
    banda(0, -80, c.l) +
    banda(0, -16, c.k) +
    banda(-32, -48, c.k) +
    banda(-64, -80, c.k) +
    rect(-10, -92, 20, 12, c.kd) +
    rect(-6, -90, 12, 8, '#FFC857') +
    poly([-12, -92, 0, -108, 12, -92], c.kd) +
    path('M12 -86L58 -98L58 -74Z', '#FFC857', ' fill-opacity=".45"') +
    path('M-12 -86L-58 -98L-58 -74Z', '#FFC857', ' fill-opacity=".45"')
  )
}

export const forte = (c: Ctx) => {
  let merli = ''
  for (let i = 0; i < 9; i++) merli += rect(-70 + i * 16, -38, 9, 8, c.k)
  const torre = (x: number) => rect(x, -58, 24, 58, c.k2) + [0, 1, 2].map((i) => rect(x + i * 9, -66, 6, 8, c.k2)).join('') + rect(x + 9, -44, 6, 10, c.kd, 3)
  return rect(-70, -30, 140, 30, c.k) + merli + torre(-92) + torre(68) + path('M-12 0L-12 -18Q-12 -30 0 -30Q12 -30 12 -18L12 0Z', c.kd) + line(-80, -66, -80, -88, c.kd, 2) + poly([-80, -88, -66, -83, -80, -78], c.kd)
}

export const colonne = (c: Ctx) => {
  const alt = [72, 72, 46, 72, 30]
  return (
    rect(-76, -6, 152, 6, c.k2) +
    [-60, -30, 0, 30, 60].map((x, i) => rect(x - 6, -6 - alt[i], 12, alt[i], c.k) + (alt[i] > 60 ? rect(x - 10, -10 - alt[i], 20, 5, c.kd) : '')).join('') +
    rect(-66, -86, 72, 7, c.kd) +
    circ(-96, -8, 7, c.k2)
  )
}

export const cupola = (c: Ctx) =>
  poly([-46, 0, -40, -36, 40, -36, 46, 0], c.k2) +
  [-30, -10, 10, 30].map((x) => rect(x - 4, -28, 8, 20, c.kd, 3)).join('') +
  rect(-40, -40, 80, 5, c.kd) +
  path('M-28 -40C-28 -90 28 -90 28 -40Z', '#FFC857') +
  path('M-28 -40C-28 -66 -10 -78 -3 -88C-14 -76 -20 -56 -20 -40Z', '#FFFFFF', ' fill-opacity=".35"') +
  line(0, -86, 0, -100, '#FFC857', 2.5)

export const basilica = (c: Ctx) =>
  rect(-76, -26, 152, 26, c.k2) +
  [-70, -54, -38, -22].map((x) => rect(x, -22, 6, 22, c.kd)).concat([16, 32, 48, 64].map((x) => rect(x, -22, 6, 22, c.kd))).join('') +
  rect(-34, -48, 68, 22, c.k) +
  rect(-22, -66, 44, 18, c.k2) +
  [-16, -4, 8].map((x) => rect(x, -62, 8, 12, c.kd, 3)).join('') +
  path('M-22 -66C-22 -108 22 -108 22 -66Z', c.k) +
  line(0, -104, 0, -118, c.kd, 2.5) +
  line(-4, -112, 4, -112, c.kd, 2.5)

export const case_ = (c: Ctx) => {
  const col = [c.k, '#FFC857', c.k2, c.kd, mix(c.a, -0.1), c.k]
  const alt = [52, 64, 48, 60, 44, 56]
  const gable = (i: number) => (i % 2 ? poly([-72 + i * 24, -alt[i], -60 + i * 24, -alt[i] - 14, -48 + i * 24, -alt[i]], col[i]) : '')
  return col.map((f, i) => rect(-72 + i * 24, -alt[i], 24, alt[i], f) + gable(i) + rect(-65 + i * 24, -alt[i] + 8, 7, 9, c.l, 1.5) + rect(-65 + i * 24, -alt[i] + 26, 7, 9, c.l, 1.5)).join('')
}

export const ponte = (c: Ctx) =>
  path('M-78 -26Q0 -72 78 -26L78 0L52 0Q0 -48 -52 0L-78 0Z', c.k) +
  path('M-78 -26Q0 -72 78 -26L78 -32Q0 -78 -78 -32Z', c.k2) +
  rect(-92, -58, 16, 58, c.kd) +
  poly([-96, -58, -84, -78, -72, -58], c.k2) +
  rect(76, -58, 16, 58, c.kd) +
  poly([72, -58, 84, -78, 96, -58], c.k2) +
  rect(-88, -42, 8, 10, c.l, 3) +
  rect(80, -42, 8, 10, c.l, 3)

export const cedro = (c: Ctx) => {
  const v = mix(c.c, -0.2)
  return (
    poly([-96, 0, -44, -58, -14, -26, 24, -78, 60, -34, 96, 0], c.a) +
    poly([24, -78, 12, -58, 22, -60, 30, -52, 38, -62, 44, -54], '#FFFFFF') +
    rect(-5, -52, 10, 52, c.kd) +
    ell(0, -60, 46, 9, v) +
    ell(0, -76, 36, 8.5, v) +
    ell(0, -91, 26, 7.5, v) +
    ell(0, -104, 15, 6, v)
  )
}

export const petra = (c: Ctx) =>
  path('M-90 0L-90 -96Q-46 -118 0 -108Q46 -118 90 -96L90 0Z', c.k) +
  rect(-34, -64, 68, 64, c.k2) +
  [-26, -14, -2, 10, 22].map((x) => rect(x, -52, 6, 52, c.kd)).join('') +
  poly([-38, -64, 0, -82, 38, -64], c.kd) +
  path('M-12 -72L-12 -92Q-12 -102 0 -102Q12 -102 12 -92L12 -72Z', c.k2) +
  rect(-8, -92, 16, 20, c.kd, 8) +
  path('M-12 0L-12 -20Q-12 -30 0 -30Q12 -30 12 -20L12 0Z', c.kd)

export const fiamme = (c: Ctx) => {
  const f = (x: number, h: number, w: number, col: string) => path(`M${x - w} 0C${x - w * 1.2} ${-h * 0.4} ${x - w * 0.4} ${-h * 0.6} ${x + 2} ${-h}C${x + w * 0.9} ${-h * 0.7} ${x + w * 1.4} ${-h * 0.4} ${x + w} 0Z`, col)
  return f(-34, 92, 16, c.k2) + f(2, 126, 20, c.k) + f(38, 100, 17, c.kd) + path('M0 -6C-4 -40 4 -70 8 -104C14 -70 16 -40 8 -6Z', '#FFFFFF', ' fill-opacity=".3"')
}

export const spirale = (c: Ctx) =>
  rect(-30, -30, 60, 30, c.k) +
  rect(-23, -56, 46, 26, c.k2) +
  rect(-17, -78, 34, 22, c.k) +
  rect(-12, -96, 24, 18, c.k2) +
  poly([-9, -96, 0, -120, 9, -96], c.kd) +
  line(-30, -6, 22, -26, c.kd, 3) +
  line(23, -34, -16, -50, c.kd, 3) +
  line(-17, -62, 14, -74, c.kd, 3) +
  line(12, -82, -8, -92, c.kd, 3) +
  rect(-70, -22, 28, 22, c.kd) +
  rect(44, -18, 30, 18, c.kd)

export const registan = (c: Ctx) => {
  const turchese = '#3BBB9C'
  const minareto = (x: number) => rect(x - 5, -96, 10, 96, c.k2) + ell(x, -98, 7, 6, turchese)
  return (
    rect(-88, -58, 42, 58, c.k2) +
    rect(46, -58, 42, 58, c.k2) +
    path('M-78 0L-78 -34Q-78 -48 -67 -48Q-56 -48 -56 -34L-56 0Z', c.kd) +
    path('M56 0L56 -34Q56 -48 67 -48Q78 -48 78 -34L78 0Z', c.kd) +
    ell(-67, -62, 18, 16, turchese) +
    ell(67, -62, 18, 16, turchese) +
    rect(-28, -84, 56, 84, c.k) +
    path('M-15 0L-15 -48Q0 -72 15 -48L15 0Z', c.l) +
    path('M-9 0L-9 -44Q0 -58 9 -44L9 0Z', c.kd) +
    minareto(-100) +
    minareto(100)
  )
}

export const gibilterra = () => path('M-96 0L-84 -30L-52 -62L-12 -90Q10 -98 22 -86L44 -58L66 -22L96 0Z', '#D7D2CA') + poly([22, -86, 44, -58, 66, -22, 96, 0, 30, 0, 36, -46], mix('#D7D2CA', -0.2))

export const facciata = (c: Ctx) =>
  rect(-62, -8, 124, 8, c.k2) +
  rect(-54, -16, 108, 8, c.k2) +
  rect(-44, -86, 88, 70, c.k) +
  poly([-44, -86, 0, -112, 44, -86], c.kd) +
  [-30, -10, 10, 30].map((x) => rect(x - 3.5, -78, 7, 52, c.k2)).join('') +
  path('M-8 -16L-8 -40Q0 -52 8 -40L8 -16Z', c.l) +
  rect(-36, -52, 9, 14, c.l, 4) +
  rect(27, -52, 9, 14, c.l, 4) +
  circ(0, -92, 6, c.l)

export const taipei = (c: Ctx) => {
  let s = rect(-26, -14, 52, 14, c.kd)
  for (let i = 0; i < 8; i++) {
    const y = -14 - i * 13
    s += poly([-12, y, -16, y - 13, 16, y - 13, 12, y], i % 2 ? c.k : c.k2) + rect(-11, y - 4, 22, 2, c.kd)
  }
  return s + poly([-12, -118, 0, -138, 12, -118], c.k) + line(0, -138, 0, -156, c.kd, 2.5)
}

export const palazzo = (c: Ctx) =>
  rect(-76, -8, 152, 8, c.k2) +
  rect(-66, -14, 132, 6, c.k2) +
  rect(-48, -44, 96, 30, c.kd) +
  [-36, -22, -8, 6, 20, 34].map((x) => rect(x, -42, 5, 28, c.l)).join('') +
  path('M-72 -38Q-54 -40 -46 -52L46 -52Q54 -40 72 -38Q0 -24 -72 -38Z', c.k) +
  rect(-30, -76, 60, 24, c.kd) +
  [-18, -4, 10].map((x) => rect(x, -72, 8, 16, c.l, 2)).join('') +
  path('M-48 -72Q-36 -74 -28 -88L28 -88Q36 -74 48 -72Q0 -60 -48 -72Z', c.k)

export const yurta = (c: Ctx) => {
  const y = (x: number, s: number) => rect(x - 36 * s, -34 * s, 72 * s, 34 * s, c.l) + path(`M${x - 41 * s} ${-33 * s}Q${x} ${-80 * s} ${x + 41 * s} ${-33 * s}Z`, c.k) + rect(x - 8 * s, -26 * s, 16 * s, 26 * s, c.kd, 2) + rect(x - 36 * s, -36 * s, 72 * s, 3 * s, c.kd)
  return y(-18, 1) + y(66, 0.62)
}

export const muraglia = (c: Ctx) => {
  const d = 'M-110 0L-74 -22L-40 -14L-6 -48L28 -40L62 -76L104 -96'
  return (
    `<path d="${d}" stroke="${c.k}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<path d="M-110 -9L-74 -31L-40 -23L-6 -57L28 -49L62 -85L104 -105" stroke="${c.kd}" stroke-width="4" stroke-dasharray="5 7" fill="none"/>` +
    rect(-16, -66, 24, 24, c.k2) +
    poly([-20, -66, -4, -82, 12, -66], c.kd) +
    rect(52, -100, 24, 24, c.k2) +
    poly([48, -100, 64, -116, 80, -100], c.kd) +
    rect(-86, -40, 20, 20, c.k2) +
    poly([-90, -40, -76, -54, -62, -40], c.kd)
  )
}
