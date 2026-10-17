import type { Trip } from '../types'

// Esportazione dei viaggi in un file JSON: copia di sicurezza leggibile e portabile.
// Contiene tutto quello che vedi nell'app (anche codici di prenotazione): il file va tenuto al sicuro.
// I file allegati alle prenotazioni (PDF) non sono inclusi: restano nello Storage.

export const EXPORT_FORMAT = 'journey-planner-export'
export const EXPORT_VERSION = 1

export interface ExportFile {
  format: typeof EXPORT_FORMAT
  version: number
  exportedAt: string
  trips: Trip[]
}

export function buildExport(trips: Trip[], now: Date = new Date()): ExportFile {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), trips }
}

const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

export function exportFileName(trips: Trip[], now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10)
  const name = trips.length === 1 ? slug(trips[0].title) || 'viaggio' : 'tutti-i-viaggi'
  return `journey-planner-${name}-${day}.json`
}

export function serializeExport(file: ExportFile): string {
  return JSON.stringify(file, null, 2)
}

/** Fa scaricare il file dal browser. */
export function downloadJson(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
