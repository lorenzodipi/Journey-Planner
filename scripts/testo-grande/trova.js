// Problemi con il testo grande: scorrimento orizzontale, testo fuori dal suo riquadro (card, chip, pulsante) o tagliato, testi sovrapposti.
() => {
  const vw = innerWidth
  const out = []
  const nome = (el) => {
    let s = el.tagName.toLowerCase()
    if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
    const p = el.parentElement
    if (p && p.className && typeof p.className === 'string') s = p.className.trim().split(/\s+/)[0] + '>' + s
    return s
  }
  if (document.documentElement.scrollWidth > vw + 1) out.push({ t: 'scorrimento', d: document.documentElement.scrollWidth - vw })
  const visibile = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false
      if (e.getAttribute && e.getAttribute('aria-hidden') === 'true' && e !== el && e.tagName !== 'svg') {}
    }
    return true
  }
  const riquadro = (el) => {
    for (let e = el.parentElement ? el : null; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e)
      const clip = /(hidden|clip|auto|scroll)/.test(cs.overflowX)
      const sfondo = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent'
      const bordo = parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderRightWidth) > 0
      if (clip || ((sfondo || bordo) && parseFloat(cs.borderTopLeftRadius) > 0)) return { e, clip, scroll: /(auto|scroll)/.test(cs.overflowX) }
    }
    return null
  }
  const testi = []
  const walker = document.createTreeWalker(document.querySelector(window.__tzRoot || 'body') || document.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue
    const el = n.parentElement
    if (!el || el.closest('svg,script,style,[hidden],.fa-skip,.sr-only,.vh')) continue
    const r = document.createRange(); r.selectNodeContents(n)
    const rects = [...r.getClientRects()].filter((x) => x.width > 1 && x.height > 1)
    if (!rects.length) continue
    const cs = getComputedStyle(el)
    if (cs.position === 'absolute' && (cs.clip !== 'auto' || parseFloat(cs.width) <= 1)) continue
    if (!visibile(el)) continue
    const box = { l: Math.min(...rects.map((x) => x.left)), r: Math.max(...rects.map((x) => x.right)), t: Math.min(...rects.map((x) => x.top)), b: Math.max(...rects.map((x) => x.bottom)) }
    const ell = cs.textOverflow === 'ellipsis' || (el.closest('[style*="ellipsis"]'))
    testi.push({ el, box, rects, txt: n.textContent.trim().slice(0, 30) })
    const inScroll = (() => { for (let e = el; e && e !== document.body; e = e.parentElement) if (/(auto|scroll)/.test(getComputedStyle(e).overflowX)) return true; return false })()
    if (!inScroll && (box.r > vw + 1 || box.l < -1)) { out.push({ t: 'fuori schermo', el: nome(el), txt: n.textContent.trim().slice(0, 30), d: Math.round(Math.max(box.r - vw, -box.l)) }); continue }
    const q = riquadro(el)
    if (q && !q.scroll && !ell) {
      const qr = q.e.getBoundingClientRect()
      const qs = getComputedStyle(q.e)
      const pl = q.clip ? 0 : parseFloat(qs.borderLeftWidth), pr = q.clip ? 0 : parseFloat(qs.borderRightWidth)
      const d = Math.max(box.r - (qr.right - pr), qr.left + pl - box.l)
      const dv = q.clip ? Math.max(box.b - qr.bottom, qr.top - box.t) : 0
      if (d > 1.5) out.push({ t: q.clip ? 'tagliato' : 'esce dal riquadro', el: nome(el), in: nome(q.e), txt: n.textContent.trim().slice(0, 30), d: Math.round(d) })
      else if (dv > 2 && cs.webkitLineClamp === 'none') out.push({ t: 'tagliato in altezza', el: nome(el), in: nome(q.e), txt: n.textContent.trim().slice(0, 30), d: Math.round(dv) })
    }
  }
  // sovrapposizioni tra testi diversi
  for (let i = 0; i < testi.length; i++) for (let j = i + 1; j < testi.length; j++) {
    const a = testi[i], b = testi[j]
    if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue
    for (const x of a.rects) for (const y of b.rects) {
      const w = Math.min(x.right, y.right) - Math.max(x.left, y.left)
      const h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top)
      if (w > 2 && h > Math.min(x.height, y.height) * 0.35) {
        // il testo sotto un elemento fisso (barra, foglio) non conta
        const fa = getComputedStyle(a.el).position, fb = getComputedStyle(b.el).position
        const fisso = (el) => { for (let e = el; e; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true } return false }
        if (fisso(a.el) !== fisso(b.el)) continue
        out.push({ t: 'sovrapposti', el: nome(a.el) + ' / ' + nome(b.el), txt: a.txt + ' / ' + b.txt, d: Math.round(w) })
      }
    }
  }
  const visti = new Set()
  return out.filter((o) => { const k = o.t + o.el + o.txt; if (visti.has(k)) return false; visti.add(k); return true })
}
