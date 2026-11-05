// Copertina illustrata di un paese: `copertinaPaese('JP')` dà l'indirizzo di un'immagine SVG pronta per <img src>.
// Le immagini si compongono al momento (niente file per paese) e si ricordano dopo la prima volta.
import { PALETTE, scena, type Motivo } from './base'
import * as M1 from './motivi1'
import * as M2 from './motivi2'
import * as M3 from './motivi3'
import { PAESI } from './paesi'

const MOTIVI: Record<string, Motivo> = { ...M1, ...M2, ...M3 } as unknown as Record<string, Motivo>
const cache = new Map<string, string>()

export const haCopertina = (codice: string | undefined | null): boolean => !!codice && !!PAESI[codice.toUpperCase()]

/** Il disegno SVG della copertina (testo), o `null` se il paese non ha una voce in tabella. */
export function copertinaSvg(codice: string | undefined | null): string | null {
  const code = codice?.toUpperCase() ?? ''
  const v = PAESI[code]
  const motivo = v ? MOTIVI[v.motivo] : undefined
  const palette = v ? PALETTE[v.palette] : undefined
  if (!v || !motivo || !palette) return null
  return scena(motivo, v.terreno, palette, code)
}

/** L'indirizzo `data:` dell'immagine, per `<img src>`; `null` se non c'è. */
export function copertinaPaese(codice: string | undefined | null): string | null {
  const code = codice?.toUpperCase() ?? ''
  const gia = cache.get(code)
  if (gia) return gia
  const svg = copertinaSvg(code)
  if (!svg) return null
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  cache.set(code, uri)
  return uri
}
