// «Condividi» immagine: copia un elemento con i suoi stili in un SVG e lo disegna su un canvas.
/** Immagine PNG di un elemento (per «Condividi»): copia il DOM con gli stili in un SVG e lo disegna su un canvas. */
export async function nodeToPng(node: HTMLElement): Promise<Blob | null> {
  const rect = node.getBoundingClientRect()
  const clone = node.cloneNode(true) as HTMLElement
  const inline = (src: Element, dst: Element) => {
    const cs = getComputedStyle(src)
    let css = ''
    for (let i = 0; i < cs.length; i++) css += `${cs[i]}:${cs.getPropertyValue(cs[i])};`
    dst.setAttribute('style', css)
    for (let i = 0; i < src.children.length; i++) inline(src.children[i], dst.children[i])
  }
  inline(node, clone)
  clone.querySelectorAll('button').forEach((b) => b.remove())
  const sprite = document.querySelector('svg defs')?.outerHTML ?? ''
  const w = Math.ceil(rect.width)
  const h = Math.ceil(rect.height)
  const xml = new XMLSerializer().serializeToString(clone)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><svg width="0" height="0">${sprite}</svg><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await img.decode()
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(scale, scale)
  ctx.drawImage(img, 0, 0)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

