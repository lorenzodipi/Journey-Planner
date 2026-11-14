// Simula il textZoom della WebView Android: moltiplica dimensione del testo e interlinea fisse per window.__TZ.
(() => {
  const F = window.__TZ || 1
  if (F === 1) return
  const done = new WeakSet()
  const relativa = (v) => /(^|[^r])em\b|%/.test(v)
  const per = (v) => `calc(${v} * ${F})`
  function shorthand(v) {
    // «600 15px/20px var(--font-sans)»: la prima misura è la dimensione, dopo «/» l'interlinea
    return v.replace(/(\d*\.?\d+(?:px|rem))(\s*\/\s*(\d*\.?\d+(?:px|rem)))?/, (m, fs, _sl, lh) => `${per(fs)}${lh ? `/${per(lh)}` : ''}`)
  }
  function regola(s) {
    const font = s.getPropertyValue('font')
    if (font && /var\(/.test(font)) {
      s.setProperty('font', shorthand(font), s.getPropertyPriority('font'))
      return
    }
    const fs = s.getPropertyValue('font-size')
    if (fs && !relativa(fs) && !/^(inherit|initial|unset|revert|medium|small|large|x-|xx-|smaller|larger)/.test(fs)) s.setProperty('font-size', per(fs), s.getPropertyPriority('font-size'))
    const lh = s.getPropertyValue('line-height')
    if (lh && /px|rem/.test(lh) && !relativa(lh)) s.setProperty('line-height', per(lh), s.getPropertyPriority('line-height'))
  }
  function giro(rules) {
    for (const r of rules) {
      if (r instanceof CSSStyleRule) {
        if (!done.has(r)) { done.add(r); regola(r.style) }
        if (r.cssRules && r.cssRules.length) giro(r.cssRules)
      } else if (r.cssRules) giro(r.cssRules)
    }
  }
  function tutto() {
    for (const sh of document.styleSheets) { try { giro(sh.cssRules) } catch (e) {} }
    // gli stili in linea si moltiplicano una volta sola (poi li cambia l'app, es. `zoom`)
    for (const el of document.querySelectorAll('[style]')) {
      if (el.__tz) continue
      regola(el.style); el.__tz = true
    }
  }
  window.__tzTutto = tutto
  const mo = new MutationObserver(() => tutto())
  const via = () => { document.body.style.setProperty('font-size', `${16 * F}px`); document.body.__tz = true; tutto(); mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] }) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', via); else via()
})()
