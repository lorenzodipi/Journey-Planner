// Immagine PNG del riepilogo (#63, SET-010). Nell'app nativa si condivide il testo (il foglio di condivisione accetta solo testo per ora).
import { riepilogoTesto, type Riepilogo } from './ricerca'

export async function esportaRiepilogo(r: Riepilogo): Promise<void> {
  const righe = riepilogoTesto(r)
  const nome = `riepilogo-${r.titolo.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'viaggio'}`
  if (__NATIVE__) return (await import('./nativeFiles')).shareTextFile(`${nome}.txt`, righe.join('\n'))
  const W = 900
  const H = 120 + righe.length * 40
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) throw new Error('Il browser non riesce a creare l’immagine.')
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#0b3a5b'
  righe.forEach((t, i) => {
    g.font = i === 0 ? '700 34px system-ui, sans-serif' : '400 22px system-ui, sans-serif'
    g.fillStyle = i === 0 ? '#0b3a5b' : '#1d2b36'
    g.fillText(t, 40, 70 + i * 40, W - 80)
  })
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png'))
  if (!blob) throw new Error('Non riesco a creare l’immagine.')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
