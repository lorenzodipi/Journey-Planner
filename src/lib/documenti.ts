// Documenti con visibilità (#52): Tutti · Viaggiatori selezionati · Solo io, un file per più punti dell'app.
import type { DocKind, Documento, Traveler, Visibilita } from '../types'

export const VIS_LABEL: Record<Visibilita, string> = { all: 'Tutti', selected: 'Viaggiatori selezionati', private: 'Solo io' }

/** Tipo di file scelto al caricamento: serve solo a proporre la visibilità (si può cambiare prima di salvare). */
export type TipoCarico = 'conferma' | 'biglietto' | 'personale'
export const TIPO_LABEL: Record<TipoCarico, string> = {
  conferma: 'Conferma o voucher di gruppo',
  biglietto: 'Biglietto nominativo',
  personale: 'Documento personale',
}

/** Proposta (BOOK-014): conferme di gruppo → Tutti; biglietti nominativi → i passeggeri; documenti personali → Solo io. */
export function proponi(tipo: TipoCarico, passeggeri: readonly string[] = []): { visibility: Visibilita; access: string[] } {
  if (tipo === 'conferma') return { visibility: 'all', access: [] }
  if (tipo === 'biglietto') return passeggeri.length > 0 ? { visibility: 'selected', access: [...passeggeri] } : { visibility: 'selected', access: [] }
  return { visibility: 'private', access: [] }
}

/** «Viaggiatori selezionati» vuole almeno una persona. */
export function controllaVisibilita(vis: Visibilita, access: readonly string[]): string {
  return vis === 'selected' && access.length === 0 ? 'Scegli almeno una persona che può vederlo.' : ''
}

const RANGO: Record<Visibilita, number> = { private: 0, selected: 1, all: 2 }

/** La modifica allarga la platea? (BOOK-020: serve un avviso prima). */
export function allarga(prima: Pick<Documento, 'visibility' | 'access'>, dopo: Pick<Documento, 'visibility' | 'access'>): boolean {
  if (RANGO[dopo.visibility] > RANGO[prima.visibility]) return true
  return dopo.visibility === 'selected' && prima.visibility === 'selected' && dopo.access.some((id) => !prima.access.includes(id))
}

export const puoCambiare = (d: Pick<Documento, 'ownerId'>, userId: string | undefined): boolean => !!userId && d.ownerId === userId

/** Chi lo vede, a parole: «Tutti», «Solo tu», «Marta e Giorgio». */
export function chiVede(d: Pick<Documento, 'visibility' | 'access' | 'ownerId'>, travelers: readonly Pick<Traveler, 'id' | 'name' | 'userId'>[], userId: string | undefined): string {
  if (d.visibility === 'all') return 'Tutti'
  if (d.visibility === 'private') return d.ownerId === userId ? 'Solo tu' : 'Solo chi l’ha caricato'
  const nomi = d.access.map((id) => travelers.find((t) => t.id === id)?.name.split(/\s+/)[0]).filter(Boolean) as string[]
  return nomi.length > 0 ? nomi.join(', ') : 'Nessuno'
}

/** Documenti collegati a una voce (alloggio, volo, trasporto, prenotazione…). */
export const perRiferimento = (docs: readonly Documento[] | undefined, kind: DocKind, refId: string): Documento[] =>
  (docs ?? []).filter((d) => d.links.some((l) => l.kind === kind && l.refId === refId))

/** Quelli della sezione Documenti: senza un luogo né una voce a cui appartengono (eSIM, assicurazione, passaporti…). */
export const senzaCollegamenti = (docs: readonly Documento[] | undefined): Documento[] => (docs ?? []).filter((d) => d.links.length === 0)

export function dimensione(bytes: number | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export const anteprimaImmagine = (d: Pick<Documento, 'mime' | 'name'>): boolean => /^image\//.test(d.mime ?? '') || /\.(png|jpe?g|webp|gif|heic)$/i.test(d.name)
