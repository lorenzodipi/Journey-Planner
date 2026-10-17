import type { Trip } from '../types'
import { client } from './db'

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

export async function uploadBookingFile(tripId: string, file: File): Promise<string> {
  const path = `${tripId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
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

const cacheKey = (path: string) => new Request(`https://offline.invalid/booking/${encodeURIComponent(path)}`)
const hasCache = () => typeof caches !== 'undefined'

export async function isFileCached(path: string): Promise<boolean> {
  if (!hasCache()) return false
  try {
    return !!(await (await caches.open(CACHE)).match(cacheKey(path)))
  } catch {
    return false
  }
}

/** Scarica il file e lo tiene sul dispositivo. */
export async function cacheBookingFile(path: string): Promise<void> {
  if (!hasCache()) return
  const res = await fetch(await signedUrl(path))
  if (!res.ok) throw new Error('Download del file non riuscito.')
  await (await caches.open(CACHE)).put(cacheKey(path), res)
}

export async function uncacheBookingFile(path: string): Promise<void> {
  if (!hasCache()) return
  try {
    await (await caches.open(CACHE)).delete(cacheKey(path))
  } catch {
    // ignorato
  }
}

/** Dopo ogni aggiornamento dei dati: scarica i file "offline" mancanti e libera quelli non più richiesti. */
export async function syncOfflineFiles(trips: Trip[]): Promise<void> {
  if (!hasCache() || !navigator.onLine) return
  try {
    const wanted = new Set<string>()
    for (const t of trips) for (const b of t.bookings) if (b.keepOffline && b.filePath) wanted.add(b.filePath)
    const cache = await caches.open(CACHE)
    for (const path of wanted) {
      if (!(await cache.match(cacheKey(path)))) await cacheBookingFile(path).catch(() => undefined)
    }
    const keep = new Set(Array.from(wanted, (p) => cacheKey(p).url))
    for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req)
  } catch {
    // la sincronizzazione dei file non deve mai disturbare l'app
  }
}

/** Dopo l'uscita dall'account i file non devono restare sul dispositivo. */
export function clearBookingCache(): void {
  if (hasCache()) void caches.delete(CACHE).catch(() => undefined)
}

/** Apre il file in una nuova scheda: dalla copia locale se c'è, altrimenti con un link temporaneo. */
export async function openBookingFile(path: string): Promise<void> {
  // la finestra va aperta subito, nel gesto dell'utente: dopo un'attesa il browser la bloccherebbe
  const win = window.open('', '_blank')
  try {
    let url: string
    const cached = hasCache() ? await (await caches.open(CACHE)).match(cacheKey(path)) : undefined
    if (cached) url = URL.createObjectURL(await cached.blob())
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
