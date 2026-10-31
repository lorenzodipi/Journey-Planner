import type { Trip } from '../types'
import { client } from './db'
import { isDocOffline } from './documentiOffline'

// File delle prenotazioni (biglietti, conferme) nel bucket privato "bookings" di Supabase Storage.
// Percorso: <id viaggio>/<id casuale>-<nome>. L'accesso passa dalle policy dello Storage (membri del viaggio).
// I file marcati "offline" si copiano nella Cache del browser, per aprirli anche senza rete.

const BUCKET = 'bookings'
const CACHE = 'booking-files'
export const MAX_FILE_BYTES = 10 * 1024 * 1024

/** Nome file senza caratteri problematici, al massimo 60 caratteri. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  const stem = (dot > 0 ? name.slice(0, dot) : name).normalize('NFKD').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : ''
  const clean = (stem || 'file').slice(0, 50)
  return ext ? `${clean}.${ext}` : clean
}

export function checkFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) return 'Il file supera 10 MB: usa un PDF o un\'immagine più leggeri.'
  if (!/^(application\/pdf|image\/)/.test(file.type)) return 'Sono ammessi solo PDF e immagini.'
  return null
}

/** `folder`: sottocartella dentro il viaggio (es. `spese/<id spesa>` per le ricevute); la prima parte resta sempre l'id del viaggio. */
export async function uploadBookingFile(tripId: string, file: File, folder = ''): Promise<string> {
  const path = `${tripId}/${folder ? `${folder}/` : ''}${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error } = await client().storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

export async function removeBookingFile(path: string): Promise<void> {
  await uncacheBookingFile(path)
  const { error } = await client().storage.from(BUCKET).remove([path])
  if (error) throw error
}

async function signedUrl(path: string): Promise<string> {
  const { data, error } = await client().storage.from(BUCKET).createSignedUrl(path, 120)
  if (error || !data) throw error ?? new Error('Non riesco a ottenere il file.')
  return data.signedUrl
}

// Dove stanno le copie offline: nel browser la Cache API; nell'app Android/iOS la cartella privata
// dell'app (la Cache API nelle WebView iOS non è affidabile).
interface Store {
  has(path: string): Promise<boolean>
  get(path: string): Promise<Blob | undefined>
  put(path: string, res: Response): Promise<void>
  del(path: string): Promise<void>
  keys(): Promise<string[]>
  clear(): Promise<void>
}

const cacheKey = (path: string) => new Request(`https://offline.invalid/booking/${encodeURIComponent(path)}`)
const PREFIX = 'https://offline.invalid/booking/'

const webStore: Store = {
  async has(path) {
    return !!(await (await caches.open(CACHE)).match(cacheKey(path)))
  },
  async get(path) {
    const res = await (await caches.open(CACHE)).match(cacheKey(path))
    return res ? res.blob() : undefined
  },
  async put(path, res) {
    await (await caches.open(CACHE)).put(cacheKey(path), res)
  },
  async del(path) {
    await (await caches.open(CACHE)).delete(cacheKey(path))
  },
  async keys() {
    return (await (await caches.open(CACHE)).keys()).map((r) => decodeURIComponent(r.url.slice(PREFIX.length)))
  },
  async clear() {
    await caches.delete(CACHE)
  },
}

async function getStore(): Promise<Store | null> {
  if (__NATIVE__) {
    const { fileStore } = await import('./nativeFiles')
    return {
      has: fileStore.has,
      get: fileStore.get,
      put: async (path, res) => fileStore.put(path, await res.blob()),
      del: fileStore.del,
      keys: fileStore.keys,
      clear: fileStore.clear,
    }
  }
  return typeof caches !== 'undefined' ? webStore : null
}

export async function isFileCached(path: string): Promise<boolean> {
  try {
    return !!(await (await getStore())?.has(path))
  } catch {
    return false
  }
}

/** Scarica il file e lo tiene sul dispositivo. */
export async function cacheBookingFile(path: string): Promise<void> {
  const store = await getStore()
  if (!store) return
  const res = await fetch(await signedUrl(path))
  if (!res.ok) throw new Error('Download del file non riuscito.')
  await store.put(path, res)
}

export async function uncacheBookingFile(path: string): Promise<void> {
  try {
    await (await getStore())?.del(path)
  } catch {
    // ignorato
  }
}

/** Dopo ogni aggiornamento dei dati: scarica i file "offline" mancanti e libera quelli non più richiesti. */
export async function syncOfflineFiles(trips: Trip[]): Promise<void> {
  if (!navigator.onLine) return
  try {
    const store = await getStore()
    if (!store) return
    const wanted = new Set<string>()
    for (const t of trips) {
      for (const b of t.bookings) if (b.keepOffline && b.filePath) wanted.add(b.filePath)
      for (const d of t.documents ?? []) if (isDocOffline(d.id)) wanted.add(d.path) // solo i documenti che posso ancora vedere
      for (const c of t.ticketCodes ?? []) wanted.add(c.filePath) // i codici dei biglietti sono sempre sul telefono (#38)
    }
    for (const path of wanted) {
      if (!(await store.has(path))) await cacheBookingFile(path).catch(() => undefined)
    }
    for (const path of await store.keys()) if (!wanted.has(path)) await store.del(path)
  } catch {
    // la sincronizzazione dei file non deve mai disturbare l'app
  }
}

/** Dopo l'uscita dall'account i file non devono restare sul dispositivo. */
export function clearBookingCache(): void {
  void getStore().then((s) => s?.clear()).catch(() => undefined)
}

/** Immagine del file come indirizzo da mostrare: dalla copia locale se c'è (anche in modalità aereo), altrimenti da un link temporaneo. */
export async function imageUrl(path: string): Promise<string> {
  const cached = await (await getStore())?.get(path)
  if (cached) return URL.createObjectURL(cached)
  if (!navigator.onLine) throw new Error('Sei offline e questo codice non è salvato sul telefono.')
  const url = await signedUrl(path)
  // si tiene anche una copia, così la prossima volta si apre senza rete
  void cacheBookingFile(path).catch(() => undefined)
  return url
}

/** Apre il file: dalla copia locale se c'è, altrimenti con un link temporaneo.
 *  Nel browser si usa una nuova scheda; nell'app il file va al lettore PDF / Foto del telefono. */
export async function openBookingFile(path: string): Promise<void> {
  if (__NATIVE__) {
    const store = await getStore()
    let blob = await store?.get(path)
    if (!blob) {
      if (!navigator.onLine) throw new Error('Sei offline e questo file non è salvato sul telefono. Attiva "Disponibile offline" quando sei in rete.')
      const res = await fetch(await signedUrl(path))
      if (!res.ok) throw new Error('Download del file non riuscito.')
      blob = await res.blob()
    }
    const { openFile } = await import('./nativeFiles')
    await openFile(blob, path.slice(path.lastIndexOf('/') + 1))
    return
  }
  // la finestra va aperta subito, nel gesto dell'utente: dopo un'attesa il browser la bloccherebbe
  const win = window.open('', '_blank')
  try {
    let url: string
    const cached = await (await getStore())?.get(path)
    if (cached) url = URL.createObjectURL(cached)
    else {
      if (!navigator.onLine) throw new Error('Sei offline e questo file non è salvato sul telefono. Attiva "Disponibile offline" quando sei in rete.')
      url = await signedUrl(path)
    }
    if (win) win.location.href = url
    else window.location.assign(url)
  } catch (e) {
    win?.close()
    throw e
  }
}
