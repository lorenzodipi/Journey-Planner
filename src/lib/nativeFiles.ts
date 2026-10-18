// File sul telefono per l'app Android/iOS (Capacitor). Si importa SOLO dentro `if (__NATIVE__)`,
// così nella versione web questi plugin non finiscono nel pacchetto.
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { FileOpener } from '@capacitor-community/file-opener'

const FOLDER = 'booking-files'

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  json: 'application/json',
}

export function mimeFromName(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  return MIME[ext] ?? 'application/octet-stream'
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(r.error ?? new Error('Lettura del file non riuscita'))
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.readAsDataURL(blob)
  })
}

function base64ToBlob(data: string, type: string): Blob {
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

// "<viaggio>/<id>-nome.pdf" -> un solo nome di file piatto
const toFile = (path: string) => `${FOLDER}/${path.replaceAll('/', '~')}`
const fromFile = (name: string) => name.replaceAll('~', '/')

/** Copie offline delle prenotazioni: cartella privata dell'app (non la galleria, non Download). */
export const fileStore = {
  async has(path: string): Promise<boolean> {
    try {
      await Filesystem.stat({ path: toFile(path), directory: Directory.Data })
      return true
    } catch {
      return false
    }
  },
  async get(path: string): Promise<Blob | undefined> {
    try {
      const r = await Filesystem.readFile({ path: toFile(path), directory: Directory.Data })
      return base64ToBlob(String(r.data), mimeFromName(path))
    } catch {
      return undefined
    }
  },
  async put(path: string, blob: Blob): Promise<void> {
    await Filesystem.writeFile({ path: toFile(path), data: await blobToBase64(blob), directory: Directory.Data, recursive: true })
  },
  async del(path: string): Promise<void> {
    await Filesystem.deleteFile({ path: toFile(path), directory: Directory.Data }).catch(() => undefined)
  },
  async keys(): Promise<string[]> {
    try {
      const r = await Filesystem.readdir({ path: FOLDER, directory: Directory.Data })
      return r.files.map((f) => fromFile(f.name))
    } catch {
      return []
    }
  },
  async clear(): Promise<void> {
    await Filesystem.rmdir({ path: FOLDER, directory: Directory.Data, recursive: true }).catch(() => undefined)
  },
}

async function writeTemp(fileName: string, data: string | Blob, isText: boolean): Promise<string> {
  const path = `tmp/${Date.now()}-${fileName}`
  const r = isText
    ? await Filesystem.writeFile({ path, data: data as string, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true })
    : await Filesystem.writeFile({ path, data: await blobToBase64(data as Blob), directory: Directory.Cache, recursive: true })
  return r.uri
}

/** Apre un PDF/immagine con l'app di sistema (lettore PDF, Foto, Anteprima…). */
export async function openFile(blob: Blob, fileName: string): Promise<void> {
  const uri = await writeTemp(fileName, blob, false)
  await FileOpener.open({ filePath: uri, contentType: blob.type || mimeFromName(fileName), openWithDefault: true })
}

/** Foglio di condivisione: da lì si salva in File/Drive o si invia il file. */
export async function shareTextFile(fileName: string, content: string): Promise<void> {
  const uri = await writeTemp(fileName, content, true)
  await Share.share({ title: fileName, url: uri, dialogTitle: 'Salva o invia il file' })
}

/** Pulizia dei file temporanei (aperture e condivisioni precedenti). */
export async function clearTemp(): Promise<void> {
  await Filesystem.rmdir({ path: 'tmp', directory: Directory.Cache, recursive: true }).catch(() => undefined)
}
