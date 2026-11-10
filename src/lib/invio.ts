// Il tasto Invio (o «Fine» della tastiera del telefono) in un campo di un modulo non invia il modulo: chiude solo la tastiera.
// I moduli si salvano con il loro pulsante. Fa eccezione un modulo con `data-invio` (l'accesso), dove Invio è comodo.

const NON_TESTO = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color'])

/** Vero se Invio in questo elemento deve solo chiudere la tastiera invece di inviare il modulo. */
export function bloccaInvio(el: EventTarget | null): el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement)) return false
  if (NON_TESTO.has(el.type)) return false
  const form = el.form
  return !!form && !form.hasAttribute('data-invio')
}

export function setupInvioSenzaInvio(doc: Document = document): () => void {
  const premi = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.isComposing || e.defaultPrevented) return
    if (!bloccaInvio(e.target)) return
    e.preventDefault()
    // sul telefono si chiude la tastiera; con mouse e tastiera il focus resta dov'è
    if (matchMedia('(pointer: coarse)').matches) e.target.blur()
  }
  // la tastiera del telefono mostra «Fine» invece di «Vai»/«Invia», così il tasto dice quello che fa
  const entra = (e: FocusEvent) => {
    if (bloccaInvio(e.target) && !e.target.hasAttribute('enterkeyhint')) e.target.setAttribute('enterkeyhint', 'done')
  }
  doc.addEventListener('keydown', premi, true)
  doc.addEventListener('focusin', entra, true)
  return () => {
    doc.removeEventListener('keydown', premi, true)
    doc.removeEventListener('focusin', entra, true)
  }
}
