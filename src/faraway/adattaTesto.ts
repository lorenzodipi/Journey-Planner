// Testo grande che non ci sta (telefoni stretti, testo di sistema ingrandito: Android lo applica anche alle misure in px,
// quindi un tetto in CSS non basta e si misura). Con il testo normale, se tutto ci sta, non cambia niente.
//  - `data-adatta`: l'elemento (una riga flex, un titolo `nowrap` a blocco) si rimpicciolisce quanto basta con `zoom`.
//    `data-adatta="celle"`: si misura anche ogni figlio (colonne Check-in · Check-out · Camera) e la riga intera si riduce
//    quanto serve alla cella più stretta. `data-adatta-min`: sotto questa misura non scende (resta il taglio con i puntini).
//  - pulsanti `.fa-btn` e `.btn` (testo su una riga): se il testo è più largo del pulsante, va a capo dentro il pulsante.
// Un solo controllo per tutta l'app, avviato in main.tsx.

const SEL = '[data-adatta], .fa-btn, .btn'

/** Rimpicciolisce `el` finché il contenuto non sta nella sua larghezza (`zoom` riduce testo, icone e spazi insieme). */
export function adatta(el: HTMLElement) {
  if (!el.hasAttribute('data-adatta')) return aCapo(el)
  el.style.zoom = ''
  const celle = el.dataset.adatta === 'celle'
  const min = Number(el.dataset.adattaMin) || 0.5
  let z = 1
  for (let i = 0; i < 5; i++) {
    let r = el.clientWidth > 0 && el.scrollWidth > el.clientWidth ? el.clientWidth / el.scrollWidth : 1
    if (celle) for (const c of el.children) if (c.clientWidth > 0 && c.scrollWidth > c.clientWidth) r = Math.min(r, c.clientWidth / c.scrollWidth)
    if (r >= 1) return
    const nuovo = Math.max(min, Math.floor(z * r * 100) / 100)
    if (nuovo === z) return
    z = nuovo
    el.style.zoom = String(z)
  }
}

/** Pulsante con il testo su una riga: se non ci sta, il testo va a capo (il pulsante cresce in altezza). */
function aCapo(el: HTMLElement) {
  el.style.whiteSpace = ''
  if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) el.style.whiteSpace = 'normal'
}

export function avviaAdattaTesto() {
  if (typeof document === 'undefined' || typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return
  const daFare = new Set<HTMLElement>()
  let tutti = false
  let atteso = 0
  const osservati = new WeakSet<Element>()
  const giro = () => {
    atteso = 0
    const lista = tutti ? [...document.querySelectorAll<HTMLElement>(SEL)] : [...daFare].filter((e) => e.isConnected)
    tutti = false
    daFare.clear()
    for (const el of lista) {
      adatta(el)
      if (!osservati.has(el)) {
        osservati.add(el)
        ro.observe(el)
      }
    }
  }
  const presto = () => {
    if (!atteso) atteso = requestAnimationFrame(giro)
  }
  const segna = (el: Element | null | undefined) => {
    if (el instanceof HTMLElement) daFare.add(el)
    presto()
  }
  // cambia la misura dell'elemento (finestra, piega, carattere più grande): si rimisura lui
  const ro = new ResizeObserver((voci) => {
    for (const v of voci) segna(v.target)
  })
  // elementi nuovi (pagine, card aperte) e testi cambiati dentro un elemento da adattare
  new MutationObserver((record) => {
    for (const r of record) {
      segna((r.target instanceof Element ? r.target : r.target.parentElement)?.closest(SEL))
      for (const n of r.addedNodes) {
        if (!(n instanceof Element)) continue
        if (n.matches(SEL)) segna(n)
        for (const e of n.querySelectorAll(SEL)) segna(e)
      }
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true })
  const ovunque = () => {
    tutti = true
    presto()
  }
  window.addEventListener('resize', ovunque)
  void document.fonts?.ready.then(ovunque)
  ovunque()
}
