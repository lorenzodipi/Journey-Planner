// Carta d'imbarco in PDF: la prima pagina diventa un'immagine PNG, così si salva come gli altri codici
// e si mostra anche senza rete. pdf.js si carica solo quando serve.

/** Lato lungo dell'immagine: abbastanza per leggere il QR a schermo intero, senza file enormi. */
const LATO = 1800

export async function primaPaginaPng(file: File): Promise<File> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: Math.min(4, LATO / Math.max(base.width, base.height)) })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('png')
    return new File([blob], `${file.name.replace(/\.pdf$/i, '') || 'carta-imbarco'}.png`, { type: 'image/png' })
  } finally {
    void doc.destroy()
  }
}
