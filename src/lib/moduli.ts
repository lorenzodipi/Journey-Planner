// Logica dei fogli (docs/linee-guida/03-modali-e-moduli.md): durate del percorso, notti, «Per chi» a riquadri,
// conseguenza di «Il costo è» e conteggio dei campi di «Altri dettagli».
import { formatMoney } from './money'

/** «45 min», «3 h», «3 h 29 min», «26 h 5 min». Vuoto se la durata non ha senso (zero, negativa, non un numero). */
export function durataTesto(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return ''
  const m = Math.round(min)
  if (m <= 0) return ''
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

/** Notti tra due date «aaaa-mm-gg»: «1 notte», «5 notti»; vuoto se mancano o non sono in ordine. */
export function nottiTesto(checkIn: string, checkOut: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return ''
  const n = Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000)
  if (!Number.isFinite(n) || n <= 0) return ''
  return n === 1 ? '1 notte' : `${n} notti`
}

/** Scelta di «Per chi»: tutti, solo io, solo un'altra persona (viaggi a due) o persone scelte (da tre in su). */
export type ModoPerChi = 'all' | 'me' | `solo:${string}` | 'pick'

/** Il riquadro acceso per una selezione. `scegli` = l'utente ha aperto «Scegli» (resta aperto anche se poi sceglie tutti). */
export function modoPerChi(sel: readonly string[], all: readonly string[], meId: string | null | undefined, scegli: boolean): ModoPerChi {
  if (scegli && all.length >= 3) return 'pick'
  const tutti = all.length > 0 && all.every((id) => sel.includes(id))
  if (tutti || sel.length === 0) return 'all'
  if (sel.length === 1 && meId && sel[0] === meId) return 'me'
  if (sel.length === 1 && all.length === 2) return `solo:${sel[0]}`
  return 'pick'
}

/** Le persone di un riquadro (per «pick» resta la selezione attuale, mai vuota). */
export function selezionePerModo(modo: ModoPerChi, sel: readonly string[], all: readonly string[], meId: string | null | undefined): string[] {
  if (modo === 'all') return [...all]
  if (modo === 'me') return meId ? [meId] : [...all]
  if (modo.startsWith('solo:')) return [modo.slice(5)]
  return sel.length > 0 ? all.filter((id) => sel.includes(id)) : [...all]
}

/** Toglie o rimette una persona nella scelta, senza mai lasciarla vuota; l'ordine è quello del viaggio. */
export function alternaPersona(sel: readonly string[], id: string, all: readonly string[]): string[] {
  if (sel.includes(id)) return sel.length <= 1 ? [...sel] : all.filter((x) => x !== id && sel.includes(x))
  return all.filter((x) => x === id || sel.includes(x))
}

/** Sotto i riquadri di «Il costo è»: quanto fa l'altra lettura dello stesso numero. */
export function conseguenzaCosto(amount: number | null, persone: number, currency: string): { perPersona: string; totale: string } {
  if (amount === null || !(amount > 0) || persone < 2) return { perPersona: '', totale: '' }
  return {
    perPersona: `${formatMoney(Math.round(amount * persone * 100) / 100, currency)} in tutto`,
    totale: `${formatMoney(Math.round((amount / persone) * 100) / 100, currency)} a testa`,
  }
}

/** Quanti campi di «Altri dettagli» sono compilati (testi non vuoti, numeri, liste non vuote, `true`). */
export function compilati(valori: readonly unknown[]): number {
  return valori.filter((v) => (typeof v === 'string' ? v.trim() !== '' : Array.isArray(v) ? v.length > 0 : typeof v === 'number' ? Number.isFinite(v) : v === true)).length
}

/** «Tocca di nuovo» per i segmenti facoltativi: la stessa scelta toglie la scelta. */
export const alterna = <T extends string>(attuale: T | '', scelto: T): T | '' => (attuale === scelto ? '' : scelto)
